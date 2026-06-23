# DOCX templates (worker PDF pipeline)

The `pdf` worker job fills a Word `.docx` template with quote data
(`docxtemplater`) and converts it to PDF via LibreOffice headless (plan §3b).

## `quotation.docx`

This is the live Prime Steeltech quotation template. Its tags use single braces
`{ }` but contain spaces, dots, slashes and parens, so the worker uses a
**literal-tag parser** (`src/worker/processors/pdf.js`) — each tag string maps
directly to a data key (no expression parsing). Tags currently in the template
and where they come from:

| Tag in template          | Source (`quotes` column / derived)              |
|--------------------------|-------------------------------------------------|
| `{ref no.}`              | id (or `payload.refNo`)                          |
| `{today’s date}`         | created_at, en-IN (or `payload.date`)            |
| `{Company Name}`         | company_name                                     |
| `{email no.}`            | email                                            |
| `{name}`                 | full_name                                        |
| `{mob no}`               | mobile                                           |
| `{G.I/M.S.}`             | material_type (grade label)                      |
| `{(Hook configuration)}` | plank_type                                        |
| `{height}` `{length}` `{width}` | height / length / width                   |
| `{quan}`                 | qty                                              |
| `{rate}`                 | final_rate (or `payload.rate`), en-IN money      |
| `{total}`                | rate × qty (or `payload.total`), en-IN money     |

Missing values render blank (not the string "undefined").

### Overrides
Pass `extra: { … }` (or `refNo`/`date`/`rate`/`total`) in the job payload to
override any field without a schema change — keys in `extra` must match the exact
tag string, e.g. `{ "extra": { "G.I/M.S.": "G.I." } }`.

### Changing the template
- Re-author in Word/LibreOffice; keep `{ }` tags.
- If you add a tag, add its key in `buildTemplateData` (pdf.js).
- Tag text must survive Word's run-splitting — if a tag stops resolving, retype
  it in one go so Word doesn't fragment it across runs.
- Point `PDF_TEMPLATE_PATH` elsewhere to use a different file.
