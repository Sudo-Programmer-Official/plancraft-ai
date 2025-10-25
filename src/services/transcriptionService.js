import admin from '../../server/firebaseAdmin.js';

const OPENAI_TRANSCRIBE_ENDPOINT = process.env.OPENAI_TRANSCRIBE_ENDPOINT || 'https://api.openai.com/v1/audio/transcriptions';
const DEFAULT_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || process.env.OPENAI_MODEL || 'whisper-1';

function selectFilename(mimeType = 'audio/webm') {
  const map = {
    'audio/webm': 'recording.webm',
    'audio/ogg': 'recording.ogg',
    'audio/mpeg': 'recording.mp3',
    'audio/mp4': 'recording.m4a',
    'audio/x-m4a': 'recording.m4a',
    'audio/wav': 'recording.wav',
  };
  return map[mimeType] || 'recording.webm';
}

export async function transcribeAudioBuffer({ buffer, mimeType = 'audio/webm', prompt = '' }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      text: '',
      summary: null,
      model: null,
      cost: null,
      info: 'OPENAI_API_KEY missing — returning empty transcript.',
    };
  }

  try {
    const filename = selectFilename(mimeType);
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    formData.append('model', DEFAULT_TRANSCRIBE_MODEL);
    formData.append('file', blob, filename);
    if (prompt) formData.append('prompt', prompt);

    const response = await fetch(OPENAI_TRANSCRIBE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[transcribeAudioBuffer] OpenAI error', response.status, errorText);
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const json = await response.json();
    const text = json?.text?.trim() || '';
    return {
      text,
      summary: null,
      model: DEFAULT_TRANSCRIBE_MODEL,
      raw: json,
    };
  } catch (err) {
    console.error('[transcribeAudioBuffer] error', err);
    return {
      text: '',
      summary: null,
      model: null,
      error: err?.message || String(err),
    };
  }
}

export async function downloadRecordingBuffer({ bucketPath }) {
  if (!bucketPath) return null;
  try {
    const bucket = admin.storage().bucket();
    const [file] = await bucket.file(bucketPath).download();
    return file;
  } catch (err) {
    console.error('[downloadRecordingBuffer] failed', err);
    return null;
  }
}

export default transcribeAudioBuffer;
