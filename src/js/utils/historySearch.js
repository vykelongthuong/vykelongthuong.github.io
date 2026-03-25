import { normalizeSourceUrl } from "./sourceUrl.js";

function stripVietnamese(input = "") {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export function normalizeSearchText(input = "") {
  if (typeof input !== "string") return "";
  return stripVietnamese(input).toLowerCase().trim().replace(/\s+/g, " ");
}

function levenshteinDistance(a = "", b = "") {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

function tokenMatch(candidateToken, queryToken) {
  if (
    candidateToken.includes(queryToken) ||
    queryToken.includes(candidateToken)
  ) {
    return true;
  }

  if (queryToken.length < 4) {
    return false;
  }

  return levenshteinDistance(candidateToken, queryToken) <= 1;
}

export function isApproximateNameMatch(name = "", query = "") {
  const normalizedName = normalizeSearchText(name);
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return true;
  if (!normalizedName) return false;
  if (normalizedName.includes(normalizedQuery)) return true;

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const nameTokens = normalizedName.split(" ").filter(Boolean);

  return queryTokens.every((queryToken) =>
    nameTokens.some((nameToken) => tokenMatch(nameToken, queryToken)),
  );
}

export function isExactUrlMatch(sourceUrl = "", query = "") {
  const rawQuery = typeof query === "string" ? query.trim() : "";
  if (!rawQuery) return true;

  const normalizedQueryUrl = normalizeSourceUrl(rawQuery);
  if (!normalizedQueryUrl) return false;

  const normalizedSourceUrl = normalizeSourceUrl(sourceUrl);
  return Boolean(
    normalizedSourceUrl && normalizedSourceUrl === normalizedQueryUrl,
  );
}
