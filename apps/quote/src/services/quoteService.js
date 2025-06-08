// quoteService.js
import axios from 'axios'

console.log('API_BASE:', import.meta.env.VITE_API_BASE)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export async function fetchQuote(idea) {
  const res = await axios.post(`${API_BASE}/api/quote`, { idea })
  return res.data
}
export async function askAssistant(prompt) {
  const res = await axios.post(`${API_BASE}/api/ask`, { prompt })
  return res.data // or res.data.result depending on backend shape
}

export async function fetchQuoteWithFile({ idea, fileUrl }) {
  const res = await axios.post(`${API_BASE}/api/quote`, {
    idea,
    fileUrl, // ✅ now sending file URL to backend
  })
  return res.data
}
