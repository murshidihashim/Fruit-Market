import { render } from 'preact';
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/pixelify-sans/latin-500.css';
import '@fontsource/pixelify-sans/latin-600.css';
import '@fontsource/pixelify-sans/latin-700.css';
import './ui/styles.css';
import { App } from './ui/App';
import { installTelemetry } from './net/telemetry';
import { startAccountSync } from './ui/account';

installTelemetry();
startAccountSync();

render(<App />, document.getElementById('app')!);
