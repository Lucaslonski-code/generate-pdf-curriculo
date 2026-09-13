import { EntryBlock, SectionContent } from './types';

const BULLET_PATTERN = /^[-•*–]\s*/;
const STACK_LABEL_PATTERN = /^(stack|stacks|tecnologias?|tech stack|tecnologias utilizadas|ferramentas)\s*[:：]/i;
// A project title must start with "Projeto" followed by a number, colon or dash.
// This avoids matching prose like "Projeto em parceria com ...".
const PROJECT_TITLE_PATTERN = /^projeto\s+(\d+|[:\-—-])/i;
const DATE_HINT_PATTERN = /\d{4}|atual|presente|current|hoje|now/i;
const MAX_META_LINE_LENGTH = 80;

function stripBullet(line: string): string {
  return line.trim().replace(BULLET_PATTERN, '').trim();
}

/** True when a line carries a technology/stack label (e.g. "Stack: React, Node"). */
export function isStackLine(line: string): boolean {
  const stripped = stripBullet(line);
  return stripped !== '' && STACK_LABEL_PATTERN.test(stripped);
}

/** True when a line is an explicit project title (e.g. "PROJETO 1", "Projeto: App X"). */
export function isProjectTitleLine(line: string): boolean {
  const stripped = stripBullet(line);
  if (!stripped) return false;
  return PROJECT_TITLE_PATTERN.test(stripped);
}

function isMetaLine(line: string): boolean {
  return (
    line !== '' &&
    !BULLET_PATTERN.test(line) &&
    DATE_HINT_PATTERN.test(line) &&
    line.length <= MAX_META_LINE_LENGTH
  );
}

/**
 * Splits lines into project blocks. A new block starts at every project
 * title line, so projects stay separate units even when the source has no
 * blank lines between them (which is what happened with AI-generated
 * scripts that packed project 1, stack and description on consecutive
 * lines).
 */
export function splitProjectBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];

  const flush = (): void => {
    const trimmed = current.map((line) => line.trim()).filter((line) => line !== '');
    if (trimmed.length > 0) blocks.push(trimmed);
    current = [];
  };

  for (const line of lines) {
    if (line.trim() === '') {
      flush();
      continue;
    }
    if (isProjectTitleLine(line)) {
      flush();
    }
    current.push(line);
  }
  flush();

  return blocks;
}

/**
 * Builds a single project entry from a block of lines, keeping the source
 * order: title, optional date/meta, optional stack, then description
 * paragraphs and bullets. The stack line is never merged into the
 * description, so the parent/child relationship title -> stack ->
 * description survives into the parsed model.
 */
export function buildProjectEntry(blockLines: string[]): EntryBlock {
  const lines = blockLines.map((line) => line.trim()).filter((line) => line !== '');
  if (lines.length === 0) return { title: '', description: [], bullets: [] };

  const title = stripBullet(lines[0]);
  let index = 1;

  let meta: string | undefined;
  if (isMetaLine(lines[index] ?? '')) {
    meta = lines[index].trim();
    index += 1;
  }

  let stack: string | undefined;
  if (isStackLine(lines[index] ?? '')) {
    stack = lines[index].trim();
    index += 1;
  }

  const description: string[] = [];
  const bullets: string[] = [];
  for (const line of lines.slice(index)) {
    if (BULLET_PATTERN.test(line)) bullets.push(stripBullet(line));
    else description.push(line);
  }

  return { title, meta, stack, description, bullets };
}

/** True when the lines form one or more structured project blocks. */
export function looksLikeProjects(lines: string[]): boolean {
  const blocks = splitProjectBlocks(lines);
  if (blocks.length === 0) return false;

  const titleCount = lines.filter(isProjectTitleLine).length;
  const stackCount = lines.filter(isStackLine).length;

  return titleCount >= 1 && stackCount >= 1;
}

/** Builds an explicit projects section, preserving each project as a unit. */
export function buildProjectsContent(lines: string[]): SectionContent {
  const entries = splitProjectBlocks(lines).map(buildProjectEntry);
  return { kind: 'entries', entries };
}