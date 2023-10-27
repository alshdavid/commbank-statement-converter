import { fromFiles } from "../pdf"

export type ConvertOptions = {
  excludeAccountBalance: boolean
  includeTimeZoneInDates: boolean
  separateDates: boolean
  outputFormat: 'csv' | 'json'
}

export async function convert(files: File[], options: ConvertOptions): Promise<string> {
  const segments = await fromFiles(files)

  console.log(segments)

  const flat = segments
  return ''
}
