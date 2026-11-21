import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reducer } from './state.ts';
import { PLANNER_SCENARIOS } from '../demo/planner-scenarios.ts';
test('survey progresses, skips and edits without losing unrelated answers', () => {
  let s = reducer(initialState, { type: 'choice', value: 'Bình yên' });
  s = reducer(s, { type: 'next' }); assert.equal(s.stage, 'profile');
  s = reducer(s, { type: 'skip' }); assert.equal(s.question, 2);
  s = reducer(s, { type: 'review' }); s = reducer(s, { type: 'edit', field: 'party' });
  s = reducer(s, { type: 'choice', value: 'Hai người' }); s = reducer(s, { type: 'next' });
  assert.equal(s.stage, 'review'); assert.deepEqual(s.answers.mood, ['Bình yên']);
});
test('multi-select is bounded, toggleable and invalid choices are rejected', () => {
  let s = initialState;
  for (const value of ['Bình yên', 'Lãng mạn', 'Thiên nhiên', 'Nghỉ dưỡng']) s = reducer(s, { type: 'choice', value });
  assert.equal(s.answers.mood?.length, 3); assert.ok(s.error);
  s = reducer(s, { type: 'choice', value: 'Bình yên' }); assert.equal(s.answers.mood?.length, 2);
  assert.equal(reducer(s, { type: 'choice', value: 'admin' }), s);
});
test('free text is retained verbatim as notes without pretending to interpret', () => {
  const s = reducer(initialState, { type: 'submit', text: '  Tokyo accessible hotel  ' });
  assert.deepEqual(s.notes, ['Tokyo accessible hotel']); assert.equal(s.scenarioId, null);
  assert.equal(s.messages[1]?.role, 'assistant'); assert.equal(s.nextId, 3);
});
test('empty and overlong submissions do not append transcript', () => {
  assert.equal(reducer(initialState, { type: 'submit', text: '   ' }), initialState);
  const s = reducer(initialState, { type: 'submit', text: 'x'.repeat(2001) });
  assert.equal(s.messages.length, 0); assert.ok(s.error);
});
test('sample selection and refinement share stable IDs, draft and confirmed reset', () => {
  let s = reducer(initialState, { type: 'draft', value: 'draft' });
  assert.equal(reducer(s, { type: 'reset', confirmed: false }), s);
  s = reducer(s, { type: 'sample', prompt: PLANNER_SCENARIOS[0]!.prompt });
  assert.equal(s.stage, 'refinement'); assert.equal(s.scenarioId, PLANNER_SCENARIOS[0]!.id);
  s = reducer(s, { type: 'sample', prompt: PLANNER_SCENARIOS[1]!.prompt });
  assert.equal(s.scenarioId, PLANNER_SCENARIOS[1]!.id);
  assert.deepEqual(s.messages.map(m => m.id), [1, 2, 3, 4]);
  s = reducer(s, { type: 'panel', value: 'itinerary' }); assert.equal(s.panel, 'itinerary');
  assert.equal(reducer(s, { type: 'reset', confirmed: true }), initialState);
});
test('review confirmation is idempotent and unrelated actions preserve draft', () => {
  const s = reducer(reducer(initialState, { type: 'draft', value: 'keep me' }), { type: 'review' });
  const next = reducer(s, { type: 'confirm' }); assert.equal(next.stage, 'proposal');
  assert.equal(reducer(next, { type: 'confirm' }), next); assert.equal(next.draft, 'keep me');
});
