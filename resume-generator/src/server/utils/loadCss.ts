import { tokensCss } from '../templates/shared/tokens.css';
import { templateCss as modernCss } from '../templates/modern/template.css';
import { templateCss as minimalCss } from '../templates/minimal/template.css';
import { templateCss as executiveCss } from '../templates/executive/template.css';
import { templateCss as atsCss } from '../templates/ats/template.css';

const TEMPLATE_CSS_BY_ID: Record<string, string> = {
  modern: modernCss,
  minimal: minimalCss,
  executive: executiveCss,
  ats: atsCss,
};

/**
 * Loads the combined CSS for a resume template: shared design tokens
 * first, then the template's own rules (which may override tokens).
 *
 * The CSS content lives in co-located `*.css.ts` modules (see
 * templates/<id>/template.css.ts) instead of being read from disk at
 * request time. Serverless Functions package their code by statically
 * tracing `import`/`require` calls — a plain import is always included
 * correctly in the deployed bundle, in any environment, with no
 * dependency on the filesystem, `process.cwd()`, or bundler-specific
 * configuration (`outputDirectory`, `includeFiles`, etc.) being right.
 */
export function loadTemplateCss(templateId: string): string {
  const templateCss = TEMPLATE_CSS_BY_ID[templateId] ?? modernCss;
  return `${tokensCss}\n\n${templateCss}`;
}
