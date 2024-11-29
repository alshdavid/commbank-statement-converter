import "./index.scss";
import { h, Component, Fragment } from "preact";
import moment from "moment";
import { Button } from "../components/button/index.js";
import { FilePicker } from "../components/file-picker/index.js";
import { makeReactive } from "../platform/reactive/index.js";
import { IStatementConverter, StatementRecord } from "../platform/converter/index.js";
import { BankLabel, BankType } from "./bank-type.js";
import { toCSV } from "../platform/serialize/index.js";
import * as pdf from "../platform/pdf/index.js";
import { downloadFile } from "../platform/browser/index.js";
import { INGAustraliaConverter } from "../banks/ing_au/index.js";
import { CommBankAustraliaConverter } from "../banks/cba_au/index.js";
import { ANZAustraliaConverter } from "../banks/anz_au/index.js";
import { KiwiBankNewZealandConverter } from "../banks/kiwi_nz/index.js";

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
