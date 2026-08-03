import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildListContent, buildEntriesContent, buildTextContent } from './contentBuilders';

test('buildListContent splits a comma-separated line into items', () => {
  const content = buildListContent(['JavaScript, TypeScript, Node.js']);
  assert.deepEqual(content, { kind: 'list', items: ['JavaScript', 'TypeScript', 'Node.js'] });
});

test('buildListContent accepts one bulleted item per line', () => {
  const content = buildListContent(['- Docker', '- PostgreSQL']);
  assert.deepEqual(content, { kind: 'list', items: ['Docker', 'PostgreSQL'] });
});

test('buildEntriesContent extracts title, meta and bullets from a block', () => {
  const content = buildEntriesContent([
    'Tech Lead — Empresa X',
    '2022 - Atual',
    '- Liderou squad de 6 pessoas',
  ]);

  assert.equal(content.kind, 'entries');
  if (content.kind !== 'entries') return;

  assert.equal(content.entries.length, 1);
  assert.equal(content.entries[0].title, 'Tech Lead — Empresa X');
  assert.equal(content.entries[0].meta, '2022 - Atual');
  assert.deepEqual(content.entries[0].bullets, ['Liderou squad de 6 pessoas']);
});

test('buildEntriesContent treats a long second line as description, not meta', () => {
  const content = buildEntriesContent([
    'Tech Lead — Empresa X',
    'Responsável por liderar o time de plataforma em 2022, entregando iniciativas críticas.',
  ]);

  assert.equal(content.kind, 'entries');
  if (content.kind !== 'entries') return;

  assert.equal(content.entries[0].meta, undefined);
  assert.equal(content.entries[0].description.length, 1);
});

test('buildTextContent joins each blank-line-separated block into one paragraph', () => {
  const content = buildTextContent(['Primeira linha.', 'Segunda linha.', '', 'Outro parágrafo.']);
  assert.deepEqual(content, {
    kind: 'text',
    paragraphs: ['Primeira linha. Segunda linha.', 'Outro parágrafo.'],
  });
});
