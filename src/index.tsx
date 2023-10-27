import { h } from 'preact'
import * as preact from 'preact'
import { PageHome } from './pages/home'
import { initPdfjs } from './platform/pdfjs';

preact.render(<PageHome/>, document.getElementById('root')!)
initPdfjs()
