import './index.scss'
import { Component, h } from 'preact'
import { Button } from '../button'
import { makeReactive } from '../../platform/reactive'

export type SelectProps = Omit<h.JSX.HTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value?: File[]
  name: string
  multiple?: boolean
  accept?: string
  placeholder?: string
  onChange?: (files: Array<File>) => any
}

export class FilePicker extends Component<SelectProps> {
  disabled: boolean
  inputEl: HTMLInputElement | null
  files: File[]

  constructor(props: SelectProps){
    super(props)
    this.disabled = props.disabled == true ? true : false
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
  }

  render() {
      return (
        <div className="form-file-picker form-label" disabled={this.disabled}>
          <Button 
            color='grey'
            disabled={this.disabled}
            onClick={() => this.inputEl?.click()}
          >Choose Files</Button>
    
          <input 
            disabled={this.disabled}
            style={{ display: 'none' }}
            type="file"
            ref={ref => this.inputEl = ref}
            onChange={event => this.onChange(event)}/>
    
          <div class="selected-files">
            {this.files.map((file: any) => <p>{file.name}</p>)}
          </div>
        </div>
      )
  }
}
