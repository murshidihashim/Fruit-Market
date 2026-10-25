import { render } from 'preact';
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-600.css';
import './ui/styles.css';
import { App } from './ui/App';

render(<App />, document.getElementById('app')!);
