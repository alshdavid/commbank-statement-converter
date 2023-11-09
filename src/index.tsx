import { h } from 'preact'
import * as preact from 'preact'
import { PageHome } from './pages/home'
import { initPdfjs } from './vendor/pdfjs';

void async function main() {
    preact.render(<PageHome/>, document.getElementById('root')!)
    await initPdfjs()
}()
