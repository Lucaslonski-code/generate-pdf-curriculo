import { SectionType } from './types';
import { normalizeHeading } from './normalize';

/**
 * Maps normalized heading variants to a canonical SectionType.
 * Add new variants here whenever a new phrasing shows up in AI-generated
 * resumes — this is the single place that defines parser tolerance.
 */
const SECTION_VARIANTS: Record<string, SectionType> = {
  // Summary
  'resumo profissional': 'summary',
  'resumo': 'summary',
  'sobre': 'summary',
  'sobre mim': 'summary',
  'perfil profissional': 'summary',
  'perfil': 'summary',
  'objetivo': 'summary',
  'objetivo profissional': 'summary',
  'summary': 'summary',
  'professional summary': 'summary',

  // Skills
  'competencias tecnicas': 'skills',
  'competencias': 'skills',
  'habilidades': 'skills',
  'habilidades tecnicas': 'skills',
  'skills': 'skills',
  'tecnologias': 'skills',
  'ferramentas': 'skills',
  'conhecimentos tecnicos': 'skills',
  'hard skills': 'skills',
  'technical skills': 'skills',

  // Experience
  'experiencia': 'experience',
  'experiencia profissional': 'experience',
  'experiencias profissionais': 'experience',
  'historico profissional': 'experience',
  'experience': 'experience',
  'work experience': 'experience',
  'professional experience': 'experience',

  // Projects
  'projetos': 'projects',
  'projetos relevantes': 'projects',
  'projetos pessoais': 'projects',
  'projects': 'projects',

  // Education
  'formacao': 'education',
  'formacao academica': 'education',
  'educacao': 'education',
  'education': 'education',
  'academic background': 'education',

  // Certifications
  'certificacoes': 'certifications',
  'certificacao': 'certifications',
  'certificados': 'certifications',
  'certifications': 'certifications',
  'certificates': 'certifications',
  'cursos e certificacoes': 'certifications',

  // Languages
  'idiomas': 'languages',
  'idioma': 'languages',
  'languages': 'languages',
};

/**
 * Returns the canonical SectionType for a line if it matches a known
 * heading (after normalization), otherwise null.
 */
export function matchSectionType(line: string): SectionType | null {
  const normalized = normalizeHeading(line);
  if (!normalized) return null;
  return SECTION_VARIANTS[normalized] ?? null;
}

/** Human-friendly default title used when rendering a canonical section. */
export const DEFAULT_SECTION_TITLES: Record<SectionType, string> = {
  summary: 'Resumo Profissional',
  skills: 'Competências Técnicas',
  experience: 'Experiência Profissional',
  projects: 'Projetos',
  education: 'Formação Acadêmica',
  certifications: 'Certificações',
  languages: 'Idiomas',
  other: 'Outras Informações',
};
