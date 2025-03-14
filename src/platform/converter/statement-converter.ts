import { PDFFile } from "../pdf/index.js"
import { Result } from "../shared/index.js"

export interface IStatementConverter {
  convert(pdfFiles: PDFFile[]): Promise<Result<StatementRecord[], Error>> 
}

export type StatementRecord = {
  bank_swift_code: string
  currency: string
  account_number: string
  date_of_purchase: string
  date_of_settlement: string
  description: string
  debit: string
  credit: string
  balance: string
}
