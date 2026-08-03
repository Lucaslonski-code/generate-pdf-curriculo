import { ResumeTemplate } from '../types';
import { renderResumeDocument } from '../shared/documentRenderer';

export const minimalTemplate: ResumeTemplate = {
  id: 'minimal',
  label: 'Minimal',
  render: (resume) => renderResumeDocument(resume, 'minimal'),
};
