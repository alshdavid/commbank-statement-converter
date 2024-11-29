import { windowRef } from "./window.js"

export async function createScript(src: string, type: 'module' | 'classic' = 'classic'): Promise<HTMLScriptElement> {
  let timeout = new Promise<true>(res => setTimeout(() => res(true), 10_000))
  const script = document.createElement('script')
  script.src = src
  if (type === 'module') {
    script.type = 'module'
  }
  const onload = new Promise<false>(res => script.onload = () => res(false))
  windowRef.document.head.appendChild(script)
  const hasTimedOut = await Promise.race([
    onload,
    timeout,
  ])
  if (hasTimedOut) {
    throw new Error(`Script loading timeout: "${src}"`)
  }
  return script
}
