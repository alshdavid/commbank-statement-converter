import { createContext, h } from 'preact'
import { useState } from 'preact/hooks'

export type FormContext = {
  data: Readonly<Record<string, any>>
  setForm(update: Record<string, any>): void
  get(key: string): any
  set(key: string, value: any): void
  registerField(key: string, value: any): void
  delete(key: string): void
  reset(): void
  submit(): void
  hasUpdated(): boolean
}

export const formContext = createContext<FormContext>(null as any)

export type FormProps = {
  initialValue?: any
  onSubmit?: (data: any) => any
  onChange?: (data: any) => any
  disabled?: boolean
} & (
  {
    children?: ((data: FormContext) => any)
  } |
  {
    children?: any
  }
)

export function Form({ children, initialValue = {}, disabled, onSubmit, onChange }: FormProps) {
  let childElements
  const [initial] = useState(structuredClone(initialValue))
  const [form, setForm] = useState<Record<string, any>>(structuredClone(initialValue))
  const [isUpdated, setUpdated] = useState<boolean>(false)
  const [,forceUpdate] = useState<Object>({})

  function getKey(key: string): any {
    return form[key]
  }

  function registerField(key: string, value: any): void {
    initial[key] = value
    form[key] = value
    forceUpdate(structuredClone({}))
    if (onChange) onChange(form);
  }

  function setKey(key: string, value: any): void {
    form[key] = value
    setUpdated(true)
    if (onChange) onChange(form);
  }

  function deleteKey(key: string): void {
    delete form[key]
    setUpdated(true)
    if (onChange) onChange(form);
  }

  function reset(): void {
    setForm(structuredClone(initial))
    setUpdated(false)
    if (onChange) onChange(form);
  }

  function submit() {
    if (onSubmit) onSubmit(form)
  }

  function hasUpdated() {
    return isUpdated
  }

  if (typeof children === 'function') {
    childElements = <formContext.Consumer>{children}</formContext.Consumer>
  } else {
    childElements = children
  }

  return <div className="form" disabled={disabled}>
    <formContext.Provider 
      children={childElements}
      value={Object.freeze({ 
        data: form, 
        setForm, 
        get: getKey, 
        set: setKey, 
        registerField,
        delete: deleteKey, 
        reset,
        submit,
        hasUpdated,
      })}/>
    </div>
}
