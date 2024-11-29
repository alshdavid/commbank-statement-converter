import type * as pdfjs from 'pdfjs-dist'
import { windowRef, createScript } from '../browser/index.js'
import { Env } from '../env/index.js'

const PATH_WORKER = Env.baseHref + 'vendor/pdfjs/build/pdf.worker.mjs'
const PATH_LIB = Env.baseHref + 'vendor/pdfjs/build/pdf.mjs'

let pdfjsLoaded: boolean = false

let pdfjsResolve: (v: typeof pdfjs) => void

const pdfjsLib = new Promise<typeof pdfjs>(res => {
  pdfjsResolve = res
})

export function getPdfJsLib(): Promise<typeof pdfjs> {
  return pdfjsLib
}

export async function initPdfjs() {
  if (pdfjsLoaded) return
  const worker = new Worker(PATH_WORKER, { type: 'module' })
  await createScript(PATH_LIB, 'module')
  windowRef.pdfjsLib.GlobalWorkerOptions.workerPort = worker
  pdfjsResolve(windowRef.pdfjsLib)
  pdfjsLoaded = true
}