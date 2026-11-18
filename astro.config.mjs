// @ts-check
import { defineConfig } from 'astro/config';

// Static output: `astro build` emits a plain static site to dist/,
// served as-is by Cloudflare Workers Static Assets (see wrangler.jsonc).
// No adapter is needed.
export default defineConfig({
  site: 'https://carlosepc.hivepen.com',
  output: 'static',
});
