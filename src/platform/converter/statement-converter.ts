import { PDFFile } from "../pdf"
import { Result } from "../shared"

export interface IStatementConverter {
  convert(pdfFiles: PDFFile[]): Promise<Result<StatementRecord[], Error>> 
}

export type StatementRecord = {
  bank_name: string
  account_number: string
  date_of_purchase: string
  date_of_settlement: string
  description: string
  debit: string
  credit: string
  balance?: string
}
