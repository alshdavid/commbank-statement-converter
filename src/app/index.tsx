import "./index.scss";
import { Button } from "../components/button";
import { FilePicker } from "../components/file-picker";
import { makeReactive } from "../platform/reactive";
import { IStatementConverter, StatementRecord } from "../platform/converter";
import { BankLabel, BankType } from "./bank-type";
import { h, Component, Fragment } from "preact";
import { toCSV } from "../platform/serialize";
import * as pdf from "../platform/pdf"
import { downloadFile } from "../platform/browser";
import { INGAustraliaConverter } from "../banks/ing_au";
import { CommBankAustraliaConverter } from "../banks/cba_au";
import { ANZAustraliaConverter } from "../banks/anz_au";
import { KiwiBankNewZealandConverter } from "../banks/kiwi_nz";
import moment from "moment";

export class App extends Component {
  parsers: Record<BankType, IStatementConverter>
  selectedBank: BankType
  isConverting: boolean
  isComplete: boolean
  files: File[]
  results: string
  conversionResults: StatementRecord[]
  hasError: boolean

  constructor() {
    super();
    this.files = []
    this.isConverting = false
    this.isComplete = false
    this.results = ''
    this.conversionResults = []
    this.hasError = false
    this.selectedBank = BankType.cba_au;
    this.parsers = {
      [BankType.anz_au]: new ANZAustraliaConverter(),
      [BankType.cba_au]: new CommBankAustraliaConverter(),
      [BankType.ing_au]: new INGAustraliaConverter(),
      [BankType.kiwi_nz]: new KiwiBankNewZealandConverter(),
    }

    // Component automatically recalculates when these properties are updated
    makeReactive(this, 'selectedBank', 'files', 'isConverting', 'results', 'hasError', 'isComplete', 'conversionResults')
  }

  async convert() {
    this.isConverting = true
    
    let parseResult = await pdf.parseFiles(this.files)
    if (parseResult.error) {
      this.results = this.formatError('Unable to parse PDF file', parseResult.error)
      this.isConverting = false
      this.hasError = true
      this.isComplete = true
      return
    }

    let conversionResult = await this.parsers[this.selectedBank].convert(parseResult.value)
    if (conversionResult.error) {
      this.results = this.formatError('Unable to convert PDF file', conversionResult.error)
      this.isConverting = false
      this.hasError = true
      this.isComplete = true
      return
    }

    let csvResult = toCSV(conversionResult.value)
    if (csvResult.error) {
      this.results = this.formatError('unable to generate CSV', csvResult.error)
      this.isConverting = false
      this.hasError = true
      this.isComplete = true
      return
    }

    this.conversionResults = conversionResult.value
    this.results = csvResult.value
    this.isConverting = false
    this.isComplete = true
  }

  formatError(msg: string, error: Error): string {
    return `${msg}\n\nPlease report this to alshdavid@gmail.com or raise an issue on Github\n\n${error.message}\n\n${error.stack}`
  }

  reset() {
    this.files = []
    this.conversionResults = []
    this.isConverting = false
    this.isComplete = false
    this.results = ''
    this.hasError = false
  }

  download() {
    downloadFile(`statements.csv`, this.results)
  }

  render() {
    return (
      <Fragment>
        <h3>Options</h3>

        <select onInput={(event) => (this.selectedBank = (event.target as any).value)}>
          {Object.values(BankType).map((key) => (
            <option value={key}>{BankLabel[key]}</option>
          ))}
        </select>

        <i>PDF files must be in their original form. Conversion will fail if they are images</i>

        <FilePicker
          value={this.files}
          onChange={files => this.files = files}
          multiple={true}
          accept="*.pdf"
          enabled={!this.isConverting && !this.isComplete}
          name="bank-statement-files" />

        <div className="submit">
          <Button 
            color="blue" 
            type="submit"
            enabled={!this.isConverting && this.files.length > 0 && !this.isComplete}
            onClick={() => this.convert()}
            >Convert</Button>

          <Button 
            color="blue"
            enabled={!this.isConverting && this.files.length > 0}
            onClick={() => this.reset()}
            >Reset</Button>

          <Button 
            color="green" 
            enabled={!this.isConverting && this.isComplete && !this.hasError}
            onClick={() => this.download()}
            >Download CSV</Button>
        </div>

        {this.isComplete && this.hasError && <div className="results-outlet"><div className="codeblock">{this.results}</div></div>}

        {this.isComplete && !this.hasError && this.conversionResults.length !== 0 && (
          <div className='results-formatted'>
            <table className='records'>
              <tr>
                <th>Account Number</th>
                <th>Purchase Date</th>
                <th>Settlement Date</th>
                <th>Description</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Balance</th>
              </tr>
              {this.conversionResults.map(line => (
                <tr>
                  <td>{line.account_number}</td>
                  <td>{moment(line.date_of_purchase).format('DD MMM YY')}</td>
                  <td>{line.date_of_settlement && moment(line.date_of_settlement).format('DD MMM YY')}</td>
                  <td>{line.description}</td>
                  <td>{line.debit}</td>
                  <td>{line.credit}</td>
                  <td>{line.balance}</td>
                </tr>))}
            </table>
        </div>)}

        {/* {this.results && <div className="results-outlet"><div className="codeblock">{this.results}</div></div>} */}
      </Fragment>
    );
  }
}

/*
 
export type FormData = {
  'bank-statement-files': File[]
  'separate-dates': boolean
  'include-timezone': boolean
  'exclude-account-balance': boolean
  'output-format': 'csv' | 'json'
}

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
 */
