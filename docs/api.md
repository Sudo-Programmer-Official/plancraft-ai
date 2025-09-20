## API Reference

Base URL (local): `http://localhost:4000`

Mounts:
- AI routes: `/api/ai`
- Transcribe: `/api`

---

### POST /api/transcribe
Transcribe an audio file using OpenAI transcription models with automatic fallback.

Request
```
POST /api/transcribe
Content-Type: multipart/form-data

file: <audio blob>  # webm/opus (Android), m4a/mp4 (iOS), mp3/aac as fallback
```

Response
```json
{
  "text": "transcribed text",
  "model": "gpt-4o-mini-transcribe"
}
```

Errors
- 400: Missing file
- 5xx: Upstream model or network error

Notes
- Backend tries the following models in order unless overridden by env:
  - `OPENAI_TRANSCRIBE_MODEL`, then `OPENAI_TRANSCRIBE_FALLBACKS` (comma‑separated)
  - Defaults: `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`, `whisper-1`

---

### POST /api/ai/journal/enhance
Mindful editing of a freeform journal entry.

Request
```json
{
  "text": "raw journal text"
}
```

Response
```json
{
  "enhanced": "gentle clarified version"
}
```

Errors
- 400: Missing `text`
- 5xx: Upstream model error

---

### POST /api/ai/tasks/summarize
Summarize a task list into progress metrics and suggested focus.

Request
```json
{
  "tasks": [
    { "title": "Draft doc", "completed": true },
    { "title": "Send email", "completed": false }
  ]
}
```

Response (keys normalized by frontend)
```json
{
  "summary": {
    "Completed %": 50,
    "Pending items": ["Send email"],
    "Suggested focus for today": "Send email",
    "Quick wins": ["Reply to thread"],
    "Heavy lifts": ["Outline plan"],
    "Weekly warning": "Backlog growing"
  }
}
```

Errors
- 400: `tasks` must be an array
- 5xx: Upstream model error

---

### POST /api/ai/split-tasks
Convert freeform text into small, inviting, actionable tasks.

Request
```json
{
  "text": "clean inbox, outline project, book dentist",
  "maxItems": 6,         // optional (default 6)
  "context": "work"      // optional hint
}
```

Successful Response
```json
{
  "tasks": [
    {
      "title": "Clear inbox to zero",
      "details": "Archive low priority, star items to reply",
      "estimate_minutes": 15,
      "energy": "low",
      "context": "computer",
      "priority": 1
    }
  ]
}
```

Errors
- 400: Missing `text`
- 502: Upstream format unexpected (rare)
- 5xx: Model error

Notes
- Output is sanitized server-side; the frontend may also flatten tasks to strings where needed.

