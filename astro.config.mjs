// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

export default defineConfig({
  // Pages stay static. Only the small /api routes (owner sign-in and saving
  // edits) run on a server. The hosting adapter may change when we publish.
  adapter: node({ mode: 'standalone' }),
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
    },
  },
  vite: { plugins: [tailwindcss()] },
});
