// quoteService.js
import axios from 'axios'

export default async function fetchQuote(idea) {
  const res = await axios.post('/api/quote', { idea })
  return res.data
}
