// Lightweight ElevenLabs proxy helper.
// For now this returns null when the integration isn't configured.

const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID || null;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || null;
const ELEVENLABS_ENDPOINT =
  process.env.ELEVENLABS_TTS_ENDPOINT || 'https://api.elevenlabs.io/v1/text-to-speech';

export async function textToSpeech(text, { voiceId = DEFAULT_VOICE, model = 'eleven_monolingual_v1' } = {}) {
  if (!text || !text.trim()) return null;
  if (!ELEVENLABS_API_KEY || !voiceId) {
    console.warn('[textToSpeech] ELEVENLABS not configured — skipping synthesis');
    return null;
  }

  try {
    const response = await fetch(`${ELEVENLABS_ENDPOINT}/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: model,
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[textToSpeech] ElevenLabs error', response.status, errBody);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(buffer).toString('base64');
    // Return a data URL so the client can play immediately.
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (err) {
    console.error('[textToSpeech] failed to synthesize speech', err);
    return null;
  }
}

export default textToSpeech;
