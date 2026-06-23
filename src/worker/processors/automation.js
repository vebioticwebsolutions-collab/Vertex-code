// `automation` job processor — BOQ (Bill of Quantities) spreadsheet (plan §4 A3).
// Builds an .xlsx for the quote and uploads to R2. This is a functional baseline;
// swap in the real BOQ template/derivation when it's provided (gap: template TBD).
import ExcelJS from 'exceljs';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../db/client.ts';
import { uploadToR2 } from '../../server/r2.js';

const { quotes } = schema;

export async function processAutomation(row) {
  const p = row.payload || {};
  if (p.quoteId === undefined || p.quoteId === null) {
    throw new Error('automation payload missing "quoteId"');
  }

  const quoteRows = await db.select().from(quotes).where(eq(quotes.id, p.quoteId)).limit(1);
  const quote = quoteRows[0];
  if (!quote) throw new Error(`quote ${p.quoteId} not found`);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'PSTM';
  wb.created = new Date();
  const ws = wb.addWorksheet('BOQ');

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = `BOQ — Quote #${quote.id}`;
  ws.getCell('A1').font = { bold: true, size: 14 };

  ws.getRow(3).values = ['Item', 'Specification', 'Qty', 'Unit Wt (kg)', 'Rate/kg', 'Amount'];
  ws.getRow(3).font = { bold: true };
  ws.columns = [
    { key: 'item', width: 28 },
    { key: 'spec', width: 36 },
    { key: 'qty', width: 10 },
    { key: 'wt', width: 14 },
    { key: 'rate', width: 12 },
    { key: 'amount', width: 16 },
  ];

  ws.addRow({
    item: `${quote.productType || ''} ${quote.plankType || ''}`.trim() || 'Item',
    spec: `${quote.length ?? ''}×${quote.width ?? ''}×${quote.height ?? ''} mm` +
      (quote.materialType ? ` (${quote.materialType})` : ''),
    qty: quote.qty ?? '',
    wt: quote.weightKg ?? '',
    rate: quote.ratePerKg ?? '',
    amount: quote.finalRate ?? '',
  });

  const buf = await wb.xlsx.writeBuffer();
  const key = `boq/${quote.id}/${Date.now()}.xlsx`;
  return await uploadToR2(
    key,
    Buffer.from(buf),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}
