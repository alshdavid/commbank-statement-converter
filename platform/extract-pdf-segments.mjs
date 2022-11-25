import { pdfjsLib } from './pdfjs.mjs'

/**
 * @typedef {Array<string>} Segments
 */

export const PAGE_BREAK = '--__PAGE_BREAK__--'

/**
 * 
 * @param {ArrayBuffer} bytes 
 * @returns {Promise<Segments>}
 */
export async function extractPdfSegments(bytes) {
    const pdfDocument = await pdfjsLib.getDocument({ data: bytes }).promise
    
    /** @type {Segments} */ 
    const segments = []

    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i)

        for await (const chunk of streamAsyncIterator(page.streamTextContent())) {
            /** @type {Array<{ str?: string }>} */ 
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

/**
 * 
 * @param {ReadableStream} stream 
 * @returns {AsyncIterable<*>}
 */
async function* streamAsyncIterator(stream) {
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