export class Logger {
  static info(...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.info(...args);
    }
  }

  static error(...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.error(...args);
    }
  }

  static warn(...args: unknown[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(...args);
    }
  }
} 