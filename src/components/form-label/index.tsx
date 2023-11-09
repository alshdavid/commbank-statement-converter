import './index.scss'
import { h } from 'preact'

export type LabelProps = h.JSX.HTMLAttributes<HTMLLabelElement> & {
}

export function Label({ className,  ...props }: LabelProps) {
  return (
    <label {...props} className={
      `${typeof className === 'string' ? className : ''} form-label`}/>
  )
}
