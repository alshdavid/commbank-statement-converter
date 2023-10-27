import { windowRef } from "./window"

export async function createScript(src: string): Promise<HTMLScriptElement> {
  const script = document.createElement('script')
  script.src = src
  const onload = new Promise(res => script.onload = res)
  windowRef.document.head.appendChild(script)
  await onload
  return script
}
