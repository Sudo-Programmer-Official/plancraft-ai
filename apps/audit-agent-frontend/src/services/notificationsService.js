// Simple client for backend notification trigger

export async function triggerNotification({ token, title, body }) {
  const base = import.meta.env.VITE_BACKEND_URL || "" // e.g. https://your-backend.onrender.com
  const url = `${base}/api/notify`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, title, body }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Notify failed ${res.status}: ${text}`)
  }

  return res.json()
}

