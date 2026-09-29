import { createHash } from 'node:crypto';

process.env.PUBLIC_ORIGIN ??= 'https://play.example';
process.env.PROXY_SECRET ??= 'test-proxy-secret';
process.env.BETTER_AUTH_SECRET ??= 'test-better-auth-secret-with-32-characters';
process.env.REGISTRATION_INVITE_CODE_SHA256 ??= createHash('sha256')
  .update('test-registration-code')
  .digest('hex');
