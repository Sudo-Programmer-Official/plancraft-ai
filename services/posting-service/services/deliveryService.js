export async function sendTextWhatsApp(job) {
  // TODO: integrate WhatsApp provider
  return { status: 'sent', channel: 'whatsapp', recipient: job.recipients?.[0]?.contactId }
}

export async function sendTextSMS(job) {
  // TODO: integrate SMS provider
  return { status: 'sent', channel: 'sms', recipient: job.recipients?.[0]?.contactId }
}

export async function sendVoiceCall(job) {
  // TODO: integrate Voice provider (play job.audioUrl)
  return { status: 'sent', channel: 'voice_call', recipient: job.recipients?.[0]?.contactId }
}

export async function handleJob(job) {
  switch (job.channel) {
    case 'whatsapp':
      return sendTextWhatsApp(job)
    case 'sms':
      return sendTextSMS(job)
    case 'voice_call':
      return sendVoiceCall(job)
    default:
      throw new Error(`Unsupported channel ${job.channel}`)
  }
}
