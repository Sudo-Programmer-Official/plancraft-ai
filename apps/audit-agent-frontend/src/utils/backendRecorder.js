import RecordRTC from "recordrtc"
import api from '@/services/api'

function getExt(mime) {
  if (!mime) return "wav"
  if (mime.includes("mp4") || mime.includes("aac") || mime.includes("m4a"))
    return "m4a"
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3"
  if (mime.includes("ogg")) return "ogg"
  if (mime.includes("wav")) return "wav"
  if (mime.includes("webm")) return "webm"
  return "webm"
}

/**
 * @param {function} onResult - Callback for transcription text
 * @param {object} options
 * @param {number} [options.timeSliceMs=4000] - Chunk duration for live mode
 * @param {"final"|"live"} [options.mode="final"] - Upload strategy
 */
export async function recordAndSendToBackend(
  onResult,
  {
    timeSliceMs = 4000,
    mode = "final",
    emitFinalResult = mode === "final",
    detectSilence = false,
    silenceThreshold = 0.015,
    silenceDurationMs = 2500,
    onAutoStop,
  } = {},
) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

  const mimeType = "audio/webm;codecs=opus" // force stable type
  const ext = getExt(mimeType)
  const hasWindow = typeof window !== 'undefined'
  const AudioContextClass = hasWindow
    ? window.AudioContext || window.webkitAudioContext || null
    : null
  const canMonitorSilence = detectSilence && !!AudioContextClass

  const invokeCallback = async (text, isFinal) => {
    if (!text || typeof onResult !== "function") return
    try {
      const maybe = onResult(text, isFinal)
      if (maybe && typeof maybe.then === "function") {
        await maybe
      }
    } catch (err) {
      console.warn("⚠️ Transcription callback failed", err)
    }
  }

  const recorder = new RecordRTC(stream, {
    type: "audio",
    mimeType,
    timeSlice: mode === "live" ? timeSliceMs : null, // only slice in live mode
    ondataavailable: async (blob) => {
      if (mode !== "live") return // ignore chunks in final mode
      if (blob.size < 500) return
      try {
        const fd = new FormData()
        fd.append("file", blob, `chunk.${ext}`)
        const res = await api.post("/transcribe", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        const data = res?.data || {}
        if (data?.text) await invokeCallback(data.text, false) // partial result
      } catch (err) {
        console.warn("⚠️ Live transcription failed", err)
      }
    },
  })

  let audioCtx = null
  let analyser = null
  let silenceRaf = null
  let silenceStartedAt = null
  let autoStopTriggered = false
  let sampleBuffer = null

  function stopSilenceMonitor() {
    if (silenceRaf) {
      cancelAnimationFrame(silenceRaf)
      silenceRaf = null
    }
    silenceStartedAt = null
    if (audioCtx) {
      try {
        audioCtx.close()
      } catch {
        /* noop */
      }
      audioCtx = null
    }
    analyser = null
    sampleBuffer = null
  }

  function startSilenceMonitor() {
    if (!canMonitorSilence) return
    try {
      audioCtx = new AudioContextClass()
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)
      sampleBuffer = new Float32Array(analyser.fftSize)
      const byteBuffer = new Uint8Array(analyser.fftSize)
      const useFloat = typeof analyser.getFloatTimeDomainData === 'function'

      const readSamples = () => {
        if (useFloat) {
          analyser.getFloatTimeDomainData(sampleBuffer)
        } else {
          analyser.getByteTimeDomainData(byteBuffer)
          for (let i = 0; i < byteBuffer.length; i += 1) {
            sampleBuffer[i] = (byteBuffer[i] - 128) / 128
          }
        }
      }

      const checkSilence = () => {
        readSamples()
        let sumSquares = 0
        for (let i = 0; i < sampleBuffer.length; i += 1) {
          const sample = sampleBuffer[i] || 0
          sumSquares += sample * sample
        }
        const rms = Math.sqrt(sumSquares / sampleBuffer.length) || 0
        const now =
          typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now()
        if (rms < silenceThreshold) {
          if (!silenceStartedAt) {
            silenceStartedAt = now
          } else if (now - silenceStartedAt >= silenceDurationMs) {
            stopSilenceMonitor()
            if (!autoStopTriggered) {
              autoStopTriggered = true
              if (typeof onAutoStop === 'function') {
                try {
                  onAutoStop('silence')
                } catch {
                  /* noop */
                }
              }
              if (recorder?._stop) {
                recorder._stop().catch(() => {})
              } else {
                try {
                  recorder.stopRecording()
                } catch {
                  /* noop */
                }
              }
            }
            return
          }
        } else {
          silenceStartedAt = null
        }
        silenceRaf = requestAnimationFrame(checkSilence)
      }

      audioCtx.resume?.().catch(() => {})
      silenceRaf = requestAnimationFrame(checkSilence)
    } catch (err) {
      console.warn('⚠️ Silence monitor unavailable', err?.message || err)
      stopSilenceMonitor()
    }
  }

  // 🔹 Finalizer
  let stopped = false
  recorder._stop = ({ skipFinalUpload = false } = {}) =>
    new Promise((resolve) => {
      if (stopped) {
        resolve()
        return
      }
      stopped = true
      stopSilenceMonitor()
      recorder.stopRecording(async () => {
        try {
          const shouldSendFinal = !skipFinalUpload && emitFinalResult
          if (shouldSendFinal) {
            const blob = recorder.getBlob()
            try {
              const fd = new FormData()
              fd.append("file", blob, `speech.${ext}`)
              const res = await api.post("/transcribe", fd, {
                headers: { "Content-Type": "multipart/form-data" },
              })
              const data = res?.data || {}
              if (data?.text) await invokeCallback(data.text, true) // final result
            } catch (err) {
              console.error("❌ Final transcription failed", err)
            }
          }
        } finally {
          stream.getTracks().forEach((t) => t.stop())
          resolve()
        }
      })
    })

  recorder.startRecording()
  startSilenceMonitor()

  return recorder
}
