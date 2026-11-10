/**
 * Pure helper shared by the Reading Time plugin's server filter and builder block.
 */

export function estimateReadingTimeMinutes(
  htmlOrText: string,
  wordsPerMinute = 200
): { minutes: number; words: number; label: string } {
  const plain = htmlOrText
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = plain ? plain.split(' ').length : 0;
  const wpm = wordsPerMinute > 0 ? wordsPerMinute : 200;
  const minutes = Math.max(1, Math.ceil(words / wpm));
  const label = `${minutes} min read`;
  return { minutes, words, label };
}
