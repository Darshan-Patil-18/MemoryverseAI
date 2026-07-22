import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

async function extractFromPDF(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  let text = ''
  const maxPages = Math.min(pdf.numPages, 10)
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item) => item.str).join(' ') + '\n'
  }
  return text
}

async function extractFromText(file) {
  return file.text()
}

// Returns best-effort plain text from an uploaded file.
// Images (jpg/png) fall back to filename-only text — the AI still
// categorizes using filename + any manual notes the user adds.
export async function extractText(file) {
  if (!file) return ''
  if (file.type === 'application/pdf') {
    try {
      return await extractFromPDF(file)
    } catch (err) {
      console.warn('PDF text extraction failed, falling back to filename', err)
      return file.name
    }
  }
  if (file.type.startsWith('text/')) {
    return extractFromText(file)
  }
  // images, docx, etc. — no client-side OCR; rely on filename + notes
  return file.name
}
