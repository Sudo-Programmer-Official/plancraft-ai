export const logger = {
  info: (...args) => console.log(new Date().toISOString(), '[ai-nlp]', ...args),
  error: (...args) => console.error(new Date().toISOString(), '[ai-nlp]', ...args),
}
