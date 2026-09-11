import { createResumePdf } from './src/server/services/pdf.service';
import fs from 'fs';

const sampleResume = `Maria Oliveira
Desenvolvedora Full Stack Sênior
maria@email.com | (11) 91234-5678 | linkedin.com/in/maria | github.com/maria | São Paulo, SP

Resumo Profissional
Engenheira de software com foco em produtos escaláveis e experiência em liderança técnica.

Competências Técnicas
Node.js, TypeScript, React, PostgreSQL, Docker, AWS, Kubernetes

Experiência Profissional
Tech Lead — Empresa X
2022 - Atual
- Liderou squad de 6 pessoas
- Arquitetou migração para microsserviços
- Melhorou performance em 40%

Pessoa Desenvolvedora Sênior — Empresa Y
2019 - 2022
- Desenvolveu APIs RESTful
- Implementou CI/CD
- Mentoria de desenvolvedores júnior

Projetos
Sistema de Pagamentos — 2023
Plataforma de processamento de pagamentos de alta disponibilidade

Formação Acadêmica
Bacharelado em Ciência da Computação — Universidade Z
2015 - 2019

Certificações
AWS Solutions Architect Associate
Docker Certified Associate

Idiomas
Português (Nativo)
Inglês (Fluente)`;

async function test() {
  try {
    console.log('Generating PDF...');
    const pdfBuffer = await createResumePdf(sampleResume);
    fs.writeFileSync('test-output.pdf', pdfBuffer);
    console.log(`PDF generated successfully! Size: ${pdfBuffer.length} bytes`);
    console.log('Saved to test-output.pdf');
  } catch (error) {
    console.error('Error generating PDF:', error);
    process.exit(1);
  }
}

test();