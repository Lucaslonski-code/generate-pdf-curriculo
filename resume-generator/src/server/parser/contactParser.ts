import { ContactInfo } from './types';

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const LINKEDIN_PATTERN = /linkedin\.com\/\S+/i;
const GITHUB_PATTERN = /github\.com\/\S+/i;
const URL_PATTERN = /(https?:\/\/\S+|www\.\S+)/i;
// Requires at least 8 digit-ish characters so short numbers (e.g. a year) never match.
const PHONE_PATTERN = /(\+?\d[\d\s().-]{7,}\d)/;

/**
 * A line qualifies as "contact info" if it contains at least one
 * recognizable channel (email, phone, URL) or uses a typical separator
 * between multiple contact items.
 */
export function isContactLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return (
    EMAIL_PATTERN.test(trimmed) ||
    LINKEDIN_PATTERN.test(trimmed) ||
    GITHUB_PATTERN.test(trimmed) ||
    URL_PATTERN.test(trimmed) ||
    PHONE_PATTERN.test(trimmed) ||
    trimmed.includes('|') ||
    trimmed.includes('•')
  );
}

function classifyToken(token: string, contact: ContactInfo): void {
  const trimmed = token.trim();
  if (!trimmed) return;

  if (!contact.email && EMAIL_PATTERN.test(trimmed)) {
    contact.email = trimmed.match(EMAIL_PATTERN)?.[0] ?? trimmed;
    return;
  }
  if (!contact.linkedin && LINKEDIN_PATTERN.test(trimmed)) {
    contact.linkedin = trimmed;
    return;
  }
  if (!contact.github && GITHUB_PATTERN.test(trimmed)) {
    contact.github = trimmed;
    return;
  }
  if (!contact.website && URL_PATTERN.test(trimmed)) {
    contact.website = trimmed;
    return;
  }
  if (!contact.phone && PHONE_PATTERN.test(trimmed)) {
    contact.phone = trimmed;
    return;
  }
  if (!contact.location) {
    contact.location = trimmed;
  }
}

/**
 * Splits a contact line into tokens (by "|", "•" or comma, in that order
 * of preference) and classifies each token into a ContactInfo field.
 */
export function parseContactLine(line: string): ContactInfo {
  const pipeOrDot = line.split(/[|•]/).map((part) => part.trim()).filter(Boolean);
  const tokens =
    pipeOrDot.length > 1 ? pipeOrDot : line.split(/,\s*/).map((part) => part.trim()).filter(Boolean);

  const contact: ContactInfo = {};
  for (const token of tokens.length > 0 ? tokens : [line]) {
    classifyToken(token, contact);
  }
  return contact;
}
