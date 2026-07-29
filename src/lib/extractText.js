import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// Postgres `text` columns cannot store a NUL byte (\u0000) — inserting one
// fails with error 22P05 "unsupported Unicode escape sequence". pdf.js's
// text layer occasionally emits \u0000 or other control characters when a
// PDF uses custom/embedded fonts (common on certificate templates), so we
// strip anything Postgres will reject right here at the source — before it
// reaches the LLM call or a Supabase insert. Keeps \n and \t.
function sanitizeExtractedText(text) {
    return (text || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

let tesseractPromise = null
async function getTesseract() {
    if (!tesseractPromise) {
        tesseractPromise = import('tesseract.js')
    }
    return tesseractPromise
}

// OCR fallback for images and scanned (image-only) PDF pages.
// Runs entirely in-browser via tesseract.js — free, no API key.
async function ocrImageSource(source) {
    try {
        const { createWorker } = await getTesseract()
        const worker = await createWorker('eng')
        const {
            data: { text }
        } = await worker.recognize(source)
        await worker.terminate()
        return sanitizeExtractedText((text || '').trim())
    } catch (err) {
        console.warn('OCR failed', err)
        return ''
    }
}

async function renderPdfPageToDataUrl(page) {
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
    return canvas.toDataURL('image/png')
}

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

    text = sanitizeExtractedText(text)

    // If the PDF has (almost) no extractable text, it's likely a scanned
    // document — fall back to OCR on the first couple of rendered pages.
    if (text.trim().length < 20) {
        try {
            const pdf2 = await pdfjsLib.getDocument({ data: buffer }).promise
            const ocrPages = Math.min(pdf2.numPages, 3)
            let ocrText = ''
            for (let i = 1; i <= ocrPages; i++) {
                const page = await pdf2.getPage(i)
                const dataUrl = await renderPdfPageToDataUrl(page)
                ocrText += (await ocrImageSource(dataUrl)) + '\n'
            }
            ocrText = sanitizeExtractedText(ocrText)
            if (ocrText.trim().length > text.trim().length) return ocrText
        } catch (err) {
            console.warn('PDF OCR fallback failed', err)
        }
    }

    return text
}

async function extractFromText(file) {
    return sanitizeExtractedText(await file.text())
}

// Returns best-effort plain text from an uploaded file, always with a
// filename fallback baked in so nothing ever surfaces as fully empty.
export async function extractText(file) {
    if (!file) return ''

    if (file.type === 'application/pdf') {
        try {
            const text = await extractFromPDF(file)
            return text.trim() ? text : file.name
        } catch (err) {
            console.warn('PDF text extraction failed, falling back to filename', err)
            return file.name
        }
    }

    if (file.type.startsWith('text/')) {
        return extractFromText(file)
    }

    if (file.type.startsWith('image/')) {
        const ocrText = await ocrImageSource(file)
        return ocrText || file.name
    }

    // docx, etc. — no in-browser parser; rely on filename + notes
    return file.name
}