import { parseResume } from '../parser/semanticParser';
import { renderResume } from '../templates/semanticRenderers';
import { generatePdfFromHtml } from '../pdf/pdfGenerator';

/**
 * Converts raw resume text in semantic endpoint language into a
 * ready-to-download PDF buffer.
 */
export async function createResumePdf(rawText: string, _templateId?: string): Promise<Buffer> {
  const resume = parseResume(rawText);
  const html = renderResume(resume);
  return generatePdfFromHtml(html);
}
