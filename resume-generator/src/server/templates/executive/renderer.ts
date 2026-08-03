import { ResumeTemplate } from '../types';
import { renderResumeDocument } from '../shared/documentRenderer';

export const executiveTemplate: ResumeTemplate = {
  id: 'executive',
  label: 'Executive',
  render: (resume) => renderResumeDocument(resume, 'executive'),
};
