export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, string | number | boolean | undefined | null>;

export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
}

function write(level: LogLevel, msg: string, fields?: LogFields): void {
  const line = JSON.stringify({
    level,
    msg,
    time: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createLogger(scope?: string): Logger {
  const prefix = scope ? { scope } : {};
  return {
    debug: (msg, fields) => write("debug", msg, { ...prefix, ...fields }),
    info: (msg, fields) => write("info", msg, { ...prefix, ...fields }),
    warn: (msg, fields) => write("warn", msg, { ...prefix, ...fields }),
    error: (msg, fields) => write("error", msg, { ...prefix, ...fields }),
  };
}
