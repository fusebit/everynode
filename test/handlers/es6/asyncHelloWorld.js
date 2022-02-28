export async function handler(event, context) {
  return { env: process.env, event, context };
}
