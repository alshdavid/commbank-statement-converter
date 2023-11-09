import './index.scss'
import { h } from 'preact'
import { useContext, useEffect, useState } from 'preact/hooks'
import { formContext } from '../form'
import { Label } from '../form-label'

export type CheckboxProps = h.JSX.HTMLAttributes<HTMLInputElement> & {
  name: string
  label?: any
  children?: any
}

export function Checkbox({ name, label, children, disabled, ...props }: CheckboxProps) {
  const form = useContext(formContext)
  const [ el, setEl ] = useState<null | HTMLInputElement>(null)

  useEffect(() => {
    if (name in form.data) return
    if (!el) return
    form.registerField(name, el.checked)
  }, [el])

  function onChange(event: any) {
    form.set(name, event.target.checked)
  }

  return (
    <Label className="form-checkbox" disabled={disabled}>
      {label && <p>{label}</p>}
      {children}
      <input 
        {...props} 
        disabled={disabled}
        type="checkbox"
        checked={form.get(name)}
        ref={setEl}
        onChange={onChange}/>
    </Label>
  )
}
