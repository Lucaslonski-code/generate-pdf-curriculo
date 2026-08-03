import { ParsedResume } from '../parser/types';

export interface ResumeTemplate {
  id: string;
  label: string;
  render(resume: ParsedResume): string;
}
