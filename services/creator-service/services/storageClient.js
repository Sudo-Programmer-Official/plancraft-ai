// Minimal storage helper. In production, back this with Firebase Storage or S3.
// For now, accept a direct URL or data URI and echo back as uploaded URL.

export async function uploadMedia({ url, dataUrl }) {
  if (url && typeof url === 'string') {
    return { url }
  }
  if (dataUrl && typeof dataUrl === 'string') {
    // In a real impl, decode and upload to storage. Here we just echo.
    return { url: dataUrl }
  }
  throw new Error('Missing media payload: provide url or dataUrl')
}
