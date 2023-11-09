import { CommbankError } from "../../platform/commonwealth-bank"
import { PDFFile } from "../../platform/pdf"
import type { FormData } from "./index"

export function formatError(
    untypedError: unknown,
    form: FormData,
): string {
    let isNotError = false
    let error: Error | undefined
    let pdfFiles: PDFFile[] | undefined

    if (untypedError instanceof CommbankError) {
      error = untypedError
      pdfFiles = untypedError.pdfFiles
    } else if (untypedError instanceof Error) {
      error = untypedError
    } else {
      isNotError = true
      try {
        error = new Error(untypedError as any)
      } catch (error) {
          try {
            error = new Error(JSON.stringify(untypedError))
          } catch (_) {
            error = new Error('untypedError')
          }
      }
    }

    if (!error) {
        error = new Error('untypedError')
    }

    const msg = [
      `ERROR: Unable to convert PDF file`,
      '',
      `Please submit this to Github or send me an email to alshdavid@gmail.com`,
      '',
      `ERROR MESSAGE:`,
      `    ${error.message}`,
      '',
      `FILES:`,
      (form['bank-statement-files'] || []).map(file => `    ${file.name}  ${file.type}`),
      '',
      'OPTIONS',
    ]

    for (const [k, v] of Object.entries(form)) {
        if (k === 'bank-statement-files') continue
        msg.push(`    ${k}: ${v}`)
    }

    if (isNotError) {
      msg.push('')
      msg.push('UNTYPED ERROR')
    }

    msg.push('')
    msg.push(`ERROR STACK:`)
    msg.push(`    ${error.stack}`)

    if (pdfFiles) {
      const cast: any = {}
      let serialized = ''

      for (const pdfFile of pdfFiles) {
        cast[pdfFile.name] = pdfFile.pages
      }

      serialized = encodeURIComponent(btoa(JSON.stringify(cast)))
      const serializedChunks = [];

      for (var i = 0, charsLength = serialized.length; i < charsLength; i += 80) {
        serializedChunks.push(serialized.substring(i, i + 80));
      }
      msg.push('')
      msg.push('ERROR DUMP:')
      msg.push(...serializedChunks)
    }

    return msg.join('\n')
}
