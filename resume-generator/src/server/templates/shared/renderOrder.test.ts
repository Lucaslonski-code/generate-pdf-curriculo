import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseResume } from '../../parser/resumeParser';
import { renderResumeDocument } from './documentRenderer';

const THREE_PROJECTS = `João Silva
Desenvolvedor Full Stack
joao@email.com

PROJETO 1
Stack: React, TypeScript, Node.js
Descrição do projeto 1

PROJETO 2
Stack: React, Tailwind
Descrição do projeto 2

PROJETO 3
Stack: Vue, Firebase
Descrição do projeto 3`;

const EXPECTED_SEQUENCE = [
  'PROJETO 1',
  'Stack: React, TypeScript, Node.js',
  'Descrição do projeto 1',
  'PROJETO 2',
  'Stack: React, Tailwind',
  'Descrição do projeto 2',
  'PROJETO 3',
  'Stack: Vue, Firebase',
  'Descrição do projeto 3',
];

test('rendered HTML keeps Projeto -> Stack -> Descrição sequence for each project', () => {
  const resume = parseResume(THREE_PROJECTS);
  const html = renderResumeDocument(resume, 'modern');

  const indexes = EXPECTED_SEQUENCE.map((phrase) => html.indexOf(phrase));
  for (let i = 0; i < indexes.length; i++) {
    assert.ok(indexes[i] !== -1, `"${EXPECTED_SEQUENCE[i]}" deve aparecer no HTML`);
  }
  for (let i = 0; i < indexes.length - 1; i++) {
    assert.ok(
      indexes[i] < indexes[i + 1],
      `"${EXPECTED_SEQUENCE[i]}" deve vir antes de "${EXPECTED_SEQUENCE[i + 1]}"`
    );
  }
});

test('each project renders inside its own article.entry as a visual unit', () => {
  const resume = parseResume(THREE_PROJECTS);
  const html = renderResumeDocument(resume, 'modern');

  const entryChunks = html.split('<article class="entry">').slice(1);
  assert.equal(entryChunks.length, 3, 'deve haver exatamente três articles de projeto');

  const perEntry = [
    ['PROJETO 1', 'Stack: React, TypeScript, Node.js', 'Descrição do projeto 1'],
    ['PROJETO 2', 'Stack: React, Tailwind', 'Descrição do projeto 2'],
    ['PROJETO 3', 'Stack: Vue, Firebase', 'Descrição do projeto 3'],
  ];

  entryChunks.forEach((chunk, i) => {
    const [title, stack, description] = perEntry[i];
    const titleIndex = chunk.indexOf(title);
    const stackIndex = chunk.indexOf(stack);
    const descriptionIndex = chunk.indexOf(description);
    assert.ok(titleIndex !== -1, `article ${i + 1} deve conter o título "${title}"`);
    assert.ok(stackIndex !== -1, `article ${i + 1} deve conter a stack "${stack}"`);
    assert.ok(
      descriptionIndex !== -1,
      `article ${i + 1} deve conter a descrição "${description}"`
    );
    assert.ok(
      titleIndex < stackIndex && stackIndex < descriptionIndex,
      `article ${i + 1} deve manter título -> stack -> descrição na ordem`
    );
  });
});

test('generated CSS has no grid/columns/float rules that could reflow entries horizontally', () => {
  const resume = parseResume(THREE_PROJECTS);
  const html = renderResumeDocument(resume, 'modern');

  const forbidden = [
    'display: grid',
    'grid-template-columns',
    'columns:',
    'column-count',
    'float:',
    'writing-mode',
    'position: absolute',
  ];
  for (const rule of forbidden) {
    assert.ok(!html.includes(rule), `o CSS gerado não deve conter "${rule}"`);
  }
});