import './index.scss'
import { Component, h } from 'preact'
import { Button } from '../button/index.js'
import { makeReactive } from '../../platform/reactive/index.js'

export type SelectProps = Omit<h.JSX.HTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'disabled'> & {
  value?: File[]
  name: string
  multiple?: boolean
  accept?: string
  placeholder?: string
  enabled?: boolean
  onChange?: (files: Array<File>) => any
}

export class FilePicker extends Component<SelectProps> {
  enabled: boolean
  inputEl: HTMLInputElement | null
  files: File[]

  constructor(props: SelectProps){
    super(props)
    this.enabled = props.enabled ?? true
    this.files = []
    this.inputEl = null

    makeReactive(this, 'files', 'disabled')
  }

  onChange(event: any) {
    this.files= Array.from(event.target.files || []) as File[]
    event.target.value = null
    this.props.onChange?.(this.files)
  }

  componentWillReceiveProps(nextProps: Readonly<SelectProps>): void {
    if (nextProps.value) {
      this.files = nextProps.value
    }
    this.enabled = nextProps.enabled ?? true
  }

  render() {
      return (
        <div className={`form-file-picker form-label ${!this.enabled ? 'disabled' : ''}`}>
          <Button 
            color='grey'
            enabled={this.enabled}
            onClick={() => this.inputEl?.click()}
          >Choose Files</Button>
    
          <input 
            disabled={!this.enabled}
            style={{ display: 'none' }}
            type="file"
            multiple={this.props.multiple}
            ref={ref => this.inputEl = ref}
            onChange={event => this.onChange(event)}/>
    
          <div class="selected-files">
            {this.files.map((file: any) => <p>{file.name}</p>)}
          </div>
        </div>
      )
  }
}
