import { ResumeTemplate } from './types';
import { modernTemplate } from './modern/renderer';
import { minimalTemplate } from './minimal/renderer';
import { executiveTemplate } from './executive/renderer';
import { atsTemplate } from './ats/renderer';

const TEMPLATES: Record<string, ResumeTemplate> = {
  [modernTemplate.id]: modernTemplate,
  [minimalTemplate.id]: minimalTemplate,
  [executiveTemplate.id]: executiveTemplate,
  [atsTemplate.id]: atsTemplate,
};

const DEFAULT_TEMPLATE_ID = 'modern';

/** Returns the requested template, or the default one if unknown/omitted. */
export function getTemplate(id?: string): ResumeTemplate {
  if (id && TEMPLATES[id]) return TEMPLATES[id];
  return TEMPLATES[DEFAULT_TEMPLATE_ID];
}
