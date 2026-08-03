import { ResumeTemplate } from '../types';
import { renderResumeDocument } from '../shared/documentRenderer';

export const atsTemplate: ResumeTemplate = {
  id: 'ats',
  label: 'ATS',
  render: (resume) => renderResumeDocument(resume, 'ats'),
};
