// quoteService.js
import axios from 'axios'

// export default async function fetchQuote(idea) {
//   const res = await axios.post('/api/quote', { idea })
//   return res.data
// }
// src/services/quoteService.js
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export async function fetchQuote(idea) {
  const res = await axios.post(`${API_BASE}/api/quote`, { idea })
  return res.data
}
