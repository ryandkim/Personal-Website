// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';

export default defineConfig({
  // Pages stay static. Only the small /api routes (owner sign-in and saving
  // edits) run on a server: Vercel when deployed there, Node on your computer.
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
      GITHUB_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: { plugins: [tailwindcss()] },
});
