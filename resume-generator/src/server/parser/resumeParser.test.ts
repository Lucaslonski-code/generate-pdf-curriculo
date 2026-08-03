import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseResume } from './resumeParser';

test('parseResume extracts name, role, contact and sections in order', () => {
  const resume = parseResume(`Maria Oliveira
Desenvolvedora Full Stack Sênior
maria@email.com | (11) 91234-5678 | linkedin.com/in/maria

Resumo Profissional
Engenheira de software com foco em produtos escaláveis.

Competências Técnicas
Node.js, TypeScript, React

Experiência Profissional
Tech Lead — Empresa X
2022 - Atual
- Liderou squad de 6 pessoas`);

  assert.equal(resume.name, 'Maria Oliveira');
  assert.equal(resume.role, 'Desenvolvedora Full Stack Sênior');
  assert.equal(resume.contact.email, 'maria@email.com');
  assert.equal(resume.contact.linkedin, 'linkedin.com/in/maria');
  assert.deepEqual(
    resume.sections.map((section) => section.type),
    ['summary', 'skills', 'experience']
  );
});

test('parseResume treats leading text with no recognized heading as the summary', () => {
  const resume = parseResume(`João Pereira
joao@email.com

Só um parágrafo solto sem cabeçalho de seção.`);

  assert.equal(resume.sections.length, 1);
  assert.equal(resume.sections[0].type, 'summary');
});

test('parseResume works without a role or contact line', () => {
  const resume = parseResume(`Ana Souza

Resumo
Sem cargo nem contato.`);

  assert.equal(resume.name, 'Ana Souza');
  assert.equal(resume.role, undefined);
  assert.deepEqual(resume.contact, {});
});

test('parseResume never throws and always returns a renderable resume', () => {
  assert.doesNotThrow(() => parseResume(''));
  assert.doesNotThrow(() => parseResume('\n\n\n'));
  assert.doesNotThrow(() => parseResume('Nome apenas'));

  const empty = parseResume('');
  assert.equal(empty.name, 'Currículo');
  assert.deepEqual(empty.sections, []);
});
