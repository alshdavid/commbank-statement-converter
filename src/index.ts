import { windowRef } from './platform/window'
import { initPdfjs } from './platform/pdfjs'
import { extractPdfSegments } from "./platform/extract-pdf-segments";
import { parseSegments, Statement, Record } from "./platform/parse-segments";
import { getBytesFromFile } from "./platform/get-bytes-from-file";
import { Parser } from "@json2csv/plainjs";

const Elements = {
  InputFilePicker: windowRef.document.querySelector('#file-picker') as HTMLInputElement,
  UlSelectedFiles: windowRef.document.querySelector('.selected-files ul') as HTMLUListElement,
  ButtonProcess: windowRef.document.querySelector('#do-process') as HTMLButtonElement,
  ButtonReset: windowRef.document.querySelector('#reset') as HTMLButtonElement,
  InputOptionExcludeAccountBalance: windowRef.document.querySelector('#option-exclude-account-balance') as HTMLInputElement,
  InputOptionOutputFormat: windowRef.document.querySelector('#option-output-format') as HTMLInputElement,
  InputOptionSeparateDates: windowRef.document.querySelector('#option-separate-dates') as HTMLInputElement,
  InputOptionTimeZoneDates: windowRef.document.querySelector('#option-timezone-dates') as HTMLInputElement,
}

void async function main() {
  const files: File[] = []
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

    const parsedFiles: Statement[] = []

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

    const output: FormattedRecord[] = []

    for (const result of parsedFiles) {
      for (const record of result.transactions) {
        const raw: FormattedRecord = {
          date_of_authorization: record.date_of_authorization,
          date_of_settlement: record.date_of_settlement,
          description: record.description,
          description_raw: record.description_raw,
          debit: record.debit ? `${record.debit[0]}.${record.debit[1]}` : '',
          credit: record.credit ? `${record.credit[0]}.${record.credit[1]}` : '',
          balance: `${record.balance[2] === 'DR' ? '-' : ''}${record.balance[0]}.${record.balance[1]}`,
        }

        if (raw.date_of_authorization && includeTimeZoneInDates === false) {
          raw.date_of_authorization = raw.date_of_authorization.split('T')[0]
          raw.date_of_settlement = raw.date_of_settlement.split('T')[0]
        }

        if (excludeAccountBalance === true) {
          delete raw.balance
        }

        if (raw.description_raw && separateDates === false) {
          delete raw.date_of_authorization
          raw.description = raw.description_raw.join(' ')
        }

        delete raw.description_raw
        output.push(raw)
      }
    }

    if (outputFormat === 'CSV') {
      const parser = new Parser({});
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

  initPdfjs()
}()

function downloadFile(filename: string, text: string): void {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

type FormattedRecord = {
  date_of_settlement: string
  date_of_authorization?: string
  description_raw?: string[]
  description: string
  debit: string | null
  credit: string | null
  balance?: string
}
