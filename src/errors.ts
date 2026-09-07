export function safeError(error: unknown, secret?: string): string {
  let message = error instanceof Error ? error.message : 'Generation failed.';
  if (secret) message = message.replaceAll(secret, '[redacted]').replaceAll(encodeURIComponent(secret), '[redacted]');
  return message;
}
