import { MonthMap } from "./dates.mjs"
import { PAGE_BREAK } from "./extract-pdf-segments.mjs"

/**
 * @typedef {import('./extract-pdf-segments.mjs').Segments} Segments
 */

/**
 * @typedef {[number, number, 'CR'|'DR'|void]} Money
 */

/**
 * @typedef {Object} Statement
 * @property {string} openingDate
 * @property {string} closingDate
 * @property {Money} openingBalance
 * @property {Money} closingBalance
 * @property {Array<Record>} transactions
 */

const Symbols = {
    Date: 'Date',
    Transaction: 'Transaction',
    Debit: 'Debit',
    Credit: 'Credit',
    Balance: 'Balance',
    OpeningBalance: 'OPENING BALANCE',
    ClosingBalance: 'CLOSING BALANCE',
}

class Record {
    constructor() {
        /** @type {string} */
        this.date_of_settlement = ''
        /** @type {string} */
        this.date_of_authorization = ''
        /** @type {string[]} */
        this.description_raw = []
        /** @type {string} */
        this.description = ''
        /** @type {Money | null} */
        this.debit = null
        /** @type {Money | null} */
        this.credit = null
        /** @type {Money} */
        this.balance = [0, 0, 'CR']
    }
}

/**
 * @param {Segments} segments
 * @returns {Statement}
 */
 export function parseSegments(segments) {
    const transactionsRows = extractTransactionRows(segments)

    /** @type {Array<Record>} */
    const transactions = []

    const openingBalanceRow = transactionsRows.shift()
    const closingBalanceRow = transactionsRows.pop()

    if (!openingBalanceRow || !closingBalanceRow) {
        throw new Error('Unable to find start and end of statement')
    }

    const openingBalanceDate = openingBalanceRow[0].split(' ').slice(0,3)
    const closingBalanceDate = closingBalanceRow[0].split(' ').slice(0,3)
    const year = openingBalanceDate[2]

    for (const row of transactionsRows) {
        const record = new Record()


        const [ [day, month], description_raw ] = getDateFromDescription(row.slice(0, -5).join(' '))
        record.description_raw = description_raw

        record.date_of_settlement = makeDateString(day, month, year)
        if (
          description_raw[description_raw.length - 4] === 'Value' &&
          description_raw[description_raw.length - 3] === 'Date:'
        ) {
          const [d,m,y] = description_raw[description_raw.length - 2].split('/')
          record.date_of_authorization = makeDateString(d, m, y)
          record.description = description_raw.slice(0,-4).join(' ')
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

/**
 * 
 * @param {Segments} segments 
 * @returns {Array<Array<string>>}
 */
export function extractTransactionRows(segments) {
    /** @type {Array<Array<string>>} */
    const records = []
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

        if (seg.endsWith('CR') || seg.endsWith('DR')) {
            records.push(recordBuffer)
            recordBuffer = []
            continue
        }
    }
    
    return records
}

/**
 * 
 * @param {string} description 
 * @returns {[[string, string], string[]]}
 */
 function getDateFromDescription(description) {
    const [ day, month, ...rest ] = description.split(' ')
    return [[day, month], rest ]  
}

/**
 * 
 * @param {string} day 
 * @param {string} monthName 
 * @param {string} year 
 * @returns {string}
 */
function makeDateString(day, monthName, year) {
    return `${year}-${MonthMap[monthName]}-${day}T00:00:00.000+10:00`
}

/**
 * 
 * @param {string} moneyStringWithCrDb 
 * @returns {Money}
 */
function stringToMoney(moneyStringWithCrDb) {
    /** @type {'DR'|'CR'| undefined} */
    let mode = undefined
    const moneyStringWithCrDbClean = moneyStringWithCrDb.replaceAll('$', '').trim()
    if (moneyStringWithCrDbClean.endsWith('DR')) {
        mode = 'DR'
    }
    if (moneyStringWithCrDbClean.endsWith('CR')) {
        mode = 'CR'
    }
    const [ moneyString ] = moneyStringWithCrDbClean.split(' ')
    const [dollars_str, cents_str] = moneyString.replaceAll(',', '').split('.')

    if (mode) {
        return [parseInt(dollars_str, 10), parseInt(cents_str, 10), mode]
    } else {
        // @ts-expect-error
        return [parseInt(dollars_str, 10), parseInt(cents_str, 10)]
    }
}
