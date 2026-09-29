import { loadBetterAuth } from '../dist/compatibility/better-auth-loader.js';

const module = await loadBetterAuth();

if (typeof module.betterAuth !== 'function') {
  throw new Error('Better Auth did not expose its factory at runtime');
}

console.log('Better Auth ESM import: ok');
