## Dev Notes

### Mobile Safari + Android Recording
- Web Speech API is unreliable or unsupported on mobile. We use `MediaRecorder` + backend transcription.
- Frontend (`backendRecorder.js`) records chunks every ~2.5s and posts them to `/api/transcribe` for live partials, then posts a final full blob on stop.
- iOS requires a user gesture to start the mic; start inside a click handler.

### Whisper / Transcribe Model Access
- Some projects don’t have access to `whisper-1`. The backend tries a fallback list:
  - `OPENAI_TRANSCRIBE_MODEL` → `OPENAI_TRANSCRIBE_FALLBACKS`
  - Defaults: `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`, `whisper-1`.
- Errors like `model_not_found` or 403 trigger fallback.

### CORS
- Dev via Vite on a device may originate from an IP (e.g., `http://192.168.x.x:5173`).
- Backend accepts listed origins and, if `ALLOW_DEV_ANY_ORIGIN=1`, allows any dev origin.
- If you still see CORS errors on device, set `VITE_TRANSCRIBE_BASE_URL` to your deployed backend (HTTPS) temporarily.

### Firestore Queries and Order
- Daily loads today’s tasks ordered by `order`.
- Weekly/Monthly load via date range queries ordered by `date` then `order`, filtered client-side by selected date.
- Persist order on drag via `useTasks.persistOrder()`.

### Debugging Tips
- Check Network tab for `POST /api/transcribe` requests on mobile; you should see partial responses during recording.
- If you get 403 on AI endpoints, verify model env vars and key scope.
- Use `console.warn`/`console.error` trails already placed in voice + backend handlers.

### Contributing
- Keep changes focused and composable; follow existing patterns (Vue SFCs, composables for shared logic).
- Avoid adding new dependencies unless they’re clearly needed.
- Add brief docs to this folder when introducing new modules or flows.

