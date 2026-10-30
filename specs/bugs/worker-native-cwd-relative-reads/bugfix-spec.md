# Bugfix spec: worker-native-cwd-relative-reads

## Context
- Found while running the attachment worker natively (no Docker) with conda-forge
  poppler/tesseract and locally compiled libheif 1.23.7/libde265 1.1.3.
- Real PDF (`comprobante-4.pdf`, 6.60 KiB, `262ee3eb`) reached extraction and failed
  with a generic exception: `FileNotFoundError: doc.txt` in `parsers/pdf.py:48`.
- The HEIC pipeline in the same session published correctly (job `9ed115f7`,
  `published`, 15.1 s), isolating the defect to the PDF text/OCR page readers.

## Root cause
- `run_tool` spawns subprocesses with `cwd=job["path"]` (the per-job scratch dir),
  so tools like `pdftotext`/`pdftoppm` write their outputs relative to scratch.
- `parsers/pdf.py` then reads those outputs with bare `open("doc.txt")` /
  `open("page.png")`, which resolve against the worker **process** CWD instead of
  the scratch dir.
- Inside the Docker image the fixed `WORKDIR` masked: every other parser and the
  parent-side reader in `tools.py` (`open(os.path.join(job["path"], ...))`) use
  path-joined handling.

## Fix
- Join the three parent-side reads (`doc.txt` at lines 48 and 61, `page.png` at
  line 83) with `job["path"]` using `os.path.join`, matching `run_tool` style.
- No protocol, entity, table, env or contract change. Bugfix workflow
  (lightweight artifacts) is sufficient per repository rules.

## Validation
- `docker run --rm kyrae-attachment-e2e:local` pure unit tests (21/21) still green.
- Requeue the failed `process` job `fd40daf8` and observe `published` +
  `processing_status=usable` for `262ee3eb` in the local database.
- Native smoke: replaying `dispatch` on a copy of the original no longer raises
  `FileNotFoundError` (reproduced the failure and the fix standalone first).
