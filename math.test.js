import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDiscount } from './math.js';

test('applyDiscount applies percentage discounts', () => {
  assert.equal(applyDiscount(100, 20), 80);
});
