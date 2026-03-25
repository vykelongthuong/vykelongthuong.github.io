import test from "node:test";
import assert from "node:assert/strict";
import { retryAsync, isTransientApiError } from "../src/js/utils/retry.js";

test("isTransientApiError detects transient network errors", () => {
  assert.equal(isTransientApiError(new Error("fetch failed: connectex")), true);
  assert.equal(isTransientApiError(new Error("HTTP 503 Service Unavailable")), true);
  assert.equal(isTransientApiError(new Error("Validation failed: bad input")), false);
});

test("retryAsync retries and succeeds on transient error", async () => {
  let attempts = 0;
  const retryEvents = [];

  const result = await retryAsync(
    async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("network timeout");
      }
      return "ok";
    },
    {
      retries: 2,
      shouldRetry: isTransientApiError,
      sleepFn: async () => {},
      onRetry: (event) => retryEvents.push(event),
    },
  );

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
  assert.equal(retryEvents.length, 2);
});

test("retryAsync does not retry non-transient error", async () => {
  let attempts = 0;

  await assert.rejects(
    retryAsync(
      async () => {
        attempts += 1;
        throw new Error("invalid prompt format");
      },
      {
        retries: 3,
        shouldRetry: isTransientApiError,
        sleepFn: async () => {},
      },
    ),
    /invalid prompt format/,
  );

  assert.equal(attempts, 1);
});
