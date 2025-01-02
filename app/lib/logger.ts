export const Logger = {
  error: (message: string, error?: unknown) => {
    console.error(message, error);
  },
  info: (message: string, ...args: unknown[]) => {
    console.info(message, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(message, ...args);
  },
}; 