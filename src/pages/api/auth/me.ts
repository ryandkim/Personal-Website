import type { APIRoute } from 'astro';
import { isOwner, json } from '../../../lib/auth';
export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => json({ owner: await isOwner(cookies) });
