/**
 * CSS for the modern template, embedded as a TS module instead of a
 * standalone .css file read from disk. Serverless Functions bundle their
 * dependency graph via static analysis of imports; a runtime fs.readFileSync
 * call (the previous approach) is invisible to that analysis and silently
 * missing from the deployed bundle. A plain import is always included
 * correctly, in every environment (local, Vercel, or otherwise), with no
 * reliance on process.cwd(), outputDirectory, or includeFiles.
 */
export const templateCss = `
/* Modern — the default. Confident but understated, with a single accent color. */

.header {
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-2);
  border-bottom: 2px solid var(--color-ink);
}

.name {
  margin: 0 0 2px 0;
  font-family: var(--font-sans);
  font-size: var(--size-name);
  font-weight: 700;
  letter-spacing: -0.2px;
  color: var(--color-ink);
}

.role {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--size-role);
  font-weight: 500;
  color: var(--color-accent);
}

.contact-row {
  color: var(--color-muted);
  font-size: var(--size-meta);
}

.contact-icon {
  color: var(--color-accent);
}

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

.entry-title {
  font-weight: 700;
  font-size: 11pt;
  color: var(--color-ink);
}

.entry-meta {
  font-size: var(--size-meta);
  color: var(--color-muted);
  white-space: nowrap;
}

.tag-list li {
  font-size: 9.5pt;
  color: var(--color-ink);
  background: var(--color-surface);
  border: var(--border-hairline);
  border-radius: var(--radius-sm);
  padding: 3px 10px;
}
`;
