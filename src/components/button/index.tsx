import './index.scss'
import { h } from 'preact'

export type ButtonProps = h.JSX.HTMLAttributes<HTMLButtonElement> & {
  type?: string,
  disabled?: boolean,
  color?: 'red' | 'blue' | 'grey' | 'green' | 'yellow'
  enabled?: boolean
}

export function Button({ type, className, color, enabled, disabled = false, ...props }: ButtonProps) {
  return <button
    className={
      `${typeof className === 'string' ? className : ''} ${typeof color === 'string' ? color : ''} form-button`}
      disabled={enabled !== undefined ? !enabled : disabled}
    {...props} />
}
