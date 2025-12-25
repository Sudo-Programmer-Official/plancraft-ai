import * as whatsapp from './whatsappProvider.js'
import * as slack from './slackProvider.js'
import { sendDiscordMessage } from '../discordNotificationService.js'

const discord = {
  async send(userId, message, options = {}) {
    return sendDiscordMessage({
      userId,
      message: message || options.message || 'Notification from PlanCraftAI',
      channelId: options.channelId || null,
      isDM: options.isDM !== false,
    })
  },
}

export const providers = { whatsapp, slack, discord }
