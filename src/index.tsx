import { h } from 'preact'
import * as preact from 'preact'
import { App } from './app'
import { initPdfjs } from './vendor/pdfjs';

void async function main() {
    preact.render(<App/>, document.getElementById('root')!)
    await initPdfjs()
}()
