import '../vendor/pdfjs/pdf.js'
import { windowRef } from './window.mjs'

/**
 * @typedef {import('../vendor/pdfjs/types/src/pdf')} PDFJS
 */

/**
 * @typedef {import('../vendor/pdfjs/types/src/display/api')} Api
 */


windowRef.pdfjsLib.GlobalWorkerOptions.workerSrc = `vendor/pdfjs/pdf.worker.js`
const pdfjsLib = /** @type {PDFJS} */ (windowRef.pdfjsLib)

export { pdfjsLib }
