import { parseResume } from './src/server/parser/resumeParser';
import { renderResumeDocument } from './src/server/templates/shared/documentRenderer';

const cases: Record<string, string> = {
  'exemplo-superior': `PROJETO 1
Stack: React, TypeScript, Node.js
Descrição do projeto 1

PROJETO 2
Stack: React, Tailwind
Descrição do projeto 2

PROJETO 3
Stack: Vue, Firebase
Descrição do projeto 3`,
  'com-cabecalho': `João Silva
Desenvolvedor Full Stack
joao@email.com | github.com/joao

PROJETO 1
Stack: React, TypeScript, Node.js
Descrição do projeto 1

PROJETO 2
Stack: React, Tailwind
Descrição do projeto 2

PROJETO 3
Stack: Vue, Firebase
Descrição do projeto 3`,
  'com-secao-projetos': `João Silva
Desenvolvedor Full Stack
joao@email.com | github.com/joao

Projetos
PROJETO 1
Stack: React, TypeScript, Node.js
Descrição do projeto 1

PROJETO 2
Stack: React, Tailwind
Descrição do projeto 2

PROJETO 3
Stack: Vue, Firebase
Descrição do projeto 3`,
};

for (const [label, text] of Object.entries(cases)) {
  const resume = parseResume(text);
  console.log(`\n===== ${label} =====`);
  console.log('NAME:', JSON.stringify(resume.name));
  console.log('ROLE:', JSON.stringify(resume.role));
  for (const s of resume.sections) {
    console.log(`SECTION ${s.type} -> ${JSON.stringify(s.content)}`);
  }
  const html = renderResumeDocument(resume, 'modern');
  const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
  console.log('--- HTML ---');
  console.log(bodyMatch ? bodyMatch[1].trim() : html);
}