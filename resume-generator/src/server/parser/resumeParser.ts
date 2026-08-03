import { ContactInfo, ParsedResume, ResumeSection, SectionType } from './types';
import { matchSectionType, DEFAULT_SECTION_TITLES } from './sectionDictionary';
import { buildSectionContent } from './contentBuilders';
import { isContactLine, parseContactLine } from './contactParser';

const MAX_ROLE_WORD_COUNT = 8;
const MAX_ROLE_LENGTH = 70;

function trimBlankEdges(lines: string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[0].trim() === '') result.shift();
  while (result.length > 0 && result[result.length - 1].trim() === '') result.pop();
  return result;
}

function splitLines(rawText: string): string[] {
  return trimBlankEdges(rawText.replace(/\r\n/g, '\n').split('\n'));
}

/**
 * A line right after the name is treated as a professional title/role
 * (e.g. "Desenvolvedor Full Stack Sênior") when it's short, isn't a
 * recognized section heading, and doesn't look like contact info.
 */
function looksLikeRole(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > MAX_ROLE_LENGTH) return false;
  if (matchSectionType(trimmed)) return false;
  if (isContactLine(trimmed)) return false;
  return trimmed.split(/\s+/).length <= MAX_ROLE_WORD_COUNT;
}

interface RawSection {
  type: SectionType;
  lines: string[];
}

/** Consumes the name, optional role and optional contact line from the top of the resume. */
function parseHeader(lines: string[]): { name: string; role?: string; contact: ContactInfo; cursor: number } {
  let cursor = 0;
  const name = lines[cursor]?.trim() ?? '';
  cursor++;

  let role: string | undefined;
  let contact: ContactInfo = {};

  const nextLine = lines[cursor];
  if (nextLine !== undefined) {
    if (isContactLine(nextLine)) {
      contact = parseContactLine(nextLine);
      cursor++;
    } else if (looksLikeRole(nextLine)) {
      role = nextLine.trim();
      cursor++;
      const lineAfterRole = lines[cursor];
      if (lineAfterRole !== undefined && isContactLine(lineAfterRole)) {
        contact = parseContactLine(lineAfterRole);
        cursor++;
      }
    }
  }

  return { name, role, contact, cursor };
}

/** Groups the remaining lines into raw sections based on recognized headings. */
function splitIntoRawSections(lines: string[]): { rawSections: RawSection[]; introLines: string[] } {
  const rawSections: RawSection[] = [];
  const introLines: string[] = [];
  let current: RawSection | null = null;

  for (const line of lines) {
    const matchedType = matchSectionType(line);

    if (matchedType) {
      if (current) rawSections.push(current);
      current = { type: matchedType, lines: [] };
      continue;
    }

    if (current) {
      current.lines.push(line);
    } else {
      introLines.push(line);
    }
  }
  if (current) rawSections.push(current);

  return { rawSections, introLines };
}

function parseResumeUnsafe(rawText: string): ParsedResume {
  const lines = splitLines(rawText);

  if (lines.length === 0) {
    return { name: 'Currículo', contact: {}, sections: [] };
  }

  const { name, role, contact, cursor } = parseHeader(lines);
  const { rawSections, introLines } = splitIntoRawSections(lines.slice(cursor));

  const sections: ResumeSection[] = rawSections.map((raw) => ({
    type: raw.type,
    title: DEFAULT_SECTION_TITLES[raw.type],
    content: buildSectionContent(raw.type, trimBlankEdges(raw.lines)),
  }));

  const trimmedIntro = trimBlankEdges(introLines);
  const hasSummary = sections.some((section) => section.type === 'summary');

  if (trimmedIntro.length > 0 && !hasSummary) {
    sections.unshift({
      type: 'summary',
      title: DEFAULT_SECTION_TITLES.summary,
      content: buildSectionContent('summary', trimmedIntro),
    });
  }

  return { name, role, contact, sections };
}

/** Minimal, always-succeeds fallback used if parsing throws for any reason. */
function buildFallbackResume(rawText: string): ParsedResume {
  const lines = splitLines(rawText);
  const name = lines[0]?.trim() || 'Currículo';
  const body = lines.slice(1).join(' ').trim();

  return {
    name,
    contact: {},
    sections: body
      ? [
          {
            type: 'summary',
            title: DEFAULT_SECTION_TITLES.summary,
            content: { kind: 'text', paragraphs: [body] },
          },
        ]
      : [],
  };
}

/**
 * Parses raw resume text (as produced by an AI assistant) into a
 * structured representation. Never throws: any unexpected input falls
 * back to a minimal, still-renderable resume instead of failing the
 * whole PDF generation flow.
 */
export function parseResume(rawText: string): ParsedResume {
  try {
    return parseResumeUnsafe(rawText);
  } catch (error) {
    console.error('Falha ao interpretar o currículo, aplicando fallback seguro:', error);
    return buildFallbackResume(rawText);
  }
}
