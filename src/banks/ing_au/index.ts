import { IStatementConverter, StatementRecord } from "../../platform/converter/index.js"
import { PDFFile } from "../../platform/pdf/index.js"
import { Result } from "../../platform/shared/index.js"

const SWIFT_CODE = 'INGBAU2SXXX'
const CURRENCY = 'AUD'

export class INGAustraliaConverter implements IStatementConverter {
  async convert(pdfFiles: PDFFile[]): Promise<Result<StatementRecord[], Error>> {
    const results: StatementRecord[] = []

    for (const pdfFIle of pdfFiles) {
      const result = await this.convertOne(pdfFIle)
      if (result.error) return result
      results.push(...result.value)
    }
    
    return { value: results }
  }

  async convertOne(pdfFile: PDFFile): Promise<Result<StatementRecord[], Error>> {
    const results: StatementRecord[] = []

    const accountNumber = await this.getAccountDetails(pdfFile.pages[0])

    for (const page of pdfFile.pages) {
      results.push(...await this.getTransactions(page, accountNumber))
    }

    return { value: results }
  }

  async getAccountDetails(lines: string[]): Promise<string> {
    // Debugging
    // for (let i = 0; i < lines.length; i += 1) {
    //   console.log(lines[i])
    // }

    // First pass to get Account number
    for (let i = 0; i < lines.length; i += 1) {
      function cursor(p: number): string {
        if ((i + p) >= lines.length) {
          return ''
        }
        return lines[i + p]
      }
      if (cursor(0).startsWith('BSB number: ')) {
        const bsb = cursor(0).split(': ')[1].replaceAll(' ', '')
        const acc = cursor(1).split(': ')[1]
        return `${bsb} ${acc}`
      }
    }

    return ''
  }

  async getTransactions(lines: string[], account_number: string): Promise<StatementRecord[]> {
    let inTransactions = false
    let records: StatementRecord[] = []
    
    // Debugging
    // for (let i = 0; i < lines.length; i += 1) {
    //   console.log(lines[i])
    // }

    for (let i = 0; i < lines.length; i += 1) {
      function cursor(p: number): string {
        if ((i + p) >= lines.length) {
          return ''
        }
        return lines[i + p]
      }

      // Look for header of transaction table
      if (
        !inTransactions &&
        cursor(0) === "Date" &&
        cursor(2) === "Details" &&
        cursor(4) === "Money out $" &&
        cursor(6) === "Money in $" &&
        cursor(8) === "Balance $"
      ) {
        inTransactions = true
        i += 9
        continue
      }

      if (!inTransactions) {
        continue
      }

      // If the first line is not a date then we have finished the page
      if (
        !cursor(0)!.startsWith('0') &&
        !cursor(0)!.startsWith('1') &&
        !cursor(0)!.startsWith('2') &&
        !cursor(0)!.startsWith('3') &&
        !cursor(0)!.startsWith('4') &&
        !cursor(0)!.startsWith('5') &&
        !cursor(0)!.startsWith('6') &&
        !cursor(0)!.startsWith('7') &&
        !cursor(0)!.startsWith('8') &&
        !cursor(0)!.startsWith('9')
      ) {
        break
      }

      // Determine credit/debit amount
      let amount = cursor(2)
      const isDebit = amount.startsWith('-')
      if (isDebit) {
        amount = amount.replace('-', '')
      }

      // look ahead for description
      const descriptionSegs: string[] = []
      for (let j = 5; cursor(j) !== ''; j++) {
        descriptionSegs.push(cursor(j))
      }
      descriptionSegs.pop()
      const description =  descriptionSegs.join(' ')

      // Parse the date
      const [dd, mm, yyyy] = cursor(0).split('/').map(v => v.trim())
      const date_of_settlement = `${yyyy}-${mm}-${dd}`

      // Determine the date of purchase
      let date_of_purchase = date_of_settlement
      if (description.startsWith('Visa Purchase - ')) {
        const [dd, mm, yy] = description.substring(description.length - 19, description.length - 10).split('/').map(v => v.trim())
        date_of_purchase = `20${yy}-${mm}-${dd}`
      }

      // Add record
      records.push({
        bank_swift_code: SWIFT_CODE,
        currency: CURRENCY,
        account_number,
        date_of_purchase,
        date_of_settlement,
        description,
        debit: isDebit ? amount : '',
        credit: isDebit ? '' : amount,
        balance: cursor(4),
      })

      i += descriptionSegs.length + 4;
    }

    // console.log(records)
    return records
  }
}
