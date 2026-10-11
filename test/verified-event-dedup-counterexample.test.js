import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestVerifiedEvent } from '../src/events/verified-event-ingestion.js';

function isolatedDependencies() {
  const rows = new Map();
  const effects = [];
  const insertResults = [];
  const authenticatedIds = [];
  const dependencies = {
    async authenticate(event) {
      authenticatedIds.push(event.id);
      return event.id === 'verified-invoice-event' && event.payload.amount === 1250;
    },
    inbox: {
      async insertIfAbsent(row) {
        const inserted = !rows.has(row.id);
        if (inserted) rows.set(row.id, structuredClone(row));
        insertResults.push(inserted);
        return { inserted };
      },
    },
    queue: {
      async enqueue(effect) {
        effects.push(structuredClone(effect));
      },
    },
  };
  return { dependencies, rows, effects, insertResults, authenticatedIds };
}

test('same authenticated event ID persists once but schedules its effect twice', async () => {
  const fixture = isolatedDependencies();
  const event = { id: 'verified-invoice-event', payload: { amount: 1250 } };

  assert.deepEqual(await ingestVerifiedEvent(event, fixture.dependencies), { status: 202 });
  assert.deepEqual(await ingestVerifiedEvent(structuredClone(event), fixture.dependencies), { status: 202 });

  assert.deepEqual(fixture.authenticatedIds, [event.id, event.id]);
  assert.deepEqual(fixture.insertResults, [true, false]);
  assert.equal(fixture.rows.size, 1);
  assert.equal(fixture.effects.length, 2);
  assert.deepEqual(fixture.effects[0], fixture.effects[1]);
});

test('unauthenticated input produces neither an inbox row nor an effect', async () => {
  const fixture = isolatedDependencies();
  const event = { id: 'unverified-event', payload: { amount: 1250 } };

  assert.deepEqual(await ingestVerifiedEvent(event, fixture.dependencies), { status: 401 });
  assert.equal(fixture.rows.size, 0);
  assert.equal(fixture.effects.length, 0);
  assert.deepEqual(fixture.insertResults, []);
});
