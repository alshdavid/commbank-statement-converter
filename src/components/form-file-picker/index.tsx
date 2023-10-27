import './index.scss'
import { h } from 'preact'
import { useContext, useEffect, useState } from 'preact/hooks'
import { formContext } from '../form'
import { Button } from '../form-button'

export type SelectProps = h.JSX.HTMLAttributes<HTMLInputElement> & {
  name: string
  multiple?: boolean
  accept?: string
  placeholder?: string
  onChange?: (files: Array<File>) => any
}

export function FilePicker({ name, ...props }: SelectProps) {
  const form = useContext(formContext)
  const [ el, setEl ] = useState<null | HTMLInputElement>(null)

  useEffect(() => {
    if (name in form.data) return
    if (!el) return
    form.registerField(name, [])
  }, [el])

  function onChange(event: any) {
    const target: HTMLInputElement = event.target! as any
    const captured = Array.from(target.files || [])
    // @ts-expect-error
    target.value = null
    form.set(name, captured)
    props.onChange?.(captured)
  }

  return (
    <div className="form-file-picker form-label">
      <Button 
        color='grey'
        onClick={() => el?.click()}>Choose Files</Button>
      <input 
        {...props}
        style={{ display: 'none' }}
        type="file"
        ref={setEl}
        onChange={onChange}/>

      <div class="selected-files">
        {form.get(name)?.map((file: any) => <p>{file.name}</p>)}
      </div>
    </div>
  )
}
