export async function publishTwitter({ caption, thread }) {
  return { status: 'queued', caption, thread }
}
