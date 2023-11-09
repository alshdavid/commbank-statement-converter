import './index.scss'
import { h } from 'preact'
import { useContext, useEffect, useState } from 'preact/hooks'
import { formContext } from '../form'
import { Label } from '../form-label'

export type SelectProps = h.JSX.HTMLAttributes<HTMLSelectElement> & {
  name: string
  label?: string
  children?: any
}

export function Select({ name, label, children, className, disabled, ...props }: SelectProps) {
  const form = useContext(formContext)
  const [ el, setEl ] = useState<null | HTMLSelectElement>(null)

  useEffect(() => {
    if (name in form.data) return
    if (!el) return
    form.registerField(name, el.value)
  }, [el])

  function onChange(event: any) {
    form.set(name, event.target.value)
  }

  return (
    <Label className='form-select' disabled={disabled}>
      {label && <p>{label}</p>}
      <select
        {...props}
        className={`${typeof className === 'string' ? className : ''} form-select`}
        ref={setEl}
        onChange={onChange}
        value={form.get(name)}
        disabled={disabled}
      >{children}</select>
    </Label>
  )
}


export function Option(props: h.JSX.HTMLAttributes<HTMLOptionElement>) {
  return <option {...props}/>
}
