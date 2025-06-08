import jsPDF from 'jspdf'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export function exportPDF(quote, chatLog) {
  const doc = new jsPDF()

  doc.text('🚀 AI-Generated Quote', 10, 10)
  doc.text(`📦 Stack: ${quote.stack}`, 10, 20)
  doc.text(`📆 Timeline: ${quote.timeline}`, 10, 30)
  doc.text(`💰 Estimate: ${quote.estimate}`, 10, 40)

  doc.text('🧠 Chat Log:', 10, 60)
  chatLog.forEach((msg, i) => {
    const prefix = msg.role === 'user' ? 'You: ' : 'AI: '
    doc.text(`${prefix}${msg.content}`, 10, 70 + i * 10)
  })

  doc.save('quote-summary.pdf')
}

export function exportMarkdown(quote, chatLog) {
  let md = `# 🚀 AI-Generated Quote\n\n`
  md += `## 💡 Stack\n${quote.stack}\n\n`
  md += `## ⏱ Timeline\n${quote.timeline}\n\n`
  md += `## 💰 Estimate\n${quote.estimate}\n\n`
  md += `## 💬 Chat Log\n`
  chatLog.forEach((msg) => {
    const prefix = msg.role === 'user' ? '**You:**' : '**AI:**'
    md += `- ${prefix} ${msg.content}\n`
  })
  return md
}

export async function exportZip(quote, chatLog) {
  const zip = new JSZip()
  zip.file('quote.json', JSON.stringify(quote, null, 2))
  zip.file('chat.txt', chatLog.map((m) => `${m.role}: ${m.content}`).join('\n'))

  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, 'project-briefing.zip')
}
