import type * as pdfjs from 'pdfjs-dist'
import { windowRef, createScript } from './window'

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
  await createScript('/pdfjs.min.js')
  await createScript('/pdfjs.worker.min.js')
  windowRef.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs.worker.min.js'
  pdfjsResolve(windowRef.pdfjsLib)
  pdfjsLoaded = true
}
