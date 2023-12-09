import { IStatementConverter, StatementRecord } from "../../platform/converter"
import { PDFFile } from "../../platform/pdf"
import { Result } from "../../platform/shared"

export class KiwiBankNewZealandConverter implements IStatementConverter {
  async convert(pdfFiles: PDFFile[]): Promise<Result<StatementRecord[], Error>> {
      return { value: [] }
  }
}
