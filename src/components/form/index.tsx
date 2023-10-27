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
}

export const formContext = createContext<FormContext>(null as any)

export type FormProps = {
  initialValue?: any
  children?: any
  onSubmit?: (data: any) => any
}

export function Form({ children, initialValue = {}, onSubmit }: FormProps) {
  const [initial] = useState(structuredClone(initialValue))
  const [form, setForm] = useState<Record<string, any>>(structuredClone(initialValue))
  const [,forceUpdate] = useState<Object>({})

  function getKey(key: string): any {
    return form[key]
  }

  function registerField(key: string, value: any): void {
    initial[key] = value
    form[key] = value
  }

  function setKey(key: string, value: any): void {
    form[key] = value
    forceUpdate(structuredClone({}))
  }

  function deleteKey(key: string): void {
    delete form[key]
    forceUpdate(structuredClone({}))
  }

  function reset(): void {
    setForm(structuredClone(initial))
    forceUpdate(structuredClone({}))
  }

  function submit() {
    if (onSubmit) onSubmit(form)
  }

  return <div className="form">
    <formContext.Provider 
      children={children}
      value={Object.freeze({ 
        data: form, 
        setForm, 
        get: getKey, 
        set: setKey, 
        registerField,
        delete: deleteKey, 
        reset,
        submit
      })}/>
    </div>
}
