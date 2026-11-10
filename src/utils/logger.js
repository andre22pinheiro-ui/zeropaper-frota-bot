// src/utils/logger.js — Logger Estruturado com Sanitização de Segredos
import fs from 'fs';
import path from 'path';

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] ?? 1;

const SENSITIVE_PATTERNS = [
  /token=[^\s&]+/gi,
  /key=[^\s&]+/gi,
  /authorization:\s*bearer\s+[^\s]+/gi,
  /password=[^\s&]+/gi,
  /secret=[^\s&]+/gi,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g // JWT
];

function sanitize(msg) {
  if (typeof msg !== 'string') return msg;
  let clean = msg;
  for (const pattern of SENSITIVE_PATTERNS) {
    clean = clean.replace(pattern, '[REDACTED]');
  }
  return clean;
}

export function createLogger(moduleName) {
  const logDir = path.resolve('./logs');
  if (!fs.existsSync(logDir)) {
    try { fs.mkdirSync(logDir, { recursive: true }); } catch {}
  }

  function format(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const cleanMsg = sanitize(message);
    let str = `[${timestamp}] [${level.toUpperCase()}] [${moduleName}] ${cleanMsg}`;
    if (data) {
      try {
        const cleanData = typeof data === 'object' ? JSON.stringify(data, (k, v) => {
          if (/token|key|secret|password|jwt/i.test(k)) return '[REDACTED]';
          return v;
        }) : data;
        str += ` | ${cleanData}`;
      } catch {}
    }
    return str;
  }

  function write(level, message, data) {
    if (LOG_LEVELS[level] < CURRENT_LEVEL) return;
    const line = format(level, message, data);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      fs.appendFileSync(path.join(logDir, `zeropaper_${today}.log`), line + '\n', 'utf8');
    } catch {}
  }

  return {
    debug: (msg, data) => write('debug', msg, data),
    info: (msg, data) => write('info', msg, data),
    warn: (msg, data) => write('warn', msg, data),
    error: (msg, data) => write('error', msg, data)
  };
}

export default createLogger;
