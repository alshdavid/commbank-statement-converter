import moment from 'moment-timezone'
import * as moment_timezone from 'moment-timezone'
import { MonthMap } from "./dates.js"
import { PAGE_BREAK } from "../../platform/pdf/index.js"
import { TIME_ZONE } from "./constants.js"

export type Money = [number, 'CR' | 'DR' | null]

export type Statement = {
  openingDate: string
  closingDate: string
  openingBalance: Money
  closingBalance: Money
  transactions: Array<Record>
}
const Symbols = Object.freeze({
  StatementPeriod: ['Statement', 'Period'],
  AccountNumber: 'Account Number',
  Date: 'Date',
  Transaction: 'Transaction',
  Debit: 'Debit',
  Credit: 'Credit',
  Balance: 'Balance',
  OpeningBalance: 'OPENING BALANCE',
  ClosingBalance: 'CLOSING BALANCE',
})

export class Record {
  account_number: string
  date_of_settlement: string
  date_of_purchase: string
  description_raw: string[]
  description: string
  debit: Money | null
  credit: Money | null
  balance: Money

  constructor(record: Partial<Record> = {}) {
    this.account_number = ''
    this.date_of_settlement = record.date_of_settlement ?? ''
    this.date_of_purchase = record.date_of_purchase ?? ''
    this.description_raw = record.description_raw ?? []
    this.description = record.description ?? ''
    this.debit = record.debit ?? null
    this.credit = record.credit ?? null
    this.balance = record.balance ?? [0, 'CR']
  }
}

export function parseSegments(segments: string[]): Statement {
  const accountNumber = extractAccountNumber(segments)
  const transactionsRows = extractTransactionRows(segments)
  const transactions: Array<Record> = []

  const openingBalanceRow = transactionsRows.shift()
  const closingBalanceRow = transactionsRows.pop()

  if (!openingBalanceRow || !closingBalanceRow) {
    throw new Error('Unable to find start and end of statement')
  }

  const openingBalanceDate = parseOpeningRow(openingBalanceRow)[0].split(' ').slice(0, 3)
  const closingBalanceDate = closingBalanceRow[0].split(' ').slice(0, 3)
  let year = parseInt(openingBalanceDate[2], 10)

  // Keep track of the month number to track if the statement rolls over to the next year
  let month = getMonthNumber(openingBalanceDate[0], openingBalanceDate[1], openingBalanceDate[2])

  for (const row of transactionsRows) {
    const record = new Record()

    record.account_number = accountNumber

    const [[day, monthStr], description_raw] = getDateFromDescription(row.slice(0, -5).join(' '))
    record.description_raw = description_raw

    const currentMonth = getMonthNumber(day, monthStr, year)
    if (currentMonth < month) {
      year += 1
    }
    month = currentMonth

    const recordDate =  makeDateString(day, monthStr, year)

    if (
      description_raw[description_raw.length - 4] === 'Value' &&
      description_raw[description_raw.length - 3] === 'Date:'
    ) {
      // This is a CC payment so get the settlement date from the description
      record.date_of_settlement = recordDate
      const [d, m, y] = description_raw[description_raw.length - 2].split('/')
      record.date_of_purchase = makeDateString(d, m, y)
      record.description = description_raw.slice(0, -4).join(' ')
    } else {
      // No settlement date / Not a CC payment
      record.date_of_purchase = recordDate
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

  // Sort by purchase date
  transactions.sort((a, b) => moment(a.date_of_purchase).unix() - moment(b.date_of_purchase).unix())

  return {
    openingDate: makeDateString(openingBalanceDate[0], openingBalanceDate[1], openingBalanceDate[2]),
    closingDate: makeDateString(closingBalanceDate[0], closingBalanceDate[1], closingBalanceDate[2]),
    openingBalance: stringToMoney(openingBalanceRow.slice(2).join(' ')),
    closingBalance: stringToMoney(closingBalanceRow.slice(2).join(' ')),
    transactions,
  }
}

function extractAccountNumber(segments: string[]): string {
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i]
    if (segment === Symbols.AccountNumber) {
      return segments[i+2]
    }
  }
  throw new Error('Unable to find account number')
}

function extractTransactionRows(segments: string[]): Array<Array<string>> {
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
    // for a new account, the opening balance is 'Nil'
    // for a transaction withdraws all money in account,the balance is '$0.00' without CR or DR
    if (
      (seg.endsWith("CR") ||
        seg.endsWith("DR") ||
        seg.endsWith("Nil") ||
        seg.endsWith("$0.00")) &&
      recordBuffer.length >= 3
    ) {
      records.push(recordBuffer);
      recordBuffer = [];
      continue;
    }
  }
  return records
}

function getDateFromDescription(description: string): [[string, string], string[]] {
  const [day, month, ...rest] = description.split(' ')
  return [[day, month], rest]
}

function makeDateString(day: string, monthName: string, year: string | number): string {
  let yyyy_mm_dd = `${year}-${MonthMap[monthName]}-${day}`
  return moment_timezone.default(yyyy_mm_dd, 'YYYY-MM-DD', TIME_ZONE).toISOString(true)
}

function getMonthNumberIso(date: string): number {
  return parseInt(moment(date).format('MM'), 10)
}

function getMonthNumber(day: string, monthName: string, year: string | number): number {
  return getMonthNumberIso(makeDateString(day, monthName, year))
}

function stringToMoney(moneyStringWithCrDb: string): Money {
  if (moneyStringWithCrDb.endsWith("Nil")) return [0.0, null];
  let mode: 'DR'|'CR'| undefined = undefined
  const moneyStringWithCrDbClean = moneyStringWithCrDb.replaceAll('$', '').trim()
  if (moneyStringWithCrDbClean.endsWith('DR')) {
    mode = 'DR'
  }
  if (moneyStringWithCrDbClean.endsWith('CR')) {
    mode = 'CR'
  }
  const [moneyString] = moneyStringWithCrDbClean.split(' ')
  const dollars_str = moneyString.replaceAll(',', '')

  if (mode) {
    return [parseFloat(dollars_str), mode]
  } else {
    return [parseFloat(dollars_str), null]
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
