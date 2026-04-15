const LOG_LEVEL = process.env.LOG_LEVEL || "info";

const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = levels[LOG_LEVEL] || levels.info;

/**
 * Simple structured logger for PDF export worker
 *
 * Logs to stdout in a structured format:
 * [TIMESTAMP] [LEVEL] [MODULE] message
 *
 * Sensitive data (user content, PDFs) NEVER logged.
 */
export function createLogger(module) {
  return {
    debug: (msg, meta) => {
      if (levels.debug >= currentLevel) {
        console.log(`[${timestamp()}] [DEBUG] [${module}] ${msg}`, meta || "");
      }
    },

    info: (msg, meta) => {
      if (levels.info >= currentLevel) {
        console.log(`[${timestamp()}] [INFO] [${module}] ${msg}`, meta || "");
      }
    },

    warn: (msg, meta) => {
      if (levels.warn >= currentLevel) {
        console.warn(`[${timestamp()}] [WARN] [${module}] ${msg}`, meta || "");
      }
    },

    error: (msg, err) => {
      if (levels.error >= currentLevel) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[${timestamp()}] [ERROR] [${module}] ${msg} - ${errMsg}`);
      }
    },
  };
}

function timestamp() {
  return new Date().toISOString();
}
