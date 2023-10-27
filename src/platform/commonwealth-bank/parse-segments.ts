import { MonthMap } from "./dates"
import { PAGE_BREAK } from "../pdf"

export type Money = [number, number, 'CR' | 'DR' | null]

export type Statement = {
  openingDate: string
  closingDate: string
  openingBalance: Money
  closingBalance: Money
  transactions: Array<Record>
}
const Symbols = Object.freeze({
  Date: 'Date',
  Transaction: 'Transaction',
  Debit: 'Debit',
  Credit: 'Credit',
  Balance: 'Balance',
  OpeningBalance: 'OPENING BALANCE',
  ClosingBalance: 'CLOSING BALANCE',
})

export class Record {
  date_of_settlement: string
  date_of_authorization: string
  description_raw: string[]
  description: string
  debit: Money | null
  credit: Money | null
  balance: Money

  constructor(record: Partial<Record> = {}) {
    this.date_of_settlement = record.date_of_settlement ?? ''
    this.date_of_authorization = record.date_of_authorization ?? ''
    this.description_raw = record.description_raw ?? []
    this.description = record.description ?? ''
    this.debit = record.debit ?? null
    this.credit = record.credit ?? null
    this.balance = record.balance ?? [0, 0, 'CR']
  }
}

export function parseSegments(segments: string[]): Statement {
  const transactionsRows = extractTransactionRows(segments)
  const transactions: Array<Record> = []

  const openingBalanceRow = transactionsRows.shift()
  const closingBalanceRow = transactionsRows.pop()

  if (!openingBalanceRow || !closingBalanceRow) {
    throw new Error('Unable to find start and end of statement')
  }

  const openingBalanceDate = parseOpeningRow(openingBalanceRow)[0].split(' ').slice(0, 3)
  const closingBalanceDate = closingBalanceRow[0].split(' ').slice(0, 3)
  const year = openingBalanceDate[2]

  for (const row of transactionsRows) {
    const record = new Record()

    const [[day, month], description_raw] = getDateFromDescription(row.slice(0, -5).join(' '))
    record.description_raw = description_raw
    record.date_of_settlement = makeDateString(day, month, year)
    if (
      description_raw[description_raw.length - 4] === 'Value' &&
      description_raw[description_raw.length - 3] === 'Date:'
    ) {
      const [d, m, y] = description_raw[description_raw.length - 2].split('/')
      record.date_of_authorization = makeDateString(d, m, y)
      record.description = description_raw.slice(0, -4).join(' ')
    } else {
      record.date_of_authorization = record.date_of_settlement
      record.description = description_raw.join(' ')
    }

    // Debit row
    if (row[row.length - 3] === '$') {
      record.balance = stringToMoney(row[row.length - 1])
      record.debit = stringToMoney(row[row.length - 5])
      transactions.push(record)
      continue
    }

    // Credit row
    if (row[row.length - 4] === '$') {
      record.balance = stringToMoney(row[row.length - 1])
      record.credit = stringToMoney(row[row.length - 3])
      transactions.push(record)
      continue
    }

  }

  return {
    openingDate: makeDateString(openingBalanceDate[0], openingBalanceDate[1], openingBalanceDate[2]),
    closingDate: makeDateString(closingBalanceDate[0], closingBalanceDate[1], closingBalanceDate[2]),
    openingBalance: stringToMoney(openingBalanceRow.slice(2).join(' ')),
    closingBalance: stringToMoney(closingBalanceRow.slice(2).join(' ')),
    transactions,
  }
}

export function extractTransactionRows(segments: string[]): Array<Array<string>> {
  const records: Array<Array<string>> = []
  let recordBuffer = []
  let inTransactions = false

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i]
    if (
      seg === Symbols.Date &&
      segments[i + 2] === Symbols.Transaction &&
      segments[i + 4] === Symbols.Debit &&
      segments[i + 6] === Symbols.Credit &&
      segments[i + 8] === Symbols.Balance
    ) {
      inTransactions = true
      i += 9
      continue
    }

    if (!inTransactions) {
      continue
    }

    if (seg === PAGE_BREAK) {
      inTransactions = false
      continue
    }

    if (seg.includes(Symbols.ClosingBalance)) {
      recordBuffer.push(
        seg,
        segments[i + 1],
        segments[i + 2],
        segments[i + 3],
        segments[i + 4],
      )
      records.push(recordBuffer)
      break
    }

    recordBuffer.push(seg)

    // Minimum length 3 to avoid ending on descriptions that end in CR or DR
    if (seg.endsWith('CR') || seg.endsWith('DR') && recordBuffer.length > 3) {
      records.push(recordBuffer)
      recordBuffer = []
      continue
    }
  }
  return records
}

function getDateFromDescription(description: string): [[string, string], string[]] {
  const [day, month, ...rest] = description.split(' ')
  return [[day, month], rest]
}

function makeDateString(day: string, monthName: string, year: string): string {
  return `${year}-${MonthMap[monthName]}-${day}T00:00:00.000+10:00`
}

function stringToMoney(moneyStringWithCrDb: string): Money {
  let mode: 'DR'|'CR'| undefined = undefined
  const moneyStringWithCrDbClean = moneyStringWithCrDb.replaceAll('$', '').trim()
  if (moneyStringWithCrDbClean.endsWith('DR')) {
    mode = 'DR'
  }
  if (moneyStringWithCrDbClean.endsWith('CR')) {
    mode = 'CR'
  }
  const [moneyString] = moneyStringWithCrDbClean.split(' ')
  const [dollars_str, cents_str] = moneyString.replaceAll(',', '').split('.')

  if (mode) {
    return [parseInt(dollars_str, 10), parseInt(cents_str, 10), mode]
  } else {
    return [parseInt(dollars_str, 10), parseInt(cents_str, 10), null]
  }
}

/**
 * @description Parse opening rows that contain a non-standard number of segments
 * @throws {Error} For row lengths that don't match known options 
 */
function parseOpeningRow(row: string[]): string[] {
  if (row.length === 3) {
    // ['01 Aug 2016 OPENING BALANCE', '', '$1234.00 CR']
    return row
  }
  if (row.length === 5) {
    // ['01 Jul', '', '2016 OPENING BALANCE', '', '$1234.00 CR']
    return [`${row[0]} ${row[2]}`, '', row[4]]
  }
  if (row.length === 7) {
    // ['01 Jul', '', '2017 OPENING BALANCE', '', '$1234.00', '', 'CR']
    return [`${row[0]} ${row[2]}`, '', `${row[4]} ${row[6]}`]
  }
  throw new Error(`Unhandled formatting for opening balance date, array length: ${row.length}, array: ${row}`)
}