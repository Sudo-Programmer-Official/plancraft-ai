import jsPDF from 'jspdf'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import htmlDocx from 'html-docx-js'

const defaultQuoteSections = [
  { title: 'Vision Summary', icon: '🎯', key: 'vision' },
  { title: 'Stack Recommendation', icon: '💡', key: 'stack' },
  { title: 'Architecture Plan', icon: '🏗️', key: 'architecture' },
  { title: 'Suggested Features', icon: '🧩', key: 'features' },
  { title: 'Timeline Estimate', icon: '📆', key: 'timeline' },
  { title: 'Cost Estimate', icon: '💰', key: 'estimate' },
  { title: 'Market Insight', icon: '📊', key: 'marketInsight' },
  { title: 'Risks & Assumptions', icon: '⚠️', key: 'notes' },
  { title: 'Next Steps', icon: '🚀', key: 'nextSteps' },
]

export function exportDocx(quote, chatLog) {
  let html = `
    <h1>🚀 AI-Generated Quote Report</h1>
    <h2>🎯 Vision Summary</h2><p>${quote.vision}</p>
    <h2>💡 Stack Recommendation</h2><pre>${JSON.stringify(quote.stack, null, 2)}</pre>
    <h2>🏗️ Architecture Plan</h2><p>${quote.architecture}</p>
    <h2>🧩 Suggested Features</h2><ul>${quote.features?.map((f) => `<li>${f}</li>`).join('')}</ul>
    <h2>📆 Timeline Estimate</h2><p>${quote.timeline}</p>
    <h2>💰 Cost Estimate</h2><p>${quote.estimate}</p>
    <h2>📊 Market Insight</h2><p>${quote.marketInsight}</p>
    <h2>⚠️ Risks & Assumptions</h2><p>${quote.notes}</p>
    <h2>🚀 Next Steps</h2><p>${quote.nextSteps}</p>
    <h2>💬 Chat Log</h2><ul>
      ${chatLog.map((msg) => `<li><strong>${msg.role === 'user' ? 'You' : 'AI'}:</strong> ${msg.content}</li>`).join('')}
    </ul>
  `

  const blob = htmlDocx.asBlob(html)
  saveAs(blob, 'quote-summary.docx')
}

export function exportPDF(quote, chatLog = []) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('🚀 AI-Generated Quote Report', 10, 15)

  let y = 25
  doc.setFontSize(12)

  for (const section of defaultQuoteSections) {
    const value = quote[section.key]
    if (!value) continue

    doc.setFont(undefined, 'bold')
    doc.text(`${section.icon} ${section.title}`, 10, y)
    y += 7
    doc.setFont(undefined, 'normal')

    const content = Array.isArray(value) ? value.join(', ') : String(value)
    const splitContent = doc.splitTextToSize(content, 180)
    doc.text(splitContent, 10, y)
    y += splitContent.length * 6 + 5
  }

  // Chat log
  doc.setFont(undefined, 'bold')
  doc.text('💬 Chat Log', 10, y)
  y += 7
  doc.setFont(undefined, 'normal')

  chatLog.forEach((msg) => {
    const prefix = msg.role === 'user' ? '👤 You: ' : '🤖 AI: '
    const content = doc.splitTextToSize(`${prefix}${msg.content}`, 180)
    doc.text(content, 10, y)
    y += content.length * 6 + 3
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

export async function exportQuoteFile(type, quote, chat) {
  if (!quote) return
  if (type === 'pdf') exportPDF(quote, chat)
  else if (type === 'zip') exportZip(quote, chat)
  else if (type === 'md') {
    const md = exportMarkdown(quote, chat)
    const blob = new Blob([md], { type: 'text/markdown' })
    saveAs(blob, 'quote-summary.md')
  }
}
