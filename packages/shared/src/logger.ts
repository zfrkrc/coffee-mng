/**
 * Structured JSON logging for all Edge processes.
 *
 * Each line is a single JSON object with stable fields so the cloud
 * observability pipeline can parse them without custom parsing.
 * Never log secrets, tokens, or full payment card data.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  nodeId: string;
  tenantId?: string;
  branchId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

type Meta = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface LoggerOptions {
  level?: LogLevel;
  nodeId?: string;
  /** Set to a function to override output (used by tests). */
  write?: (line: string) => void;
}

export class Logger {
  private readonly level: LogLevel;
  private readonly nodeId: string;
  private readonly writeLine: (line: string) => void;

  constructor(opts: LoggerOptions = {}) {
    this.level = opts.level ?? 'info';
    this.nodeId = opts.nodeId ?? 'unknown-node';
    this.writeLine = opts.write ?? ((line: string) => console.log(line));
  }

  child(meta: Meta): Logger {
    const base = this;
    return new Proxy(this, {
      get(_target, prop, receiver) {
        const value = Reflect.get(base, prop, receiver);
        if (typeof value === 'function') {
          return (...args: unknown[]) => (value as (...a: unknown[]) => void).call(base, args[0], {
            ...(args[1] as Meta | undefined),
            ...meta,
          });
        }
        return value;
      },
    }) as Logger;
  }

  debug(msg: string, meta?: Meta): void {
    this.emit('debug', msg, meta);
  }

  info(msg: string, meta?: Meta): void {
    this.emit('info', msg, meta);
  }

  warn(msg: string, meta?: Meta): void {
    this.emit('warn', msg, meta);
  }

  error(msg: string, meta?: Meta): void {
    this.emit('error', msg, meta);
  }

  private emit(level: LogLevel, msg: string, meta?: Meta): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) return;
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      msg,
      nodeId: this.nodeId,
      ...(meta ?? {}),
    };
    try {
      this.writeLine(JSON.stringify(entry));
    } catch {
      // Never let logging break the business path.
    }
  }
}

/** Default process-wide logger. Reconfigure per process at startup. */
export const logger = new Logger();

/** Create a child logger with branch/tenant context (e.g. per request). */
export function withContext(log: Logger, meta: Meta): Logger {
  return log.child(meta);
}
