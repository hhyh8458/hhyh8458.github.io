import { breadthFirstSearch, sampleWalls } from './bfs.js';

const ROWS = 11, COLS = 17;
const $ = (id) => document.getElementById(id);
const board = $('board');
let walls = sampleWalls(), start = 5 * COLS + 2, goal = 5 * COLS + 14;
let mode = 'wall', trace = null, cursor = 0, timer = null, running = false;
let visited = new Set(), frontier = new Set(), path = new Set(), current = -1;
let focusCell = start;
const cells = [];
const coordinates = (id) => `(${Math.floor(id / COLS) + 1}, ${id % COLS + 1})`;

for (let id = 0; id < ROWS * COLS; id++) {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = 'cell';
  cell.dataset.id = id;
  cell.tabIndex = id === focusCell ? 0 : -1;
  cell.addEventListener('click', () => editCell(id));
  cell.addEventListener('keydown', (event) => {
    const row = Math.floor(id / COLS), col = id % COLS;
    const targets = { ArrowUp: row > 0 ? id - COLS : id, ArrowDown: row < ROWS - 1 ? id + COLS : id,
      ArrowLeft: col > 0 ? id - 1 : id, ArrowRight: col < COLS - 1 ? id + 1 : id };
    if (!(event.key in targets)) return;
    event.preventDefault();
    setFocus(targets[event.key]);
    cells[focusCell].focus();
  });
  board.append(cell);
  cells.push(cell);
}

function setFocus(id) {
  cells[focusCell].tabIndex = -1;
  focusCell = id;
  cells[id].tabIndex = 0;
}

function renderBoard() {
  cells.forEach((cell, id) => {
    const state = id === start ? 'start' : id === goal ? 'goal' : walls.has(id) ? 'wall' :
      path.has(id) ? 'path' : id === current ? 'current' : visited.has(id) ? 'visited' : frontier.has(id) ? 'frontier' : '';
    cell.className = `cell ${state}`;
    cell.textContent = id === start ? 'S' : id === goal ? 'G' : '';
    const names = { start: '출발점', goal: '도착점', wall: '벽', path: '최단 경로', current: '현재 탐색', visited: '탐색 완료', frontier: '탐색 대기' };
    cell.setAttribute('aria-label', `${Math.floor(id / COLS) + 1}행 ${id % COLS + 1}열, ${names[state] || '빈 칸'}`);
  });
  $('visited-count').textContent = visited.size;
}

function status(label, message) {
  $('status-label').textContent = label;
  $('status-text').textContent = message;
}

function pause() {
  clearTimeout(timer);
  timer = null;
  running = false;
  $('run').textContent = trace && cursor > 0 && cursor < trace.events.length ? '탐색 계속' : '▶ 탐색 시작';
  $('step').disabled = false;
}

function clearTrace() {
  pause(); trace = null; cursor = 0; current = -1;
  visited.clear(); frontier.clear(); path.clear();
  $('distance').textContent = '—';
  $('run').textContent = '▶ 탐색 시작';
  $('run').disabled = false;
  $('step').disabled = false;
  $('queue').replaceChildren();
  const empty = document.createElement('span');
  empty.className = 'queue-empty';
  empty.textContent = '탐색을 시작하면 여기에 표시돼요.';
  $('queue').append(empty);
}

function editCell(id) {
  setFocus(id);
  if ((mode === 'wall' && (id === start || id === goal)) ||
      (mode === 'start' && id === goal) || (mode === 'goal' && id === start)) {
    status('KEEP TWO ENDPOINTS', '출발점과 도착점은 서로 다른 빈 칸에 두세요.');
    return;
  }
  clearTrace();
  if (mode === 'wall') { if (walls.has(id)) walls.delete(id); else walls.add(id); }
  if (mode === 'start') { start = id; walls.delete(id); }
  if (mode === 'goal') { goal = id; walls.delete(id); }
  status('MAP UPDATED', '지도가 바뀌었어요. 새로운 경로를 탐색해 보세요.');
  renderBoard();
}

