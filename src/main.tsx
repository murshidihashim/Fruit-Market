import { render } from 'preact';
import './ui/styles.css';
import './ui/ticket.css';
import './ui/ticket-ui.css';
import { App } from './ui/App';
import { installTelemetry } from './net/telemetry';
import { startAccountSync } from './ui/account';

installTelemetry();
startAccountSync();

render(<App />, document.getElementById('app')!);
