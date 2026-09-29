export async function loadBetterAuth() {
  return import('better-auth');
}

export async function loadBetterAuthApi() {
  return import('better-auth/api');
}

export async function loadBetterAuthMongoAdapter() {
  return import('@better-auth/mongo-adapter');
}

export async function loadBetterAuthNode() {
  return import('better-auth/node');
}
