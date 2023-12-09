import { IStatementConverter, StatementRecord } from "../../platform/converter"
import { PDFFile } from "../../platform/pdf"
import { Result } from "../../platform/shared"

export class CommBankAustraliaConverter implements IStatementConverter {
  async convert(pdfFiles: PDFFile[]): Promise<Result<StatementRecord[], Error>> {
      return { value: [] }
  }
}
