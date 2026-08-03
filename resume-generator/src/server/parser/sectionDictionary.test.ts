import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchSectionType } from './sectionDictionary';

test('matchSectionType recognizes Portuguese and English variants', () => {
  assert.equal(matchSectionType('Formação Acadêmica'), 'education');
  assert.equal(matchSectionType('Education'), 'education');
  assert.equal(matchSectionType('Technical Skills'), 'skills');
  assert.equal(matchSectionType('Competências'), 'skills');
  assert.equal(matchSectionType('Certificates'), 'certifications');
  assert.equal(matchSectionType('Professional Summary'), 'summary');
  assert.equal(matchSectionType('Projetos Relevantes'), 'projects');
});

test('matchSectionType is case- and accent-insensitive', () => {
  assert.equal(matchSectionType('EXPERIÊNCIA PROFISSIONAL'), 'experience');
  assert.equal(matchSectionType('experiencia profissional'), 'experience');
});

test('matchSectionType returns null for lines that are not section headings', () => {
  assert.equal(matchSectionType('Liderou squad de 6 pessoas'), null);
  assert.equal(matchSectionType(''), null);
});
