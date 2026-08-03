export type SectionType =
  | 'summary'
  | 'skills'
  | 'experience'
  | 'projects'
  | 'education'
  | 'certifications'
  | 'languages'
  | 'other';

export interface EntryBlock {
  title: string;
  meta?: string;
  description: string[];
  bullets: string[];
}

export type SectionContent =
  | { kind: 'text'; paragraphs: string[] }
  | { kind: 'list'; items: string[] }
  | { kind: 'entries'; entries: EntryBlock[] };

export interface ResumeSection {
  type: SectionType;
  title: string;
  content: SectionContent;
}

/**
 * Structured contact information. Keeping each channel as its own field
 * (instead of a raw string) is what allows templates to render icons,
 * reorder, or omit fields independently.
 */
export interface ContactInfo {
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  location?: string;
}

export interface ParsedResume {
  name: string;
  role?: string;
  contact: ContactInfo;
  sections: ResumeSection[];
}
