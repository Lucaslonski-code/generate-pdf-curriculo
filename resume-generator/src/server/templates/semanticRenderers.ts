import { StructuredResume, Header, Summary, ProjectsSection, ExperienceSection, EducationSection, SkillsSection, CertificationsSection, LanguagesSection, Certification, Language } from '../parser/semanticTypes';
import { escapeHtml } from '../utils/escapeHtml';

function renderHeader(header: Header): string {
  const roleHtml = header.role ? `<p class="role">${escapeHtml(header.role)}</p>` : '';
  const contactParts: string[] = [];

  if (header.email) contactParts.push(`<span class="contact-item"><span class="contact-icon">📧</span>${escapeHtml(header.email)}</span>`);
  if (header.phone) contactParts.push(`<span class="contact-item"><span class="contact-icon">📞</span>${escapeHtml(header.phone)}</span>`);
  if (header.linkedin) contactParts.push(`<span class="contact-item"><span class="contact-icon">💼</span>${escapeHtml(header.linkedin)}</span>`);
  if (header.github) contactParts.push(`<span class="contact-item"><span class="contact-icon">💻</span>${escapeHtml(header.github)}</span>`);
  if (header.website) contactParts.push(`<span class="contact-item"><span class="contact-icon">🌐</span>${escapeHtml(header.website)}</span>`);
  if (header.location) contactParts.push(`<span class="contact-item"><span class="contact-icon">📍</span>${escapeHtml(header.location)}</span>`);

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

function renderJob(job: { title: string; company?: string; period?: string; description?: string; bullets?: string[] }): string {
  const metaParts: string[] = [];
  if (job.company) metaParts.push(escapeHtml(job.company));
  if (job.period) metaParts.push(escapeHtml(job.period));
  const metaHtml = metaParts.length > 0 ? `<span class="entry-meta">${metaParts.join(' — ')}</span>` : '';

  const descHtml = job.description ? `<p class="entry-description">${escapeHtml(job.description)}</p>` : '';
  const bulletsHtml = job.bullets && job.bullets.length > 0
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

function renderDegree(degree: { course?: string; institution?: string; period?: string }): string {
  let title = '';
  if (degree.course && degree.institution) {
    title = `${escapeHtml(degree.course)} | ${escapeHtml(degree.institution)}`;
  } else if (degree.course) {
    title = escapeHtml(degree.course);
  } else if (degree.institution) {
    title = escapeHtml(degree.institution);
  }
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

function renderSkillCategory(category: { name: string; technologies?: string }): string {
  const techHtml = category.technologies ? `<dd class="skill-technologies">${escapeHtml(category.technologies)}</dd>` : '<dd class="skill-technologies"></dd>';
  return `
    <div class="skill-category-block">
      <dt class="skill-category">${escapeHtml(category.name)}</dt>
      ${techHtml}
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

function renderCertification(cert: Certification): string {
  const issuerHtml = cert.issuer ? `<span class="cert-issuer">${escapeHtml(cert.issuer)}</span>` : '';
  const yearHtml = cert.year ? `<span class="cert-year">${escapeHtml(cert.year)}</span>` : '';
  const metaParts = [issuerHtml, yearHtml].filter(Boolean).join(' — ');
  const metaHtml = metaParts ? `<span class="entry-meta">${metaParts}</span>` : '';

  return `
    <article class="entry">
      <div class="entry-header">
        <span class="entry-title">${escapeHtml(cert.name)}</span>
        ${metaHtml}
      </div>
    </article>
  `;
}

function renderCertifications(certificationsSection: CertificationsSection): string {
  const certsHtml = certificationsSection.certifications.map(renderCertification).join('\n');
  return `
    <section class="section">
      <h2 class="section-title">Certificações</h2>
      <div class="section-body">
        ${certsHtml}
      </div>
    </section>
  `;
}

function renderLanguage(lang: Language): string {
  const profHtml = lang.proficiency ? `<span class="entry-meta">${escapeHtml(lang.proficiency)}</span>` : '';

  return `
    <article class="entry">
      <div class="entry-header">
        <span class="entry-title">${escapeHtml(lang.name)}</span>
        ${profHtml}
      </div>
    </article>
  `;
}

function renderLanguages(languagesSection: LanguagesSection): string {
  const langsHtml = languagesSection.languages.map(renderLanguage).join('\n');
  return `
    <section class="section">
      <h2 class="section-title">Idiomas</h2>
      <div class="section-body">
        ${langsHtml}
      </div>
    </section>
  `;
}

export function renderResume(resume: StructuredResume): string {
  const sectionsHtml: string[] = [];
  let title = 'Currículo';

  for (const section of resume.sections) {
    switch (section.type) {
      case 'header':
        sectionsHtml.push(renderHeader(section.data));
        if (title === 'Currículo') {
          title = section.data.name;
        }
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
        sectionsHtml.push(renderCertifications(section.data));
        break;
      case 'languages':
        sectionsHtml.push(renderLanguages(section.data));
        break;
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(title)}</title>
      <style>${loadTemplateCss()}</style>
    </head>
    <body>
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
  `;
}