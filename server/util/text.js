// Text helpers for guess matching.

export function normalize(str) {
  return String(str ?? "")
    .toLowerCase()
    .trim()
    .replace(/^\$/, "") // strip leading $ (tickers like $MOONPIG)
    .replace(/[^a-z0-9]/g, ""); // drop spaces/punctuation
}

// Levenshtein distance for fuzzy (typo-tolerant) name matching.
export function levenshtein(a, b) {
  a = normalize(a);
  b = normalize(b);
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
