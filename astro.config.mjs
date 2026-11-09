// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';

export default defineConfig({
  // Pages stay static. Only the small /api routes (owner sign-in and saving
  // edits, the AI Ryan chat) run on a server: Vercel when deployed there, Node on your computer.
  adapter: process.env.VERCEL ? vercel() : node({ mode: 'standalone' }),
  security: { checkOrigin: true },
  // The dev toolbar would sit on top of the owner Edit bar.
  devToolbar: { enabled: false },
  env: {
    schema: {
      // Public by design: Google needs it in the browser to show the sign-in button.
      GOOGLE_CLIENT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      // Server-only secrets. Never sent to the browser.
      OWNER_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      SESSION_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Read-only GitHub token, used at build time to read portfolio.json from private repos.
      // Token that can write to this site's repo, so Save on the live site commits to GitHub.
      SITE_EDIT_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      SITE_REPO: envField.string({ context: 'server', access: 'secret', default: 'ryandkim/Personal-Website' }),
      GITHUB_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Claude API key for the AI Ryan chat on the back of the headshot. Without it the chat says it's offline.
      ANTHROPIC_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: { plugins: [tailwindcss()] },
});
