import './index.scss'
import { Fragment, h } from "preact";
import { Form } from "../../components/form";
import { Checkbox } from "../../components/form-checkbox";
import { Button } from "../../components/form-button";
import { Select, Option } from "../../components/form-select";
import { FilePicker } from "../../components/form-file-picker";
import * as Commbank from '../../platform/commonwealth-bank';
import { downloadFile } from '../../platform/browser';
import { useState } from 'preact/hooks';
import { formatError } from './format-error';

export type FormData = {
  'bank-statement-files': File[]
  'separate-dates': boolean
  'include-timezone': boolean
  'exclude-account-balance': boolean
  'output-format': 'csv' | 'json'
}

export function PageHome() {
  const [isConverting, setIsConverting] = useState(false)
  const [result, setResult] = useState<string | undefined>(undefined)
  const [hasError, setHasError] = useState<boolean>(false)

  async function onSubmit(form: FormData) {
    if (form['bank-statement-files'].length === 0) {
      console.log("No files selected")
      return
    }
    setIsConverting(true)
    reset()

    try {
      const converted = await Commbank.convert(form['bank-statement-files'], {
        excludeAccountBalance: form['exclude-account-balance'],
        includeTimeZoneInDates: form['include-timezone'],
        separateDates: form['separate-dates'],
        outputFormat: form['output-format'],
      })

      setIsConverting(false)
      setResult(converted)
    } catch (untypedError: any) {
      setHasError(true)
      setResult(formatError(untypedError, form))
      setIsConverting(false)
    }
  }

  function generateErrorReportLink(to: 'github' | 'email'): string {
    if (!result) return ''
    const msgTitle = encodeURIComponent(`Commbank Converter Bug`)
    const msgBody = encodeURIComponent('PASTE ERROR OUTPUT HERE')
    if (to === 'email') {
      return `mailto:alshdavid@gmail.com?subject=${msgTitle}&body=${msgBody}`
    }
    if (to === 'github') {
      return `https://github.com/alshdavid/commbank-statement-converter/issues/new?title=${msgTitle}&body=${msgBody}`
    }
    return ''
  }

  function download(outputFormat: 'csv' | 'json') {
    if (!result) return
    downloadFile(`statements.${outputFormat}`, result)
  }

  function reset() {
    setHasError(false)
    setResult(undefined)
  }
  
  return (
    <main class="page-home content-max-width">
      <h1>Commbank Statement Converter (PDF to CSV)</h1>
      <p>
        This site takes PDF bank statements from the Commonwealth Bank of Australia and converts them to CSV or JSON format
      </p>
      <p>
        In addition, it offers post processing features like extracting out 
        the purchase date on credit/debit card purchases and blending multiple 
        statements together
      </p>
      <p>
        If you have questions, encounter bugs or want to request 
        features, you can raise them using the <a target="_blank" href="https://github.com/alshdavid/commbank-statement-converter/issues">bug reporter</a>
      </p>
      <a className="notice" target="_blank" href="https://github.com/alshdavid/commbank-statement-converter/issues">
        <p>
          This project is completely open source and welcomes contributions. You can find the source code <u>here</u>
        </p>
      </a>
      <Form onSubmit={onSubmit} disabled={isConverting}>{(form) => <Fragment>
        <FilePicker
          multiple={true}
          accept="*.pdf"
          name="bank-statement-files" 
          disabled={isConverting} />

        <h3>Options</h3>

        <Checkbox 
          name="separate-dates" 
          label="Separate authorization and settlement dates"
          disabled={isConverting} />

        <Checkbox 
          name="include-timezone"
          label="Include time zone in dates"
          disabled={isConverting} />

        <Checkbox 
          name="exclude-account-balance" 
          label="Exclude account balance column"
          disabled={isConverting} />

        <Select 
          name="output-format"
          label="Output Format"
          disabled={isConverting}>
          <Option value="csv">CSV</Option>
          <Option value="json">JSON</Option>
        </Select>

        <div className="submit">
          <Button 
            color="blue" 
            disabled={isConverting || form.get('bank-statement-files')?.length === 0} 
            type="submit"
            >Convert</Button>

          <Button 
            color="red" 
            disabled={isConverting || !form.hasUpdated()} 
            type="reset"
            onClick={reset}
            >Reset</Button>

          {result && !hasError && 
            <Button 
              color="green" 
              onClick={() => download(form.get('output-format'))}
              >Download</Button>}
          
          {result && hasError && 
            <a 
              className="form-button yellow"
              target="blank"
              href={generateErrorReportLink('github')}
              >Report Error via GitHub</a>}

          {result && hasError && 
            <a 
              className="form-button yellow"
              target="blank"
              href={generateErrorReportLink('email')}
              >Report Error via Email</a>}
        </div>
      </Fragment>}</Form>
      {result && <div className="results-outlet"><div className="codeblock">{result}</div></div>}
    </main>
  )
}
