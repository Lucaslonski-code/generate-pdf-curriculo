import { EntryBlock, SectionContent } from './types';

const BULLET_PATTERN = /^[-•*–]\s*/;
const STACK_LABEL_PATTERN = /^(stack|stacks|tecnologias?|tech stack|tecnologias utilizadas|ferramentas)\s*[:：]/i;
const ATUACAO_LABEL_PATTERN = /^(atua[cç][aã]o|atuacao|descricao|descri[cç][aã]o|descricao|description|responsabilidades?|realiza[cç][oõ]es?)\s*[:：]/i;
// A project title must start with "Projeto" followed by a number, colon or dash.
 // This avoids matching prose like "Projeto em parceria com ...".
 // \s* allows "Projeto:App" (no space) and "Projeto 1" (space + digit).
 const PROJECT_TITLE_PATTERN = /^projeto\s*(\d+|[:\-—-])/i;
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

/** True when a stripped line looks like an "Atuação:" / "Descrição:" label. */
function isAtuacaoLine(strippedLine: string): boolean {
  return strippedLine !== '' && ATUACAO_LABEL_PATTERN.test(strippedLine);
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
 * Splits lines into project blocks. A new block starts at:
 * 1. Blank line
 * 2. Explicit project title line ("Projeto N", "Projeto: X")
 * 3. A "bare title" line followed by a stack line (lookahead) — handles
 *    AI-generated resumes like "Auronyx Backend\n* Stack: ...\n* Atuação: ...\nSimula-IA\n* Stack: ..."
 *    without blank lines or "Projeto N" prefixes.
 */
export function splitProjectBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];

  const flush = (): void => {
    const trimmed = current.map((line) => line.trim()).filter((line) => line !== '');
    if (trimmed.length > 0) blocks.push(trimmed);
    current = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      flush();
      continue;
    }

    // Explicit project title ("Projeto N", "Projeto: X") always starts a new block
    if (isProjectTitleLine(line)) {
      flush();
      current.push(line);
      continue;
    }

    // Lookahead: if this line is a non-bullet, non-stack, non-meta "title-like" line
    // and the NEXT non-empty line is a stack line, treat as project boundary
    const stripped = stripBullet(line);
    const isBullet = BULLET_PATTERN.test(trimmed);
    const isStack = isStackLine(line);
    const isMeta = isMetaLine(line);

    if (!isBullet && !isStack && !isMeta && stripped !== '') {
      // Find next non-empty line
      let nextIdx = i + 1;
      while (nextIdx < lines.length && lines[nextIdx].trim() === '') {
        nextIdx++;
      }
      if (nextIdx < lines.length && isStackLine(lines[nextIdx])) {
        flush();
      }
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
    stack = stripBullet(lines[index]);
    index += 1;
  }

  const description: string[] = [];
  const bullets: string[] = [];
  for (const line of lines.slice(index)) {
    const stripped = stripBullet(line);
    // Treat "Atuação: ..." / "Descrição: ..." lines as description, not bullets,
    // even when they start with a bullet marker in the source (e.g. "* Atuação: ...").
    if (BULLET_PATTERN.test(line) && !isAtuacaoLine(stripped)) {
      bullets.push(stripped);
    } else {
      description.push(stripped);
    }
  }

  return { title, meta, stack, description, bullets };
}

/** True when the lines form one or more structured project blocks. */
export function looksLikeProjects(lines: string[]): boolean {
  const blocks = splitProjectBlocks(lines);
  if (blocks.length === 0) return false;

  // A block is project-like if it contains a stack line (e.g. "Stack: ...").
  // This works for both explicit "Projeto N" titles and bare project names
  // separated by blank lines, which is the common format in AI-generated resumes.
  const hasStackLine = blocks.some((block) =>
    block.some((line) => isStackLine(line))
  );

  return hasStackLine;
}

/** Builds an explicit projects section, preserving each project as a unit. */
export function buildProjectsContent(lines: string[]): SectionContent {
  const entries = splitProjectBlocks(lines).map(buildProjectEntry);
  return { kind: 'entries', entries };
}