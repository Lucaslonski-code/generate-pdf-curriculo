/**
 * Normalizes a line of text so it can be compared against the section
 * dictionary regardless of accents, casing, trailing punctuation or
 * extra whitespace. This is what makes the parser tolerant to small
 * variations such as "Formação" vs "FORMACAO:" vs "formacao academica".
 */
export function normalizeHeading(line: string): string {
  return line
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[:：]+$/, '')
    .replace(/\s+/g, ' ');
}
