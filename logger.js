'use strict';
const fs = require('fs');
const path = require('path');
const pino = require('pino');

// Independent of Pino: a broken transport must never be used to report itself.
let nextEmergency = 0;
let emergencyFileAttempted = false;
function reportEmergency(error, context = 'logger') {
  const now = Date.now();
  if (now < nextEmergency) return;
  nextEmergency = now + 10000;
  const detail = error instanceof Error ? error : new Error(String(error));
  const record = {
    utc: new Date(now).toISOString(), pid: process.pid, context,
    name: detail.name, code: detail.code,
    message: String(detail.message).slice(0, 2048),
    stack: String(detail.stack || '').slice(0, 8192),
  };
  // Keep the first failure even if the terminal is closed; no application log args.
  let saved;
  if (!emergencyFileAttempted) {
    emergencyFileAttempted = true;
    try {
      fs.mkdirSync('data', { recursive: true });
      saved = path.resolve('data', `logger-failure-${process.pid}-${now}.json`);
      fs.writeFileSync(saved, JSON.stringify(record, null, 2), { flag: 'wx', mode: 0o600 });
    } catch (_) { /* stderr still gets the original failure below. */ }
  }
  try {
    fs.writeSync(2, `[Corelink emergency] ${JSON.stringify(record)}${saved ? '\nFailure saved: ' + saved : ''}\n`);
  } catch (_) { /* A closed stderr cannot cause another logging failure. */ }
}

function generateTimeString() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function createLogger(options = {}) {
  const { createDestination } = require('./async-log-destination');
  const destinations = [], targets = [];
  const add = (destination, name, level) => {
    const stream = createDestination({ destination, name, report: reportEmergency });
    destinations.push(stream); targets.push({ level, stream });
  };
  if (options.logStdOut !== false) add(1, 'stdout', 'info');
  if (options.logFile) {
    try { fs.mkdirSync('data', { recursive: true }); }
    catch (error) { reportEmergency(error, 'cannot create logging directory; writes will retry'); }
    const stamp = generateTimeString();
    add(`data/${stamp}_node.access.log`, 'access file', 'info');
    add(`data/${stamp}_node.error.log`, 'error file', 'error');
  }
  let logger, disabled = false, relayDisabled = false;
  try {
    logger = pino({ level: 'info', timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { bindings: b => ({ pid: b.pid, host: b.hostname,
        node_version: process.version, server_version: options.serverVersion }) },
    }, pino.multistream(targets));
  } catch (error) { disabled = true; reportEmergency(error, 'logger initialization failed'); }
  const facade = {
    getStatus: () => ({ disabled, relayDisabled, destinations: destinations.map(d => d.getStatus()) }),
    close: () => destinations.forEach(d => d.close()),
  };
  for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal']) {
    facade[level] = (...args) => {
      if (disabled || !logger || !logger.isLevelEnabled(level)) return;
      try { logger[level](...args); }
      catch (error) { reportEmergency(error, 'log serialization failed; message discarded'); return; }
      if (!relayDisabled && typeof options.customFn === 'function') {
        try { options.customFn(...args); }
        catch (error) { relayDisabled = true; reportEmergency(error, 'log relay disabled'); }
      }
    };
  }
  return facade;
}

module.exports = { createLogger, reportEmergency };
