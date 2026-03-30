/**
 * Simple Levenshtein distance implementation
 * Returns the minimum number of single-character edits required to change one word into the other.
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let j = 1; j <= n; j++) {
    for (let i = 1; i <= m; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

/**
 * Checks if a target string loosely matches a query string
 * @param target The string to search in (e.g. book title)
 * @param query The user's query
 * @param threshold Max distance allowed per word (e.g. 2 for 3+ letters, 1 for 2 letters)
 */
export function isFuzzyMatch(target: string, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();

  // 1. Direct hit (still best)
  if (t.includes(q)) return true;

  // 2. Tokenize and check fuzzy match for each word in query
  // For simplicity, we check if EACH query word is found loosely in THE TARGET
  const queryWords = q.split(/\s+/).filter(w => w.length > 1);
  if (queryWords.length === 0) return t.includes(q);

  const targetWords = t.split(/\s+/);

  return queryWords.every((qw) => {
    // Check if qw is fuzzy-matched by at least one word in the target
    return targetWords.some((tw) => {
      // Direct hit on this word
      if (tw.includes(qw)) return true;

      // Fuzzy check
      const distance = levenshteinDistance(qw, tw);
      const maxDistance = qw.length <= 3 ? 1 : 2;
      return distance <= maxDistance;
    });
  });
}

/**
 * Higher level function that returns a score for a match.
 * 1.0 = exact match
 * lowers towards 0.0 as distance increases.
 */
export function fuzzyMatchScore(target: string, query: string): number {
  if (!query) return 1.0;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();

  if (t === q) return 1.0;
  if (t.includes(q)) return 0.9;

  // Let's use a simpler approach for the score
  const distance = levenshteinDistance(q, t);
  const maxLen = Math.max(q.length, t.length);
  
  // if target is a phrase (title), distance to the full title is high.
  // better to check distance against each word and take the best.
  const targetWords = t.split(/\s+/);
  let bestScore = 0;

  for (const tw of targetWords) {
    const d = levenshteinDistance(q, tw);
    const score = Math.max(0, 1 - d / Math.max(q.length, tw.length));
    if (score > bestScore) bestScore = score;
  }

  return bestScore;
}
