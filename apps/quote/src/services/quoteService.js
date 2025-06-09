// quoteService.js
import axios from 'axios'

console.log('API_BASE:', import.meta.env.VITE_API_BASE)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export async function fetchQuote(idea) {
  const res = await axios.post(`${API_BASE}/api/quote`, { idea })
  return res.data
}
// export async function askAssistant(prompt) {
//   const res = await axios.post(`${API_BASE}/api/ask`, { prompt })
//   return res.data // or res.data.result depending on backend shape
// }
export async function askAssistant(prompt, quote = null) {
  let fullPrompt = prompt
  if (quote) {
    fullPrompt = `Here’s the current quote:\n${JSON.stringify(quote, null, 2)}\n\nUser says: ${prompt}`
  }

  const res = await axios.post(`${API_BASE}/api/ask`, { prompt: fullPrompt })
  return res.data
}

export async function fetchQuoteWithFile({ idea, fileUrl }) {
  const res = await axios.post(`${API_BASE}/api/quote`, {
    idea,
    fileUrl, // ✅ now sending file URL to backend
  })
  return res.data
}

export async function finalizeQuoteWithChat({ idea, chatLog }) {
  console.log('finalizeQuoteWithChat', idea, chatLog)
  const res = await axios.post(`${API_BASE}/api/finalize`, {
    idea,
    chatLog,
  })
  return res.data
}
