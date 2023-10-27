import './index.scss'
import { h } from 'preact'
import { useContext } from 'preact/hooks'
import { formContext } from '../form'

export type ButtonProps = h.JSX.HTMLAttributes<HTMLButtonElement> & {
  color?: 'red' | 'blue' | 'grey' | 'green'
}

export function Button({ type, className, color, ...props }: ButtonProps) {
  const form = useContext(formContext)

  function onClick(event: any) {
    if (props.onClick) {
      props.onClick(event)
    }
    if (type === 'submit') {
      form.submit()
    }
    if (type === 'reset') {
      form.reset()
    }
  }

  return <button
    className={
      `${typeof className === 'string' ? className : ''} ${typeof color === 'string' ? color : ''} form-button`}
    {...props} 
    onClick={onClick}/>
}
