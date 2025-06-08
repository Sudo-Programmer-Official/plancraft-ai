import jsPDF from 'jspdf'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

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
