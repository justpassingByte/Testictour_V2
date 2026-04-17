/**
 * Fisher-Yates (Knuth) shuffle — produces uniformly random permutations.
 * O(n) time, does NOT mutate the original array.
 *
 * Replaces the biased `.sort(() => Math.random() - 0.5)` pattern
 * used in lobby assignment and player shuffling.
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
