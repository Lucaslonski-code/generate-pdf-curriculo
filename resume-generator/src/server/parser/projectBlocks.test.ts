import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isStackLine,
  isProjectTitleLine,
  splitProjectBlocks,
  buildProjectsContent,
  looksLikeProjects,
} from './projectBlocks';

test('isStackLine recognizes Stack/tecnologias label lines', () => {
  assert.equal(isStackLine('Stack: React, TypeScript, Node.js'), true);
  assert.equal(isStackLine('Tecnologias: Vue, Firebase'), true);
  assert.equal(isStackLine('- Stack: Docker'), true);
  assert.equal(isStackLine('Descrição do projeto 1'), false);
});

test('isProjectTitleLine recognizes numbered/colon/dash project titles', () => {
  assert.equal(isProjectTitleLine('PROJETO 1'), true);
  assert.equal(isProjectTitleLine('Projeto: App de entregas'), true);
  assert.equal(isProjectTitleLine('Projeto — App de entregas'), true);
  assert.equal(isProjectTitleLine('Projeto em parceria com a empresa X'), false);
});

test('splitProjectBlocks splits projects even without blank lines between them', () => {
  const blocks = splitProjectBlocks([
    'PROJETO 1',
    'Stack: React, TypeScript',
    'Descrição do projeto 1',
    'PROJETO 2',
    'Stack: React, Tailwind',
    'Descrição do projeto 2',
  ]);

  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0], ['PROJETO 1', 'Stack: React, TypeScript', 'Descrição do projeto 1']);
  assert.deepEqual(blocks[1], ['PROJETO 2', 'Stack: React, Tailwind', 'Descrição do projeto 2']);
});

test('splitProjectBlocks also splits on blank lines (previous behavior preserved)', () => {
  const blocks = splitProjectBlocks(['App X', 'Descrição', '', 'App Y', 'Descrição']);
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0], ['App X', 'Descrição']);
  assert.deepEqual(blocks[1], ['App Y', 'Descrição']);
});

test('buildProjectsContent keeps title -> stack -> description order per project', () => {
  const content = buildProjectsContent([
    'PROJETO 1',
    'Stack: React, TypeScript, Node.js',
    'Descrição do projeto 1',
    'PROJETO 2',
    'Stack: React, Tailwind',
    'Descrição do projeto 2',
    'PROJETO 3',
    'Stack: Vue, Firebase',
    'Descrição do projeto 3',
  ]);

  assert.equal(content.kind, 'entries');
  if (content.kind !== 'entries') return;

  assert.equal(content.entries.length, 3);
  const [p1, p2, p3] = content.entries;
  assert.deepEqual([p1.title, p1.stack, ...p1.description], [
    'PROJETO 1',
    'Stack: React, TypeScript, Node.js',
    'Descrição do projeto 1',
  ]);
  assert.deepEqual([p2.title, p2.stack, ...p2.description], [
    'PROJETO 2',
    'Stack: React, Tailwind',
    'Descrição do projeto 2',
  ]);
  assert.deepEqual([p3.title, p3.stack, ...p3.description], [
    'PROJETO 3',
    'Stack: Vue, Firebase',
    'Descrição do projeto 3',
  ]);
});

test('buildProjectsContent keeps a date line as meta right before the stack', () => {
  const content = buildProjectsContent(['PROJETO 1', '2023', 'Stack: React', 'Descrição']);

  assert.equal(content.kind, 'entries');
  if (content.kind !== 'entries') return;

  const entry = content.entries[0];
  assert.equal(entry.title, 'PROJETO 1');
  assert.equal(entry.meta, '2023');
  assert.equal(entry.stack, 'Stack: React');
  assert.deepEqual(entry.description, ['Descrição']);
});

test('looksLikeProjects returns true only for structured project blocks', () => {
  assert.equal(looksLikeProjects(['PROJETO 1', 'Stack: React', 'Descrição']), true);
  assert.equal(
    looksLikeProjects([
      'PROJETO 1',
      'Stack: React',
      'Descrição',
      'PROJETO 2',
      'Stack: Vue',
      'Descrição 2',
    ]),
    true
  );
  assert.equal(looksLikeProjects(['Só um parágrafo de resumo qualquer']), false);
  assert.equal(looksLikeProjects(['Fui tech lead e usei a stack Node para tudo']), false);
});