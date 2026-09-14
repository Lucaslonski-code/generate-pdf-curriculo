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

function renderSkillsContent(entries: EntryBlock[]): string {
  const items = entries.map((entry) => {
    const title = escapeHtml(entry.title);
    const desc = entry.description.map(escapeHtml).join(', ');
    return `<dt class="skill-category">${title}</dt><dd class="skill-technologies">${desc}</dd>`;
  }).join('\n');
  return `<dl class="skills-list">${items}</dl>`;
}

function renderEntry(entry: EntryBlock): string {
  const metaHtml = entry.meta ? `<span class="entry-meta">${escapeHtml(entry.meta)}</span>` : '';
  const stackHtml = entry.stack ? `<p class="entry-stack">${escapeHtml(entry.stack)}</p>` : '';

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
    ${stackHtml}
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
      if (section.type === 'skills') {
        return renderSkillsContent(section.content.entries);
      }
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
