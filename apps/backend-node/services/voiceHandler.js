import OpenAI from "openai"
import { toFile } from "openai/uploads"
import { createReminderFromText } from "./reminderService.js"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function handleVoiceCommand(audioBuffer, userId, filename = "audio.webm") {
  if (!audioBuffer || !audioBuffer.length) throw new Error("Missing audio buffer")
  const file = await toFile(audioBuffer, filename)

  const transcript = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
  })
  const userText = transcript?.text || ""
  if (!userText.trim()) throw new Error("Transcription failed or was empty")
  return await createReminderFromText(userText, userId)
}

