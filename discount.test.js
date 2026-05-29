import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPercentageDiscount } from './discount.js';

test('applies percentage discount', () => {
  assert.equal(applyPercentageDiscount(100, 20), 80);
});
