/**
 * CSS for the minimal template, embedded as a TS module instead of a
 * standalone .css file read from disk. Serverless Functions bundle their
 * dependency graph via static analysis of imports; a runtime fs.readFileSync
 * call (the previous approach) is invisible to that analysis and silently
 * missing from the deployed bundle. A plain import is always included
 * correctly, in every environment (local, Vercel, or otherwise), with no
 * reliance on process.cwd(), outputDirectory, or includeFiles.
 */
export const templateCss = `
/* Minimal — quiet, airy, typography-led. No boxes, no icons, no color. */

.header {
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-1);
}

.name {
  margin: 0 0 4px 0;
  font-family: var(--font-sans);
  font-size: var(--size-name);
  font-weight: 300;
  letter-spacing: 0.6px;
  color: var(--color-ink);
}

.role {
  margin: 0 0 var(--space-2) 0;
  font-size: 10.5pt;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--color-muted);
}

.contact-row {
  color: var(--color-muted);
  font-size: var(--size-meta);
}

.contact-icon {
  display: none;
}

.contact-item:not(:last-child)::after {
  content: '·';
  margin-left: var(--space-4);
  color: var(--color-muted);
}

.section-title {
  margin: 0 0 var(--space-2) 0;
  font-size: 9.5pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-muted);
}

.entry-title {
  font-weight: 600;
  font-size: 10.5pt;
  color: var(--color-ink);
}

.entry-meta {
  font-size: var(--size-meta);
  color: var(--color-muted);
}

.tag-list li {
  font-size: 9.5pt;
  color: var(--color-body);
  padding: 0;
  background: none;
  border: none;
}

.tag-list li:not(:last-child)::after {
  content: ',';
  margin-right: 4px;
}
`;
