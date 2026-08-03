import fs from 'fs';
import path from 'path';

const cache = new Map<string, string>();

/** Loads and caches a CSS file located under public/, given a path relative to it. */
export function loadPublicCss(relativePath: string): string {
  if (!cache.has(relativePath)) {
    const fullPath = path.join(process.cwd(), 'public', relativePath);
    cache.set(relativePath, fs.readFileSync(fullPath, 'utf-8'));
  }
  return cache.get(relativePath) as string;
}

/**
 * Loads the combined CSS for a resume template: shared design tokens
 * first, then the template's own rules (which may override tokens).
 */
export function loadTemplateCss(templateId: string): string {
  const tokens = loadPublicCss('templates/shared/tokens.css');
  const templateCss = loadPublicCss(`templates/${templateId}/template.css`);
  return `${tokens}\n\n${templateCss}`;
}
