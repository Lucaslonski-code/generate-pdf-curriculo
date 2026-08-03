import { ResumeTemplate } from '../types';
import { renderResumeDocument } from '../shared/documentRenderer';

export const modernTemplate: ResumeTemplate = {
  id: 'modern',
  label: 'Modern',
  render: (resume) => renderResumeDocument(resume, 'modern'),
};
