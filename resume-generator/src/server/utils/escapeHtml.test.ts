import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from './escapeHtml';

test('escapeHtml escapes all HTML-significant characters', () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
  );
  assert.equal(escapeHtml("O'Brien & Cia"), 'O&#39;Brien &amp; Cia');
});

test('escapeHtml leaves plain text untouched', () => {
  assert.equal(escapeHtml('Desenvolvedora Full Stack'), 'Desenvolvedora Full Stack');
});
