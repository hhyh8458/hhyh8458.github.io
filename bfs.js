/** A rectangular, unweighted graph: every legal orthogonal move costs one. */
export function neighbors(vertex, rows, cols) {
  const row = Math.floor(vertex / cols);
  const col = vertex % cols;
  const result = [];
  if (row > 0) result.push(vertex - cols);
  if (col < cols - 1) result.push(vertex + 1);
  if (row < rows - 1) result.push(vertex + cols);
  if (col > 0) result.push(vertex - 1);
  return result;
}

/** O(V + E) time, O(V) space, including the compact animation trace. */
export function breadthFirstSearch({ rows, cols, walls, start, goal }) {
  const size = rows * cols;
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 ||
      !Number.isInteger(start) || !Number.isInteger(goal) || start < 0 || goal < 0 ||
      start >= size || goal >= size || walls.has(start) || walls.has(goal)) {
    throw new RangeError('The graph needs valid, unblocked endpoints.');
  }
  const distance = Array(size).fill(-1);
  const parent = Array(size).fill(-1);
  const queue = [start];
  const events = [];
  let head = 0;
  distance[start] = 0; // Mark when enqueued, so every vertex enters only once.
  while (head < queue.length) {
    const current = queue[head++]; // No Array.shift(): dequeue stays O(1).
    const added = [];
    if (current !== goal) {
      for (const next of neighbors(current, rows, cols)) {
        if (walls.has(next) || distance[next] !== -1) continue;
        distance[next] = distance[current] + 1;
        parent[next] = current;
        queue.push(next);
        added.push(next);
      }
    }
    // Indices share one queue instead of storing a full copy at every step.
    events.push({ current, added, head, tail: queue.length });
    if (current === goal) break;
  }
  const path = [];
  if (distance[goal] !== -1) {
    for (let cursor = goal; cursor !== -1; cursor = parent[cursor]) path.push(cursor);
    path.reverse();
  }
  return { path, distance, parent, queue, events };
}

export function sampleWalls(rows = 11, cols = 17) {
  const walls = new Set();
  for (let row = 0; row < rows; row++) {
    if (row < 9 && row !== 2) walls.add(row * cols + 5);
    if (row > 1 && row !== 8) walls.add(row * cols + 9);
    if (row < 9 && row !== 4) walls.add(row * cols + 12);
  }
  return walls;
}
