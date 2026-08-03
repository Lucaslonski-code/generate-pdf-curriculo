import { parseResume } from '../parser/resumeParser';
import { generatePdfFromHtml } from '../pdf/pdfGenerator';
import { getTemplate } from '../templates/registry';

/**
 * Converts raw resume text (pasted from an AI assistant) into a
 * ready-to-download PDF buffer, using the requested template
 * (defaults to "modern" when omitted or unknown).
 */
export async function createResumePdf(rawText: string, templateId?: string): Promise<Buffer> {
  const resume = parseResume(rawText);
  const template = getTemplate(templateId);
  const html = template.render(resume);
  return generatePdfFromHtml(html);
}
