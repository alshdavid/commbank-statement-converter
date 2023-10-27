import type * as pdfjs from 'pdfjs-dist'
import { windowRef, createScript } from './window'
import { Env } from './env'

let pdfjsLoaded: boolean = false
let pdfjsResolve: (v: typeof pdfjs) => void

const pdfjsLib = new Promise<typeof pdfjs>(res => {
  pdfjsResolve = res
})

let worker: Worker | null

export function getPdfJsLib(): Promise<typeof pdfjs> {
  return pdfjsLib
}

// Loading this lazily because it's quite heavy
export async function initPdfjs() {
  if (pdfjsLoaded) return
  worker = new Worker(Env.baseHref + '/vendor/pdfjs.worker.min.js')
  await createScript(Env.baseHref + '/vendor/pdfjs.min.js')
  windowRef.pdfjsLib.GlobalWorkerOptions.workerPort = worker
  pdfjsResolve(windowRef.pdfjsLib)
  pdfjsLoaded = true
}
