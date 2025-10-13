import OpenAI from 'openai'
import dotenv from "dotenv";
dotenv.config();
import { db } from './firebaseAdmin.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateDailyBlogIdea() {
  const prompt = `You are PlanCraftAI’s content strategist.
Suggest a blog idea around productivity, planning, journaling, or voice-based workflows.
Return strict JSON with keys: title, summary, tags (array).`

  const res = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }]
  })

  const idea = JSON.parse(res.choices?.[0]?.message?.content || '{}')
  const slug = String(idea?.title || 'post')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  // Normalize tags robustly
  const rawTags = idea?.tags
  const tags = Array.isArray(rawTags)
    ? rawTags
    : String(rawTags || '')
        .split(/[,#]+/)
        .map((t) => t.trim())
        .filter(Boolean)

  const doc = {
    title: String(idea?.title || 'Untitled'),
    summary: String(idea?.summary || ''),
    tags,
    slug,
    content: '',
    created_at: new Date(),
    updated_at: new Date(),
    published: false,
    author: 'PlanCraftAI',
  }

  const ref = await db.collection('blogs').add(doc)
  return { id: ref.id, ...doc }
}

export async function generateBlogContent(title, summary, opts = {}) {
  const blogPrompt = (opts?.blogPrompt || '').trim();
  const preferredModel = (opts?.aiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();

  // Build a refined prompt with stronger structure and paragraph flow
  const humanizedPrompt = `
You are an expert blog writer for PlanCraftAI — an AI-powered productivity platform.

Write a complete, engaging, human-like blog post using the following context:

Title: "${title}"
Summary: "${summary || 'N/A'}"

Guidelines:
- Write in **natural paragraph form**, not markdown (avoid ## or # headings).
- Begin with a short hook paragraph that emotionally connects with readers.
- Use short, focused paragraphs (3–5 sentences each) for clarity.
- Include clear section transitions, examples, or relatable scenarios.
- Use **bold** for emphasis on keywords or ideas.
- End with a motivating or reflective conclusion linking back to AI productivity.
- Keep tone optimistic, conversational, and informative.
- Include light, relevant references (e.g., “According to recent studies…” or “Many professionals find…”).
- Target ~700–800 words.

Use this creative policy (editable via Admin Settings):
"${blogPrompt || 'Generate engaging AI productivity content for PlanCraftAI.'}"

Output as clean HTML only — no markdown, no headings with #. Use <p>, <b>, <ul>, <li>, <blockquote>, etc.
`;

  const models = [preferredModel, 'gpt-4o-mini', 'gpt-3.5-turbo'];
  let lastErr = null;

  for (const model of models) {
    try {
      const res = await openai.chat.completions.create({
        model,
        temperature: 0.85,
        messages: [{ role: 'user', content: humanizedPrompt }],
      });

      const text = res.choices?.[0]?.message?.content?.trim() || '';

      // Basic safety cleanup — remove double spaces, stray hashes, etc.
      const cleanHTML = text
        .replace(/#{1,6}\s*/g, '') // remove markdown headings
        .replace(/\n{2,}/g, '</p><p>')
        .replace(/(\r\n|\r|\n)/g, ' ')
        .replace(/<\/?p><\/?p>/g, '') // remove empty <p> tags
        .replace(/(<p>\s*)+/g, '<p>') // collapse empty paragraphs
        .trim();

      if (cleanHTML) return { text: cleanHTML, model };
    } catch (e) {
      lastErr = e;
      console.warn(`[generateBlogContent] Model '${model}' failed:`, e?.message || e);
      continue;
    }
  }

  if (lastErr) throw lastErr;
  return { text: '', model: models[0] };
}

export async function generateBlogSummary(title = '', content = '', opts = {}) {
  const safeTitle = String(title || '').slice(0, 180)
  const safeContent = String(content || '').slice(0, 2000)
  const prompt = `You are PlanCraftAI’s blog editor.
Write a single-sentence tagline (max 160 characters) for the blog titled "${safeTitle}".
Tone: crisp, clear, motivational. No quotes. Return only the sentence.

Context (optional):
${safeContent}
`

  const preferredModel = (opts?.aiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
  const models = [preferredModel, 'gpt-4o-mini', 'gpt-3.5-turbo']
  let lastErr = null
  for (const model of models) {
    try {
      const res = await openai.chat.completions.create({
        model,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = res.choices?.[0]?.message?.content?.trim() || ''
      if (text) return { text, model }
    } catch (e) {
      lastErr = e
      console.warn(`[generateBlogSummary] Model '${model}' failed:`, e?.message || e)
      continue
    }
  }
  if (lastErr) throw lastErr
  return { text: '', model: models[0] }
}

// export async function generateBlogImage(title) {
//   const prompt = `
// Create a soft, calming illustration in the visual style of the PlanCraftAI app
// (theme: deep indigo gradients, productivity, mindfulness, and focus).
// Include abstract icons that reflect journaling, planning, or creativity.
// Aspect ratio 16:9, minimal text, consistent with a calm professional tone.
// Title: "${blog.title || 'PlanCraftAI Blog'}"
// `
//   const image = await openai.images.generate({
//     model: 'dall-e-3',
//     prompt: prompt.trim(),
//     size: '1024x1024'
//   })
//   return image.data?.[0]?.url || ''
// }
export async function generateBlogImage(title = "PlanCraftAI Blog") {
  try {
    const prompt = `
Create a soft, calming illustration in the visual style of the PlanCraftAI app.
Theme: deep indigo gradients, productivity, mindfulness, and focus.
Include abstract icons that reflect journaling, planning, or creativity.
Aspect ratio 16:9, minimal text, consistent with a calm professional tone.
Title: "${title}"
`;

    const image = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt.trim(),
      size: "1024x1024"
    });

    return image.data?.[0]?.url || "";
  } catch (err) {
    console.error("❌ generateBlogImage error:", err);
    throw new Error(err?.message || "Failed to generate image");
  }
}
