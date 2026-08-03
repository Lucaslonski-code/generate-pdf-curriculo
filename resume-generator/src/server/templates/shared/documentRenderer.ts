import { ParsedResume } from '../../parser/types';
import { escapeHtml } from '../../utils/escapeHtml';
import { loadTemplateCss } from '../../utils/loadCss';
import { renderSection } from './sectionRenderers';
import { renderContactRow } from './contactRow';

/**
 * Renders the shared document skeleton (header + sections) for a given
 * template id. All four templates reuse this exact HTML; every visual
 * difference between them lives exclusively in their `template.css` file
 * (see public/templates/<id>/template.css). This avoids duplicating
 * markup four times while still giving each template its own renderer
 * entry point (templates/<id>/renderer.ts) for the day one of them needs
 * a genuinely different structure.
 */
export function renderResumeDocument(resume: ParsedResume, templateId: string): string {
  const css = loadTemplateCss(templateId);
  const roleHtml = resume.role ? `<p class="role">${escapeHtml(resume.role)}</p>` : '';
  const contactHtml = renderContactRow(resume.contact);
  const sectionsHtml = resume.sections.map(renderSection).join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(resume.name)}</title>
  <style>${css}</style>
</head>
<body>
  <header class="header">
    <h1 class="name">${escapeHtml(resume.name)}</h1>
    ${roleHtml}
    ${contactHtml}
  </header>
  <main class="content">
    ${sectionsHtml}
  </main>
</body>
</html>`;
}
