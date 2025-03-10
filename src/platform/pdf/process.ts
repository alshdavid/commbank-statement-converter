import { getPdfJsLib } from './vendor.js'
import { streamAsyncIterator } from '../browser/index.js'

/**
 * @description A single PDF page broken down into string segments determined
 * by the structure of the PDF file.
 * 
 * A PDF's structure might change if the PDF is re-exported or re-printed and
 * will likely be different if image-to-text techniques are used
 */
export type PDFPageInSegments = Array<string>

export const PAGE_BREAK = '--__PAGE_BREAK__--'

export async function process(bytes: Uint8Array): Promise<PDFPageInSegments[]> {
  const pdfjs = await getPdfJsLib();
  const pdfDocument = await pdfjs.getDocument(bytes).promise

  const pages: PDFPageInSegments[] = []

  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const pageSegments: PDFPageInSegments = []
    const page = await pdfDocument.getPage(i)

    for await (const chunk of streamAsyncIterator(page.streamTextContent())) {
      const items = chunk.items

      for (const item of items) {
        if (typeof item.str !== 'string') continue
        const str = item.str.trim()
        pageSegments.push(str)
      }
    }

    page.cleanup()
    pages.push(pageSegments)
  }

  return pages
}
