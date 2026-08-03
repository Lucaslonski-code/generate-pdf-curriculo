import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHeading } from './normalize';

test('normalizeHeading strips accents, case and trailing colon', () => {
  assert.equal(normalizeHeading('Formação Acadêmica'), 'formacao academica');
  assert.equal(normalizeHeading('SKILLS:'), 'skills');
  assert.equal(normalizeHeading('  Resumo   Profissional  '), 'resumo profissional');
});

test('normalizeHeading handles empty or whitespace-only input', () => {
  assert.equal(normalizeHeading(''), '');
  assert.equal(normalizeHeading('   '), '');
});
