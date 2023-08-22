const pino = require('pino');

// The logger interface that the application needs to depend on.
function facade(log, customFn) {
  return {
    trace: (...args) => {
      log.trace(...args);
      if (customFn && typeof customFn === 'function') {
        customFn(...args);
      }
    },
    debug: (...args) => {
      log.debug(...args);
      if (customFn && typeof customFn === 'function') {
        customFn(...args);
      }
    },
    info: (...args) => {
      log.info(...args);
      if (customFn && typeof customFn === 'function') {
        customFn(...args);
      }
    },
    warn: (...args) => {
      log.warn(...args);
      if (customFn && typeof customFn === 'function') {
        customFn(...args);
      }
    },
    error: (...args) => {
      log.error(...args);
      if (customFn && typeof customFn === 'function') {
        customFn(...args);
      }
    },
    fatal: (...args) => {
      log.fatal(...args);
      if (customFn && typeof customFn === 'function') {
        customFn(...args);
      }
    },
  };
}

function generateTimeString() {
  const timestamp = new Date(Date.now());
  return `${timestamp.getFullYear()}_${timestamp
    .getMonth().toString().padStart(2, '0')}_${timestamp
      .getDate().toString().padStart(2, '0')}_${timestamp
        .getHours().toString().padStart(2, '0')}_${timestamp
          .getMinutes().toString().padStart(2, '0')}_${timestamp
            .getSeconds().toString().padStart(2, '0')}`;
}

function getTransports(options) {
  const logFile = options && options.logFile;
  const logStdOut = options && options.logStdOut;

  const targets = [];

  if (logStdOut) {
    targets.push({ target: 'pino/file' });
  }

  // Create two separate file transports for stdout and stderr, if logFile is enabled.
  if (logFile) {
    const timeString = generateTimeString();
    const stdout = {
      level: 'info',
      target: 'pino/file',
      options: {
        destination: `data/${timeString}_node.access.log`,
      },
    };
    const stderr = {
      level: 'error',
      target: 'pino/file',
      options: {
        destination: `data/${timeString}_node.error.log`,
      },
    };
    targets.push(stdout, stderr);
  }

  // The pino/file transport uses pino.destination() under the hood.
  // The main difference between the two is that the former runs in a worker thread
  // while the latter runs in the main thread. When logging only to the standard output
  // or local files, using pino/file may introduce some overhead because the data has
  // to be moved off the main thread first. We should probably stick with pino.destination()
  // in such cases. Using pino/file is recommended only when you're logging to multiple
  // destinations at once, such as to a local file and a third-party log management service.
  return logFile ? pino.transport({ targets }) : pino.destination(1);
}

function createLogger(options) {
  // Default log level.
  // const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  const level = 'info';

  // Functions for formatting the shape of the log lines. These functions
  // should return a JSONifiable object and should never throw an error.
  const formatters = {
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        host: bindings.hostname,
        node_version: process.version,
        server_version: (options && options.serverVersion) || undefined,
      };
    },
  };

  // Logger configuration.
  const config = {
    level,
    formatters,
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  // Logger transports.
  const transport = getTransports(options);

  // Custom function to execute when logging.
  const customFn = options && options.customFn;

  // Create a new Pino logger instance.
  const logger = pino(config, transport);

  return facade(logger, customFn);
}

module.exports = { createLogger };
