import { getPdfJsLib } from '../platform/pdfjs'

export type Segments = Array<string>

export const PAGE_BREAK = '--__PAGE_BREAK__--'

export async function extractPdfSegments(bytes: ArrayBuffer): Promise<Segments> {
    const pdfDocument = await (await getPdfJsLib()).getDocument(bytes).promise
    
    const segments: Segments = []

    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i)

        for await (const chunk of streamAsyncIterator(page.streamTextContent())) {
            const items = chunk.items

            for (const item of items) {
                if (typeof item.str !== 'string') continue
                const str = item.str.trim()
                segments.push(str)
            }
        }
        
        page.cleanup()
        segments.push(PAGE_BREAK)
    }

    return segments
}

async function* streamAsyncIterator(stream: ReadableStream): AsyncIterable<{ items: Array<{ str?: string }>}> {
    // Get a lock on the stream
    const reader = stream.getReader();
  
    try {
      while (true) {
        // Read from the stream
        const {done, value} = await reader.read();
        // Exit if we're done
        if (done) return;
        // Else yield the chunk
        yield value;
      }
    }
    finally {
      reader.releaseLock();
    }
  }