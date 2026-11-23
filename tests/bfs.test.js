import test from 'node:test';
import assert from 'node:assert/strict';
import { breadthFirstSearch, neighbors, sampleWalls } from '../bfs.js';

const search = (rows, cols, start, goal, blocked = []) => breadthFirstSearch({ rows, cols, start, goal, walls: new Set(blocked) });
test('open grid gives Manhattan shortest distance without wrapping rows', () => {
  const result = search(3, 4, 0, 11);
  assert.equal(result.path.length - 1, 5);
  assert.deepEqual(neighbors(3, 3, 4), [7, 2]);
  assert.equal(new Set(result.queue).size, result.queue.length);
});
test('walls force a detour and every returned move is legal', () => {
  const result = search(3, 5, 5, 9, [2, 7]);
  assert.equal(result.path.length - 1, 6);
  result.path.slice(1).forEach((vertex, index) => {
    assert.ok(neighbors(result.path[index], 3, 5).includes(vertex));
    assert.ok(![2, 7].includes(vertex));
  });
});
test('unreachable goal exhausts only the reachable component', () => {
  const result = search(3, 3, 0, 8, [1, 3]);
  assert.deepEqual(result.path, []);
  assert.equal(result.distance[8], -1);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].head, result.events[0].tail);
});
test('same endpoint is a zero-length path and invalid endpoints are rejected', () => {
  assert.deepEqual(search(1, 1, 0, 0).path, [0]);
  assert.throws(() => search(2, 2, 0, 3, [0]), RangeError);
  assert.throws(() => search(2, 2, 0, 4), RangeError);
});
test('example trace uses FIFO, visits once and reconstructs a legal path', () => {
  const walls = sampleWalls();
  const result = breadthFirstSearch({ rows: 11, cols: 17, start: 87, goal: 99, walls });
  assert.ok(result.path.length > 13);
  assert.equal(result.path[0], 87);
  assert.equal(result.path.at(-1), 99);
  assert.equal(result.path.length - 1, result.distance[99]);
  assert.equal(new Set(result.queue).size, result.queue.length);
  result.events.forEach((event, index) => {
    assert.equal(event.current, result.queue[index]);
    assert.equal(event.head, index + 1);
    assert.ok(event.tail >= event.head);
    if (index) assert.ok(result.distance[event.current] >= result.distance[result.events[index - 1].current]);
  });
  result.path.slice(1).forEach((vertex, index) => {
    assert.ok(neighbors(result.path[index], 11, 17).includes(vertex));
    assert.ok(!walls.has(vertex));
  });
});
test('many deterministic maps match independent repeated distance relaxation', () => {
  let seed = 8458;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let trial = 0; trial < 80; trial++) {
    const rows = 5, cols = 6, size = rows * cols;
    const walls = new Set(Array.from({ length: size }, (_, i) => i).filter((i) => i !== 0 && i !== size - 1 && random() < .3));
    const expected = Array(size).fill(Infinity); expected[0] = 0;
    for (let pass = 0; pass < size; pass++) {
      for (let vertex = 0; vertex < size; vertex++) {
        if (walls.has(vertex)) continue;
        for (let other = 0; other < size; other++) {
          if (walls.has(other)) continue;
          if (Math.abs(Math.floor(vertex / cols) - Math.floor(other / cols)) + Math.abs(vertex % cols - other % cols) === 1)
            expected[other] = Math.min(expected[other], expected[vertex] + 1);
        }
      }
    }
    const actual = breadthFirstSearch({ rows, cols, walls, start: 0, goal: size - 1 });
    assert.equal(actual.path.length ? actual.path.length - 1 : Infinity, expected[size - 1]);
  }
});
