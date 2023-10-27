import './index.scss'
import { h } from "preact";
import { Form } from "../../components/form";
import { Checkbox } from "../../components/form-checkbox";
import { Button } from "../../components/form-button";
import { Select, Option } from "../../components/form-select";
import { FilePicker } from "../../components/form-file-picker";
import { convertStatements } from '../../platform/convert';
import { downloadFile } from '../../platform/download-file';

type FormData = {
  'bank-statement-files': File[]
  'separate-dates': boolean
  'include-timezone': boolean
  'exclude-account-balance': boolean
  'output-format': 'csv' | 'json'
}

export function PageHome() {
  async function onSubmit(form: FormData) {
    const result = await convertStatements(form['bank-statement-files'], {
      excludeAccountBalance: form['exclude-account-balance'],
      includeTimeZoneInDates: form['include-timezone'],
      separateDates: form['separate-dates'],
      outputFormat: form['output-format'],
    })

    downloadFile(`statements.${form['output-format']}`, result)
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
      <p className="notice">
        This project is completely open source and welcomes contributions.
        You can find the source code <a target="_blank" href="https://github.com/alshdavid/commbank-statement-converter/issues">here</a>
      </p>
      <Form onSubmit={onSubmit}>
        <FilePicker
          name="bank-statement-files" />

        <h3>Options</h3>

        <Checkbox 
          name="separate-dates" 
          label="Separate authorization and settlement dates"/>

        <Checkbox 
          name="include-timezone" 
          label="Include time zone in dates"/>

        <Checkbox 
          name="exclude-account-balance" 
          label="Exclude account balance column"/>

        <Select name="output-format" label="Output Format">
          <Option value="csv">CSV</Option>
          <Option value="json">JSON</Option>
        </Select>

        <div className="submit">
          <Button color="blue" type="submit">Convert</Button>
          <Button color="red" type="reset">Reset</Button>
        </div>
      </Form>
    </main>
  )
}
