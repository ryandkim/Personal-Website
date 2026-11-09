// Chat endpoint for AI Ryan (the back of the headshot).
// Needs ANTHROPIC_API_KEY. Without it, the chat says it's offline.
// Costs are capped in src/data/twin.ts: short replies on the cheapest model,
// a daily message cap per visitor and for the whole site, and only the last
// few messages sent as context. Also set a monthly spend limit in the
// Anthropic Console (Settings > Limits) as a hard ceiling.
import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from 'astro:env/server';
import { json } from '../../lib/auth';
import { TWIN_LIMITS, TWIN_MODEL, twinSystemPrompt } from '../../data/twin';
export const prerender = false;

// Best-effort counters. They reset when a server instance restarts, which is
// why the Console spend limit is the real ceiling.
let day = '';
let siteCount = 0;
const perVisitor = new Map<string, number>();

function countMessage(ip: string): 'ok' | 'visitor' | 'site' {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; siteCount = 0; perVisitor.clear(); }
  const used = perVisitor.get(ip) ?? 0;
  if (used >= TWIN_LIMITS.perVisitorPerDay) return 'visitor';
  if (siteCount >= TWIN_LIMITS.perSitePerDay) return 'site';
  perVisitor.set(ip, used + 1);
  siteCount++;
  return 'ok';
}

let client: Anthropic | null = null;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!ANTHROPIC_API_KEY) return json({ error: 'offline' }, 503);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) return json({ error: 'bad_request' }, 400);

  // Keep only well-formed turns, trimmed, alternating, starting and ending with the visitor.
  const messages: Anthropic.MessageParam[] = [];
  for (const m of raw.slice(-TWIN_LIMITS.historyTurns)) {
    const role = (m as any)?.role;
    const text = typeof (m as any)?.content === 'string' ? (m as any).content.trim().slice(0, TWIN_LIMITS.maxInputChars) : '';
    if ((role !== 'user' && role !== 'assistant') || !text) continue;
    if (messages.length === 0 && role !== 'user') continue;
    if (messages.at(-1)?.role === role) continue;
    messages.push({ role, content: text });
  }
  if (messages.at(-1)?.role !== 'user') return json({ error: 'bad_request' }, 400);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || 'unknown';
  const allowed = countMessage(ip);
  if (allowed !== 'ok') return json({ error: allowed === 'visitor' ? 'limit' : 'busy' }, 429);

  client ??= new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 1, timeout: 20_000 });
  try {
    const response = await client.messages.create({
      model: TWIN_MODEL,
      max_tokens: TWIN_LIMITS.maxReplyTokens,
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: twinSystemPrompt, cache_control: { type: 'ephemeral' } }],
      messages,
    });
    if (response.stop_reason === 'refusal') return json({ reply: "That's not something I can help with here. Ask me about my work, projects, or what I'm looking for." });
    const reply = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim();
    return json({ reply: reply || "Sorry, I lost my train of thought. Try asking again?" });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429);
    if (error instanceof Anthropic.APIError) console.error(`twin: API error ${error.status}`, error.message);
    else console.error('twin: request failed', error);
    return json({ error: 'failed' }, 502);
  }
};
