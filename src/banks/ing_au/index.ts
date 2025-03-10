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

  // Walk lines to find account details
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

  // Walk lines to find transactions
  async getTransactions(lines: string[], account_number: string): Promise<StatementRecord[]> {
    /*
      Transaction Example
      [
        "31/01/2021",                           // Date
        "",                                     // Break
        "-24.95",                               // Amount
        "",                                     // Break
        "284.86",                               // Balance
        "Visa Purchase - Receipt 000000",       // Description (n)
        "SOMETHING SOMETHING",                  // Description (n)
        "Date 29/01/21 Card 0000",              // Description (n)
      ]

      Page end
      [
        "Page 2 of 5"
      ]
      [
        "Total xxx"
      ]
    */

    let inTransactions = false
    let records: StatementRecord[] = []
    
    // Debugging
    // for (let i = 0; i < lines.length; i += 1) {
    //   console.log(lines[i])
    // }

    for (let i = 0; i < lines.length; i += 1) {
      function cursor(offset: number): string {
        if ((i + offset) >= lines.length) {
          return ''
        }
        return lines[i + offset]
      }

      // Look for header of transaction table to tell us
      // if we should start parsing the transactions.
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
      if (!isDate(cursor(0))) {
        break
      }

      // Determine credit/debit amount
      let credit = ''
      let debit = ''
      if (cursor(2).startsWith('-')) {
        debit = cursor(2).replace('-', '')
      } else {
        credit = cursor(2)
      }

      // Parse the date and convert to ISO
      const [dd, mm, yyyy] = cursor(0).split('/').map(v => v.trim())
      const date_of_settlement = `${yyyy}-${mm}-${dd}`

      // look ahead for description
      // move the cursor forwards to extract date from lines
      // ahead of this one. Stop if we enter the next transaction
      // of if we are at the end of the page then advance the cursor
      // to the start of the next transaction.
      const descriptionSegs: string[] = []
      for (let j = 5; !isDate(cursor(j)) && !isPageEnd(cursor(j)); j++) {
        descriptionSegs.push(cursor(j))
      }
      i += descriptionSegs.length + 4;
      const description =  descriptionSegs.join(' ').trim()

      // Extract the date of purchase if in description
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
        debit,
        credit,
        balance: cursor(4),
      })
    }

    return records
  }
}

// "00/00/00" formated as "dd/mm/yyyy"
function isDate(line: string) {
  return (
    line.length > 8 &&
    line[2] === '/' &&
    (
      line[0] === '0' ||
      line[0] === '1' ||
      line[0] === '2' ||
      line[0] === '3' ||
      line[0] === '4' ||
      line[0] === '5' ||
      line[0] === '6' ||
      line[0] === '7' ||
      line[0] === '8' ||
      line[0] === '9'
    )
  )
}

function isPageEnd(line: string) {
  return (
    line.startsWith("Page ") || line.startsWith("Total ")
  )
}