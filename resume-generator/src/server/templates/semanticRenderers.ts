import { StructuredResume, Header, Summary, ProjectsSection, ExperienceSection, EducationSection, SkillsSection } from '../parser/semanticTypes';
import { escapeHtml } from '../utils/escapeHtml';

function renderHeader(header: Header): string {
  const roleHtml = header.role ? `<p class="role">${escapeHtml(header.role)}</p>` : '';
  const contactParts: string[] = [];
  
  if (header.contact.email) contactParts.push(`<span class="contact-item"><span class="contact-icon">📧</span>${escapeHtml(header.contact.email)}</span>`);
  if (header.contact.phone) contactParts.push(`<span class="contact-item"><span class="contact-icon">📞</span>${escapeHtml(header.contact.phone)}</span>`);
  if (header.contact.linkedin) contactParts.push(`<span class="contact-item"><span class="contact-icon">💼</span>${escapeHtml(header.contact.linkedin)}</span>`);
  if (header.contact.github) contactParts.push(`<span class="contact-item"><span class="contact-icon">💻</span>${escapeHtml(header.contact.github)}</span>`);
  if (header.contact.website) contactParts.push(`<span class="contact-item"><span class="contact-icon">🌐</span>${escapeHtml(header.contact.website)}</span>`);
  if (header.contact.location) contactParts.push(`<span class="contact-item"><span class="contact-icon">📍</span>${escapeHtml(header.contact.location)}</span>`);
  
  const contactHtml = contactParts.length > 0 ? `<div class="contact-row">${contactParts.join('')}</div>` : '';
  
  return `
    <header class="header">
      <h1 class="name">${escapeHtml(header.name)}</h1>
      ${roleHtml}
      ${contactHtml}
    </header>
  `;
}

function renderSummary(summary: Summary): string {
  const paragraphs = summary.text.split('\n').filter(p => p.trim()).map(p => `<p class="paragraph">${escapeHtml(p.trim())}</p>`);
  return `
    <section class="section">
      <h2 class="section-title">Resumo Profissional</h2>
      <div class="section-body">
        ${paragraphs.join('\n')}
      </div>
    </section>
  `;
}

function renderProject(project: { name: string; stack?: string; description?: string }): string {
  const stackHtml = project.stack ? `<p class="entry-stack">${escapeHtml(project.stack)}</p>` : '';
  const descHtml = project.description ? `<p class="entry-description">${escapeHtml(project.description)}</p>` : '';
  
  return `
    <article class="entry">
      <div class="entry-header">
        <span class="entry-title">${escapeHtml(project.name)}</span>
      </div>
      ${stackHtml}
      ${descHtml}
    </article>
  `;
}

function renderProjects(projectsSection: ProjectsSection): string {
  const projectsHtml = projectsSection.projects.map(renderProject).join('\n');
  return `
    <section class="section">
      <h2 class="section-title">Projetos</h2>
      <div class="section-body">
        ${projectsHtml}
      </div>
    </section>
  `;
}

function renderJob(job: { title: string; company?: string; period?: string; description?: string; bullets: string[] }): string {
  const metaParts: string[] = [];
  if (job.company) metaParts.push(escapeHtml(job.company));
  if (job.period) metaParts.push(escapeHtml(job.period));
  const metaHtml = metaParts.length > 0 ? `<span class="entry-meta">${metaParts.join(' — ')}</span>` : '';
  
  const descHtml = job.description ? `<p class="entry-description">${escapeHtml(job.description)}</p>` : '';
  const bulletsHtml = job.bullets.length > 0
    ? `<ul class="entry-bullets">${job.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
    : '';
  
  return `
    <article class="entry">
      <div class="entry-header">
        <span class="entry-title">${escapeHtml(job.title)}</span>
        ${metaHtml}
      </div>
      ${descHtml}
      ${bulletsHtml}
    </article>
  `;
}

function renderExperience(experienceSection: ExperienceSection): string {
  const jobsHtml = experienceSection.jobs.map(renderJob).join('\n');
  return `
    <section class="section">
      <h2 class="section-title">Experiência Profissional</h2>
      <div class="section-body">
        ${jobsHtml}
      </div>
    </section>
  `;
}

function renderDegree(degree: { institution: string; course: string; period?: string }): string {
  const title = degree.course && degree.institution
    ? `${escapeHtml(degree.course)} | ${escapeHtml(degree.institution)}`
    : escapeHtml(degree.course || degree.institution);
  const metaHtml = degree.period ? `<span class="entry-meta">${escapeHtml(degree.period)}</span>` : '';
  
  return `
    <article class="entry">
      <div class="entry-header">
        <span class="entry-title">${title}</span>
        ${metaHtml}
      </div>
    </article>
  `;
}

function renderEducation(educationSection: EducationSection): string {
  const degreesHtml = educationSection.degrees.map(renderDegree).join('\n');
  return `
    <section class="section">
      <h2 class="section-title">Formação Acadêmica</h2>
      <div class="section-body">
        ${degreesHtml}
      </div>
    </section>
  `;
}

function renderSkillCategory(category: { name: string; technologies: string }): string {
  return `
    <div class="skill-category-block">
      <dt class="skill-category">${escapeHtml(category.name)}</dt>
      <dd class="skill-technologies">${escapeHtml(category.technologies)}</dd>
    </div>
  `;
}

function renderSkills(skillsSection: SkillsSection): string {
  const categoriesHtml = skillsSection.categories.map(renderSkillCategory).join('\n');
  return `
    <section class="section">
      <h2 class="section-title">Competências Técnicas</h2>
      <div class="section-body">
        <dl class="skills-list">${categoriesHtml}</dl>
      </div>
    </section>
  `;
}

function renderListSection(title: string, items: string[]): string {
  const itemsHtml = items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  return `
    <section class="section">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      <div class="section-body">
        <ul class="tag-list">${itemsHtml}</ul>
      </div>
    </section>
  `;
}

export function renderResume(resume: StructuredResume): string {
  let headerHtml = '';
  const sectionsHtml: string[] = [];
  
  for (const section of resume.sections) {
    switch (section.type) {
      case 'header':
        headerHtml = renderHeader(section.data);
        break;
      case 'summary':
        sectionsHtml.push(renderSummary(section.data));
        break;
      case 'projects':
        sectionsHtml.push(renderProjects(section.data));
        break;
      case 'experience':
        sectionsHtml.push(renderExperience(section.data));
        break;
      case 'education':
        sectionsHtml.push(renderEducation(section.data));
        break;
      case 'skills':
        sectionsHtml.push(renderSkills(section.data));
        break;
      case 'certifications':
        sectionsHtml.push(renderListSection('Certificações', section.data.items));
        break;
      case 'languages':
        sectionsHtml.push(renderListSection('Idiomas', section.data.items));
        break;
    }
  }
  
  const headerSection = resume.sections.find(s => s.type === 'header');
  const title = headerSection && headerSection.type === 'header' ? headerSection.data.name : 'Currículo';
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(title)}</title>
      <style>${loadTemplateCss()}</style>
    </head>
    <body>
      ${headerHtml}
      <main class="content">
        ${sectionsHtml.join('\n')}
      </main>
    </body>
    </html>
  `;
}

