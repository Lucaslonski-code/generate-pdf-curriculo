export interface Header {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  location?: string;
}

export interface Summary {
  text: string;
}

export interface Project {
  name: string;
  stack?: string;
  description?: string;
}

export interface ProjectsSection {
  projects: Project[];
}

export interface Job {
  title: string;
  company?: string;
  period?: string;
  description?: string;
  bullets?: string[];
}

export interface ExperienceSection {
  jobs: Job[];
}

export interface Degree {
  course?: string;
  institution?: string;
  period?: string;
}

export interface EducationSection {
  degrees: Degree[];
}

export interface SkillCategory {
  name: string;
  technologies?: string;
}

export interface SkillsSection {
  categories: SkillCategory[];
}

export interface Certification {
  name: string;
  issuer?: string;
  year?: string;
}

export interface CertificationsSection {
  certifications: Certification[];
}

export interface Language {
  name: string;
  proficiency?: string;
}

export interface LanguagesSection {
  languages: Language[];
}

export type ResumeSection =
  | { type: 'header'; data: Header }
  | { type: 'summary'; data: Summary }
  | { type: 'projects'; data: ProjectsSection }
  | { type: 'experience'; data: ExperienceSection }
  | { type: 'education'; data: EducationSection }
  | { type: 'skills'; data: SkillsSection }
  | { type: 'certifications'; data: CertificationsSection }
  | { type: 'languages'; data: LanguagesSection };

export interface StructuredResume {
  sections: ResumeSection[];
}