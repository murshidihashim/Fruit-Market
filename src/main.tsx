import { render } from 'preact';
import './ui/styles.css';
import './ui/ticket.css';
import './ui/ticket-ui.css';
import './ui/stalls.css';
import './ui/sheets.css';
import './ui/motion.css';
import './ui/rushTable.css';
import './ui/daysheet.css';
import './ui/bell.css';
import './ui/takings.css';
import { App } from './ui/App';
import { installTelemetry } from './net/telemetry';
import { startAccountSync } from './ui/account';

installTelemetry();
startAccountSync();

render(<App />, document.getElementById('app')!);
