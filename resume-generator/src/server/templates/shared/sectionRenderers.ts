import { EntryBlock, ResumeSection } from '../../parser/types';
import { escapeHtml } from '../../utils/escapeHtml';

function renderTextContent(paragraphs: string[]): string {
  return paragraphs
    .map((paragraph) => `<p class="paragraph">${escapeHtml(paragraph)}</p>`)
    .join('\n');
}

function renderListContent(items: string[]): string {
  const listItems = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `<ul class="tag-list">${listItems}</ul>`;
}

function renderEntry(entry: EntryBlock): string {
  const metaHtml = entry.meta ? `<span class="entry-meta">${escapeHtml(entry.meta)}</span>` : '';

  const descriptionHtml = entry.description
    .map((line) => `<p class="entry-description">${escapeHtml(line)}</p>`)
    .join('\n');

  const bulletsHtml =
    entry.bullets.length > 0
      ? `<ul class="entry-bullets">${entry.bullets
          .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
          .join('')}</ul>`
      : '';

  return `<article class="entry">
    <div class="entry-header">
      <span class="entry-title">${escapeHtml(entry.title)}</span>
      ${metaHtml}
    </div>
    ${descriptionHtml}
    ${bulletsHtml}
  </article>`;
}

function renderEntriesContent(entries: EntryBlock[]): string {
  return entries.map(renderEntry).join('\n');
}

function renderSectionContent(section: ResumeSection): string {
  switch (section.content.kind) {
    case 'text':
      return renderTextContent(section.content.paragraphs);
    case 'list':
      return renderListContent(section.content.items);
    case 'entries':
      return renderEntriesContent(section.content.entries);
  }
}

/** Renders a full section, including its heading. */
export function renderSection(section: ResumeSection): string {
  return `<section class="section">
    <h2 class="section-title">${escapeHtml(section.title)}</h2>
    <div class="section-body">
      ${renderSectionContent(section)}
    </div>
  </section>`;
}
