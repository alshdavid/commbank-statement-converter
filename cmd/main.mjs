import { windowRef } from '../platform/window.mjs'
import { extractPdfSegments } from "../platform/extract-pdf-segments.mjs";
import { parseSegments } from "../platform/parse-segments.mjs";
import { getBytesFromFile } from "../platform/get-bytes-from-file.mjs";
import { json2csv } from "../platform/json2csv.mjs";
/** @typedef {import('../platform/parse-segments.mjs').Statement} Statement */

const Elements = {
  InputFilePicker: /** @type {HTMLInputElement} */ (windowRef.document.querySelector('#file-picker')),
  UlSelectedFiles: /** @type {HTMLUListElement} */ (windowRef.document.querySelector('.selected-files ul')),
  ButtonProcess: /** @type {HTMLButtonElement} */ (windowRef.document.querySelector('#do-process')),
  ButtonReset: /** @type {HTMLButtonElement} */ (windowRef.document.querySelector('#reset')),
  InputOptionExcludeAccountBalance: /** @type {HTMLInputElement} */ (windowRef.document.querySelector('#option-exclude-account-balance')),
  InputOptionOutputFormat: /** @type {HTMLInputElement} */ (windowRef.document.querySelector('#option-output-format')),
  InputOptionSeparateDates: /** @type {HTMLInputElement} */ (windowRef.document.querySelector('#option-separate-dates')),
  InputOptionTimeZoneDates: /** @type {HTMLInputElement} */ (windowRef.document.querySelector('#option-timezone-dates')),
}

void async function main() {
    /** @type {File[]} */
    const files = []
    let renderedOutputFileName = ''
    let renderedOutput = ''

    Elements.InputFilePicker.addEventListener('change', async event => {
      for (const file of Array.from(Elements.InputFilePicker.files || [])) {
        files.push(file)
      }
      // @ts-expect-error
      Elements.InputFilePicker.value = null
      Elements.UlSelectedFiles.innerHTML = ''
      for (const file of files) {
        Elements.UlSelectedFiles.innerHTML += `<li><p>${file.name}</p></li>`
      }
    })

    Elements.ButtonReset.addEventListener('click', async () => {
      windowRef.location.reload()
    })

    Elements.ButtonProcess.addEventListener('click', async () => {
      if (renderedOutputFileName && renderedOutput) {
        downloadFile(renderedOutputFileName, renderedOutput)
        return
      }
      if (files.length === 0) {
        alert('No files selected')
        return
      }
      Elements.ButtonProcess.disabled = true
      Elements.ButtonProcess.innerHTML = `Processing... 1/${files.length}`

      /** @type {Statement[]} */
      const parsedFiles = []

      for (const [i, file] of files.entries()) {
        Elements.ButtonProcess.innerHTML = `Processing... ${i + 1}/${files.length}`
        const bytes = await getBytesFromFile(file);
        const segments = await extractPdfSegments(bytes);
        const parsed = parseSegments(segments);
        parsedFiles.push(parsed);
      }

      const excludeAccountBalance = Elements.InputOptionExcludeAccountBalance.checked
      const includeTimeZoneInDates = Elements.InputOptionTimeZoneDates.checked
      const separateDates = Elements.InputOptionSeparateDates.checked
      const outputFormat = Elements.InputOptionOutputFormat.value

      /** @type {any[]} */
      const output = []

      for (const result of parsedFiles) {
        for (const record of result.transactions) {
          /** @type {Record<string, any>} */
          const raw = {
            date_of_authorization: record.date_of_authorization,
            date_of_settlement: record.date_of_settlement,
            description: record.description,
            description_raw: record.description_raw,
            debit: record.debit ? `${record.debit[0]}.${record.debit[1]}` : '',
            credit: record.credit ? `${record.credit[0]}.${record.credit[1]}` : '',
            balance: `${record.balance[2] === 'DR' ? '-' : ''}${record.balance[0]}.${record.balance[1]}`,
          }

          if (includeTimeZoneInDates === false) {
            raw.date_of_authorization = raw.date_of_authorization.split('T')[0]
            raw.date_of_settlement = raw.date_of_settlement.split('T')[0]
          }

          if (excludeAccountBalance === true) {
            delete raw.balance
          }

          if (separateDates === false) {
            delete raw.date_of_authorization
            raw.description = raw.description_raw.join(' ')
          }

          delete raw.description_raw
          output.push(raw)
        }
      }

      if (outputFormat === 'CSV') {
        const parser = new json2csv.Parser({});
        const csv = parser.parse(output)
        renderedOutputFileName = 'transactions.csv'
        renderedOutput = csv
      } 
      if (outputFormat === 'JSON') {
        renderedOutputFileName = 'transactions.json'
        renderedOutput = JSON.stringify(output, null, 2)
      }

      Elements.ButtonProcess.disabled = false
      Elements.ButtonProcess.innerHTML = 'Download'
    })
}()

/**
 * 
 * @param {string} filename 
 * @param {string} text 
 */
function downloadFile(filename, text) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
