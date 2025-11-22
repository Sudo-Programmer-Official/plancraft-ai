export async function findProspects({ topics = [], regions = [] }) {
  const region = regions?.[0] || 'US'
  return topics.map((topic, idx) => ({
    name: `Prospect ${idx + 1}`,
    topic,
    region,
    confidence: 0.7,
  }))
}

export async function findInvestors({ thesis = 'AI', stage = 'Seed', count = 5 }) {
  return Array.from({ length: count || 5 }).map((_, idx) => ({
    name: `Investor ${idx + 1}`,
    stage,
    thesis,
    confidence: 0.65,
  }))
}
