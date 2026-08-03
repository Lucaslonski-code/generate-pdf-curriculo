import { Router, Request, Response } from 'express';
import { createResumePdf } from '../services/pdf.service';

const router = Router();

// A real resume rarely exceeds a few thousand characters. This cap is a
// defensive guard against pathological input (e.g. an entire book pasted
// by mistake) turning into a very slow or oversized PDF render.
const MAX_RESUME_TEXT_LENGTH = 20_000;

interface GeneratePdfRequestBody {
  text?: string;
  template?: string;
}

router.post('/generate-pdf', async (req: Request, res: Response) => {
  const { text, template } = req.body as GeneratePdfRequestBody;

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
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ error: 'Não foi possível gerar o PDF. Tente novamente.' });
  }
});

export default router;
