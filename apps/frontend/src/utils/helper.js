export const QUOTE_SECTIONS = [
  { title: 'Stack Recommendation', icon: '💡', key: 'stack' },
  { title: 'Timeline Estimate', icon: '📆', key: 'timeline' },
  { title: 'Cost Estimate', icon: '💰', key: 'estimate' },
  { title: 'Suggested Features', icon: '🧩', key: 'features' },
  { title: 'Architecture Plan', icon: '🏗️', key: 'architecture' },
  { title: 'Security & Compliance', icon: '🔐', key: 'security' }, // New
  { title: 'Deployment Plan', icon: '🚢', key: 'deployment' }, // New
  { title: 'Market Insight', icon: '📊', key: 'marketInsight' },
  { title: 'Risks & Assumptions', icon: '⚠️', key: 'notes' },
  { title: 'Next Steps', icon: '🚀', key: 'nextSteps' },
]

// export function autoAppendToQuote(reply, quoteStore) {
//   const lower = reply.toLowerCase()

//   if (lower.includes('security') || lower.includes('compliance')) {
//     quoteStore.appendToQuoteField('security', reply)
//   } else if (lower.includes('deployment')) {
//     quoteStore.appendToQuoteField('deployment', reply)
//   } else if (lower.includes('architecture')) {
//     quoteStore.appendToQuoteField('architecture', reply)
//   } else if (lower.includes('next steps')) {
//     quoteStore.appendToQuoteField('nextSteps', reply)
//   } else if (lower.includes('features')) {
//     const features = reply
//       .split('\n')
//       .filter((line) => line.trim().startsWith('-'))
//       .map((line) => line.replace(/^-/, '').trim())

//     quoteStore.appendToQuoteField('features', features)
//   } else if (lower.includes('stack')) {
//     quoteStore.appendToQuoteField('stack', reply)
//   } else {
//     // Fallback to notes
//     quoteStore.appendToQuoteField('notes', reply)
//   }
// }

export function autoAppendToQuote(reply, quoteStore) {
  const lower = reply.toLowerCase()

  if (lower.includes('security') || lower.includes('compliance')) {
    quoteStore.appendToQuoteField('security', reply)
  } else if (lower.includes('deployment')) {
    quoteStore.appendToQuoteField('deployment', reply)
  } else if (lower.includes('architecture')) {
    quoteStore.appendToQuoteField('architecture', reply)
  } else if (lower.includes('next step')) {
    quoteStore.appendToQuoteField('nextSteps', reply)
  } else if (lower.includes('stack')) {
    quoteStore.appendToQuoteField('stack', reply)
  } else if (lower.includes('feature')) {
    const features = reply
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)

    if (features.length) {
      quoteStore.appendToQuoteField('features', features)
    } else {
      // fallback if it's a sentence
      quoteStore.appendToQuoteField('features', [reply])
    }
  } else {
    // Fallback to general notes
    quoteStore.appendToQuoteField('notes', reply)
  }
}