function loadTemplateCss(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

:root {
  --color-ink: #1a1d23;
  --color-body: #2b2f38;
  --color-muted: #6b7280;
  --color-border: #e2e4e9;
  --color-border-strong: #cdd1d9;
  --color-surface: #f6f7f9;
  --color-accent: #2d5be3;
  --font-sans: 'Inter', 'Manrope', 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --radius-sm: 4px;
  --border-hairline: 1px solid var(--color-border);
  --size-name: 24pt;
  --size-role: 12pt;
  --size-section-title: 10.5pt;
  --size-body: 10.5pt;
  --size-meta: 9pt;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--font-sans);
  font-size: var(--size-body);
  line-height: 1.55;
  color: var(--color-body);
  -webkit-font-smoothing: antialiased;
}

.content > * + * { margin-top: var(--space-5); }
.section-body > * + * { margin-top: var(--space-3); }

.paragraph { margin: 0; text-align: justify; }

.tag-list {
  margin: 0; padding: 0; list-style: none;
  display: flex; flex-wrap: wrap; row-gap: var(--space-2); column-gap: var(--space-3);
}

.entry-header {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: var(--space-3); margin-bottom: 3px;
}

.entry-stack { margin: 2px 0; font-size: var(--size-meta); font-weight: 600; color: var(--color-accent); }
.entry-description { margin: 2px 0; text-align: justify; }
.entry-bullets { margin: var(--space-1) 0 0 0; padding-left: 18px; }
.entry-bullets li { margin-bottom: 2px; }

.skills-list { margin: 0; padding: 0; }
.skill-category-block { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-2) var(--space-4); margin-bottom: var(--space-2); }
.skill-category { font-weight: 600; color: var(--color-ink); white-space: nowrap; }
.skill-technologies { margin: 0; color: var(--color-body); }

.contact-row { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); }
.contact-item { display: inline-flex; align-items: center; gap: 5px; }
.contact-icon { display: inline-flex; }

.section, .entry {
  display: block;
  break-inside: avoid;
  page-break-inside: avoid;
  contain: layout paint;
  overflow-wrap: anywhere;
}

.header {
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-2);
  border-bottom: 2px solid var(--color-ink);
}
.name { margin: 0 0 2px 0; font-family: var(--font-sans); font-size: var(--size-name); font-weight: 700; letter-spacing: -0.2px; color: var(--color-ink); }
.role { margin: 0 0 var(--space-2) 0; font-size: var(--size-role); font-weight: 500; color: var(--color-accent); }
.contact-row { color: var(--color-muted); font-size: var(--size-meta); }
.contact-icon { color: var(--color-accent); }

.section-title {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--size-section-title);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.1px;
  color: var(--color-ink);
  padding-bottom: 3px;
  border-bottom: var(--border-hairline);
}

.entry-title { font-weight: 700; font-size: 11pt; color: var(--color-ink); }
.entry-meta { font-size: var(--size-meta); color: var(--color-muted); white-space: nowrap; }
.tag-list li { font-size: 9.5pt; color: var(--color-ink); background: var(--color-surface); border: var(--border-hairline); border-radius: var(--radius-sm); padding: 3px 10px; }
  `;
}