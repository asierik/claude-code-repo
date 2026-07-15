import test from 'node:test';
import assert from 'node:assert/strict';
import { ingredientKey } from './groceryService.js';

test('ingredientKey trims and lowercases so matching ingredients merge', () => {
  assert.equal(ingredientKey('  Eggs '), 'eggs');
  assert.equal(ingredientKey('eggs'), ingredientKey('Eggs'));
});

test('ingredientKey treats missing/blank names as empty', () => {
  assert.equal(ingredientKey(undefined), '');
  assert.equal(ingredientKey('   '), '');
});
