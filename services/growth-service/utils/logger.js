export const logger = {
  info: (...args) => console.log(new Date().toISOString(), '[growth]', ...args),
  error: (...args) => console.error(new Date().toISOString(), '[growth]', ...args),
}
