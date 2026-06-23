// `pdf` job processor — DOCX template → PDF (plan §3b). Fills the quotation DOCX
// with quote data (docxtemplater), converts via LibreOffice headless, uploads to
// R2, returns the public URL. Heavy + serial (concurrency 1 in the worker).
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../db/client.ts';
import { uploadToR2 } from '../../server/r2.js';

const execFileP = promisify(execFile);
const { quotes } = schema;

// The DOCX template ships in the repo (templates/quotation.docx) or is pointed at
// by PDF_TEMPLATE_PATH. See templates/README.md for the placeholder names.
const TEMPLATE_PATH =
  process.env.PDF_TEMPLATE_PATH || path.join(process.cwd(), 'templates', 'quotation.docx');

export async function processPdf(row) {
  const p = row.payload || {};
  if (p.quoteId === undefined || p.quoteId === null) {
    throw new Error('pdf payload missing "quoteId"');
  }

  const quoteRows = await db.select().from(quotes).where(eq(quotes.id, p.quoteId)).limit(1);
  const quote = quoteRows[0];
  if (!quote) throw new Error(`quote ${p.quoteId} not found`);

  let templateBuf;
  try {
    templateBuf = await fs.readFile(TEMPLATE_PATH);
  } catch {
    throw new Error(
      `DOCX template not found at ${TEMPLATE_PATH} — add templates/quotation.docx or set PDF_TEMPLATE_PATH (see templates/README.md).`,
    );
  }

  // Fill the template.
  const zip = new PizZip(templateBuf);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // The quotation template's tags contain spaces / dots / slashes / parens
    // (e.g. {ref no.}, {G.I/M.S.}, {(Hook configuration)}). Treat the WHOLE tag
    // as a literal data key so the default expression parser doesn't choke on
    // '.' or '/'. Data keys below match the tag strings exactly.
    parser: (tag) => ({ get: (scope) => (scope == null ? undefined : scope[tag]) }),
    // Render a blank (not the string "undefined") for any missing field.
    nullGetter: () => '',
  });
  doc.render(buildTemplateData(quote, p));
  const docxBuf = doc.getZip().generate({ type: 'nodebuffer' });

  // Convert to PDF in an isolated temp dir. `-env:UserInstallation` gives
  // LibreOffice a writable profile dir so it works under systemd ProtectHome=true
  // (no $HOME needed).
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pstm-pdf-'));
  try {
    const docxPath = path.join(workDir, 'quote.docx');
    await fs.writeFile(docxPath, docxBuf);

    await execFileP(
      'soffice',
      [
        '--headless',
        `-env:UserInstallation=file://${path.join(workDir, 'lo-profile')}`,
        '--convert-to',
        'pdf',
        '--outdir',
        workDir,
        docxPath,
      ],
      { timeout: 120000 },
    );

    const pdfBuf = await fs.readFile(path.join(workDir, 'quote.pdf'));
    const key = `quotations/${quote.id}/${Date.now()}.pdf`;
    return await uploadToR2(key, pdfBuf, 'application/pdf');
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

// Maps quote data onto the EXACT tag strings used in templates/quotation.docx.
// Keys are the literal tags (read by the literal-tag parser above), so they keep
// the spaces/dots/parens from the Word template. Anything in `p.extra` overrides.
function buildTemplateData(q, p) {
  const rate = p.rate ?? q.finalRate;
  const qty = q.qty;
  const total =
    p.total ?? (rate != null && qty != null ? Number(rate) * Number(qty) : null);

  return {
    'ref no.': p.refNo ?? q.id,
    'today’s date': p.date ?? new Date(q.createdAt || Date.now()).toLocaleDateString('en-IN'),
    'Company Name': q.companyName || '',
    'email no.': q.email || '',
    name: q.fullName || '',
    'mob no': q.mobile || '',
    // Material grade label (e.g. "G.I." / "M.S.").
    'G.I/M.S.': q.materialType || '',
    // Hook/fold configuration (e.g. "2-fold hook").
    '(Hook configuration)': q.plankType || '',
    height: numOrBlank(q.height),
    length: numOrBlank(q.length),
    width: numOrBlank(q.width),
    quan: qty ?? '',
    rate: money(rate),
    total: money(total),
    // Caller-supplied overrides/extras (validity, terms, custom ref, …).
    ...(p.extra || {}),
  };
}

function numOrBlank(v) {
  return v === null || v === undefined ? '' : v;
}

function money(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '';
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
