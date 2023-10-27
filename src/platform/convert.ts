import { extractPdfSegments } from "./extract-pdf-segments"
import { getBytesFromFile } from "./get-bytes-from-file"
import { Statement, parseSegments } from "./parse-segments"
import { Parser } from "@json2csv/plainjs";

export type ConvertOptions = {
  excludeAccountBalance: boolean
  includeTimeZoneInDates: boolean
  separateDates: boolean
  outputFormat: 'csv' | 'json'
}

type FormattedRecord = {
  date_of_settlement: string
  date_of_authorization?: string
  description_raw?: string[]
  description: string
  debit: string | null
  credit: string | null
  balance?: string
}

export async function convertStatements(files: File[], options: ConvertOptions): Promise<string> {
  const parsedFiles: Statement[] = []

  for (const [i, file] of files.entries()) {
    const bytes = await getBytesFromFile(file);
    const segments = await extractPdfSegments(bytes);
    const parsed = parseSegments(segments);
    parsedFiles.push(parsed);
  }

  const output: FormattedRecord[] = []

  for (const result of parsedFiles) {
    for (const record of result.transactions) {
      const raw: FormattedRecord = {
        date_of_authorization: record.date_of_authorization,
        date_of_settlement: record.date_of_settlement,
        description: record.description,
        description_raw: record.description_raw,
        debit: record.debit ? `${record.debit[0]}.${record.debit[1]}` : '',
        credit: record.credit ? `${record.credit[0]}.${record.credit[1]}` : '',
        balance: `${record.balance[2] === 'DR' ? '-' : ''}${record.balance[0]}.${record.balance[1]}`,
      }

      if (raw.date_of_authorization && options.includeTimeZoneInDates === false) {
        raw.date_of_authorization = raw.date_of_authorization.split('T')[0]
        raw.date_of_settlement = raw.date_of_settlement.split('T')[0]
      }

      if (options.excludeAccountBalance === true) {
        delete raw.balance
      }

      if (raw.description_raw && options.separateDates === false) {
        delete raw.date_of_authorization
        raw.description = raw.description_raw.join(' ')
      }

      delete raw.description_raw
      output.push(raw)
    }
  }

  console.log(output)

  if (options.outputFormat === 'csv') {
    const parser = new Parser({});
    return parser.parse(output)
  }

  if (options.outputFormat === 'json') {
    return JSON.stringify(output, null, 2)
  }

  throw new Error('No output type')
}
