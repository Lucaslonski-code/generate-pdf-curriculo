import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isContactLine, parseContactLine } from './contactParser';

test('isContactLine detects email, phone, links and separators', () => {
  assert.equal(isContactLine('maria@email.com'), true);
  assert.equal(isContactLine('(11) 91234-5678'), true);
  assert.equal(isContactLine('linkedin.com/in/maria'), true);
  assert.equal(isContactLine('a | b'), true);
});

test('isContactLine rejects plain text lines', () => {
  assert.equal(isContactLine('Desenvolvedora Full Stack'), false);
  assert.equal(isContactLine(''), false);
});

test('parseContactLine classifies each pipe-separated token into its own field', () => {
  const contact = parseContactLine(
    'maria@email.com | (11) 91234-5678 | linkedin.com/in/maria | github.com/maria | São Paulo, SP'
  );

  assert.equal(contact.email, 'maria@email.com');
  assert.equal(contact.phone, '(11) 91234-5678');
  assert.equal(contact.linkedin, 'linkedin.com/in/maria');
  assert.equal(contact.github, 'github.com/maria');
  assert.equal(contact.location, 'São Paulo, SP');
});

test('parseContactLine falls back to comma-splitting when there is no pipe/bullet', () => {
  const contact = parseContactLine('maria@email.com, São Paulo, SP');
  assert.equal(contact.email, 'maria@email.com');
  assert.ok(contact.location);
});

test('parseContactLine never throws on a single-token line', () => {
  assert.doesNotThrow(() => parseContactLine('maria@email.com'));
});
