import { getBytesFromFile } from "../browser";
import { process } from "./process";

export const PAGE_BREAK = '--__PAGE_BREAK__--'

export class PDFFile {
  readonly name: string
  readonly pages: Readonly<Array<string[]>>

  constructor(
    name: string,
    pages: Array<string[]>,
  ) {
    this.name = name
    this.pages = Object.freeze(structuredClone(pages))
  }

  /** @deprecated avoid using this and traverse the arrays instead */
  flattenPages(): string[] {
    let output: string[] = []

    for (const page of this.pages) {
      const current = [...page]
      current.push(PAGE_BREAK)
      output.push(...current)
    }

    return output
  }
 }

export async function fromFile(file: File): Promise<PDFFile> {
  const bytes = await getBytesFromFile(file);
  return Object.freeze(new PDFFile(
    file.name,
    await process(bytes)
  ))
}

export async function fromFiles(files: File[]): Promise<PDFFile[]> {
  const pdfFiles: PDFFile[] = []

  for (const [i, file] of files.entries()) {
    pdfFiles.push(await fromFile(file))
  }

  return pdfFiles
}
