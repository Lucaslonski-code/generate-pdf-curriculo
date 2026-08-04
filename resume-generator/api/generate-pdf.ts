import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createResumePdf } from '../src/server/services/pdf.service';

// A real resume rarely exceeds a few thousand characters. This cap is a
// defensive guard against pathological input (e.g. an entire book pasted
// by mistake) turning into a very slow or oversized PDF render.
const MAX_RESUME_TEXT_LENGTH = 20_000;

interface GeneratePdfRequestBody {
  text?: string;
  template?: string;
}

/**
 * Vercel serverless function served at `/api/generate-pdf` (the filename
 * IS the route — no manual route registration needed). This preserves the
 * exact contract the frontend already calls: same path, same request
 * shape, same response headers/status codes as the previous Express route.
 *
 * The Node.js runtime (@vercel/node) auto-parses the JSON body into
 * `req.body`, equivalent to the `express.json()` middleware used before.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const { text, template } = (req.body ?? {}) as GeneratePdfRequestBody;

  if (!text || !text.trim()) {
    res.status(400).json({ error: 'O texto do currículo é obrigatório.' });
    return;
  }

  if (text.length > MAX_RESUME_TEXT_LENGTH) {
    res.status(400).json({
      error: `O texto excede o limite de ${MAX_RESUME_TEXT_LENGTH.toLocaleString('pt-BR')} caracteres.`,
    });
    return;
  }

  try {
    const pdfBuffer = await createResumePdf(text, template);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="curriculo.pdf"');
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ error: 'Não foi possível gerar o PDF. Tente novamente.' });
  }
}
