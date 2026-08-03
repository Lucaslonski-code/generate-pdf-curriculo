import express from 'express';
import path from 'path';
import pdfRoutes from './routes/pdf.routes';
import { closeBrowser } from './pdf/pdfGenerator';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/api', pdfRoutes);

const server = app.listen(PORT, () => {
  console.log(`Resume Generator rodando em http://localhost:${PORT}`);
});

// The PDF pipeline keeps a single Chromium instance alive for reuse across
// requests (see pdf/pdfGenerator.ts); make sure it's closed on shutdown so
// the process doesn't hang or leak a browser process.
async function shutdown(): Promise<void> {
  server.close();
  await closeBrowser();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