function prepare() {
  if (trace && cursor < trace.events.length) return;
  clearTrace();
  trace = breadthFirstSearch({ rows: ROWS, cols: COLS, walls, start, goal });
  frontier.add(start);
}

function renderQueue(event) {
  const fragment = document.createDocumentFragment();
  const waiting = event.tail - event.head;
  for (const id of trace.queue.slice(event.head, Math.min(event.tail, event.head + 6))) {
    const chip = document.createElement('span');
    chip.textContent = coordinates(id);
    fragment.append(chip);
  }
  if (waiting > 6) {
    const more = document.createElement('span');
    more.textContent = `외 ${waiting - 6}칸`;
    fragment.append(more);
  }
  if (!waiting) {
    const empty = document.createElement('span');
    empty.className = 'queue-empty';
    empty.textContent = '큐가 비어 있어요.';
    fragment.append(empty);
  }
  $('queue').replaceChildren(fragment);
}

function advance() {
  const event = trace.events[cursor++];
  current = event.current;
  frontier.delete(current);
  visited.add(current);
  event.added.forEach((id) => frontier.add(id));
  renderQueue(event);
  if (cursor === trace.events.length) {
    pause();
    current = -1;
    path = new Set(trace.path);
    if (trace.path.length) {
      const moves = trace.path.length - 1;
      $('distance').textContent = moves;
      status('SHORTEST PATH FOUND', `${moves}번 이동하면 도착해요. 초록색이 최단 경로입니다.`);
    } else {
      $('distance').textContent = '없음';
      status('NO PATH FOUND', '도착점까지 갈 수 없어요. 벽을 지우거나 도착점을 옮겨 보세요.');
    }
    $('run').textContent = '다시 탐색';
    $('step').disabled = true;
  } else {
    if (!running) $('run').textContent = '탐색 계속';
    status(running ? 'EXPLORING' : 'STEP BY STEP', `${coordinates(current)} 탐색 · 큐에 ${event.tail - event.head}칸이 기다리고 있어요.`);
  }
  renderBoard();
}

function tick() {
  if (!running) return;
  advance();
  if (running) timer = setTimeout(tick, { 1: 200, 2: 65, 3: 10 }[$('speed').value]);
}

$('run').addEventListener('click', () => {
  if (running) {
    pause();
    status('PAUSED', '잠시 멈췄어요. 계속 탐색하거나 한 단계씩 진행할 수 있어요.');
    return;
  }
  prepare();
  running = true;
  $('run').textContent = 'Ⅱ 일시정지';
  $('step').disabled = true;
  tick();
});
$('step').addEventListener('click', () => { pause(); prepare(); advance(); });
$('reset').addEventListener('click', () => {
  clearTrace(); renderBoard(); status('READY TO EXPLORE', '탐색 기록을 지웠어요. 지도는 그대로예요.');
});
$('clear').addEventListener('click', () => {
  clearTrace(); walls.clear(); renderBoard(); status('A FRESH START', '모든 벽을 지웠어요. 직접 지도를 만들어 보세요.');
});
$('sample').addEventListener('click', () => {
  clearTrace(); walls = sampleWalls(); start = 5 * COLS + 2; goal = 5 * COLS + 14;
  renderBoard(); status('EXAMPLE MAP', '예제 지도를 불러왔어요. 벽 사이의 길을 찾아보세요.');
});
document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  $('mode-hint').textContent = { wall: '칸을 클릭하면 벽을 만들거나 지울 수 있어요.', start: '지도에서 새로운 출발점으로 쓸 칸을 클릭하세요.', goal: '지도에서 새로운 도착점으로 쓸 칸을 클릭하세요.' }[mode];
}));
$('speed').addEventListener('input', () => {
  const label = { 1: '느리게', 2: '보통', 3: '빠르게' }[$('speed').value];
  $('speed-label').textContent = label;
  $('speed').setAttribute('aria-valuetext', label);
});
renderBoard();
