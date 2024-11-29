import { IStatementConverter, StatementRecord } from "../../platform/converter/index.js"
import { PDFFile } from "../../platform/pdf/index.js"
import { Result } from "../../platform/shared/index.js"
import { CURRENCY, SWIFT_CODE } from "./constants.js";
import { Statement, parseSegments } from "./parse-segments.js";

export class CommBankAustraliaConverter implements IStatementConverter {
  async convert(pdfFiles: PDFFile[]): Promise<Result<StatementRecord[], Error>> {

    const statements: Statement[] = []

    for (const [_, file] of pdfFiles.entries()) {
      try {
        const parsed = parseSegments(file.flattenPages());
        statements.push(parsed);
      } catch (uError: any) {
        const error = uError instanceof Error ? uError : new Error(uError);
        return { error }
      }
    }

    const output: StatementRecord[] = []

    for (const result of statements) {
      for (const transaction of result.transactions) {
        const record: StatementRecord = {
          bank_swift_code: SWIFT_CODE,
          currency: CURRENCY,
          account_number: transaction.account_number,
          date_of_purchase: transaction.date_of_purchase,
          date_of_settlement: transaction.date_of_settlement,
          description: transaction.description,
          debit: transaction.debit ? `${transaction.debit[0]}` : '',
          credit: transaction.credit ? `${transaction.credit[0]}` : '',
          balance: `${transaction.balance[1] === 'DR' ? '-' : ''}${transaction.balance[0]}`,
        }
        output.push(record)
      }
    }

    return { value: output }
  }
}
