function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const TRANSIENT_ERROR_PATTERNS = [
  "network",
  "fetch",
  "timeout",
  "timed out",
  "connectex",
  "econnreset",
  "econnrefused",
  "etimedout",
  "socket",
  "bad gateway",
  "service unavailable",
  "temporarily unavailable",
  "too many requests",
  "rate limit",
  "429",
  "500",
  "502",
  "503",
];

export function isTransientApiError(error) {
  const message = `${error?.message || error || ""}`.toLowerCase();
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

export async function retryAsync(operation, options = {}) {
  const {
    retries = 2,
    baseDelayMs = 1000,
    maxDelayMs = 8000,
    shouldRetry = () => true,
    onRetry,
    sleepFn = sleep,
  } = options;

  const maxAttempts = retries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt >= maxAttempts;
      if (isLastAttempt || !shouldRetry(error)) {
        throw error;
      }

      const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      if (typeof onRetry === "function") {
        onRetry({
          attempt,
          nextAttempt: attempt + 1,
          maxAttempts,
          delayMs,
          error,
        });
      }
      await sleepFn(delayMs);
    }
  }

  throw new Error("Retry failed unexpectedly.");
}
