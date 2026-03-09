const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = {
  I: '#6ee7f7', O: '#facc15', T: '#c084fc', S: '#4ade80', Z: '#f87171', J: '#60a5fa', L: '#fb923c'
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
};

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');

let board;
let current;
let score;
let lines;
let level;
let dropCounter;
let dropInterval;
let lastTime;
let running;
let paused;
let gameOver;

function makeBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function rotate(matrix) {
  return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
}

function randomPiece() {
  const keys = Object.keys(SHAPES);
  const type = keys[Math.floor(Math.random() * keys.length)];
  const shape = SHAPES[type].map(row => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.ceil(shape[0].length / 2),
    y: 0,
  };
}

function collides(piece) {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (!piece.shape[y][x]) continue;
      const px = piece.x + x;
      const py = piece.y + y;
      if (px < 0 || px >= COLS || py >= ROWS) return true;
      if (py >= 0 && board[py][px]) return true;
    }
  }
  return false;
}

function merge(piece) {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const py = piece.y + y;
        if (py >= 0) board[py][piece.x + x] = piece.type;
      }
    }
  }
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(cell => cell)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      cleared++;
      y++;
    }
  }
  if (cleared > 0) {
    lines += cleared;
    const reward = [0, 100, 300, 500, 800][cleared] * level;
    score += reward;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(120, 800 - (level - 1) * 60);
  }
}

function spawn() {
  current = randomPiece();
  if (collides(current)) {
    gameOver = true;
    running = false;
    statusEl.textContent = '游戏结束，点击“重新开始”再来一局';
  }
}

function hardDrop() {
  if (!running || paused) return;
  while (true) {
    current.y++;
    if (collides(current)) {
      current.y--;
      lockPiece();
      break;
    }
  }
}

function lockPiece() {
  merge(current);
  clearLines();
  updateStats();
  spawn();
}

function move(dir) {
  if (!running || paused) return;
  current.x += dir;
  if (collides(current)) current.x -= dir;
}

function softDrop() {
  if (!running || paused) return;
  current.y++;
  if (collides(current)) {
    current.y--;
    lockPiece();
  }
  dropCounter = 0;
}

function spin() {
  if (!running || paused) return;
  const original = current.shape;
  current.shape = rotate(current.shape);
  if (collides(current)) {
    current.x++;
    if (collides(current)) {
      current.x -= 2;
      if (collides(current)) {
        current.x++;
        current.shape = original;
      }
    }
  }
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK - 1, BLOCK - 1);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) drawCell(x, y, COLORS[cell]);
    });
  });

  if (!gameOver) {
    current.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) drawCell(current.x + x, current.y + y, COLORS[current.type]);
      });
    });
  }
}

function update(time = 0) {
  if (!running || paused || gameOver) {
    draw();
    requestAnimationFrame(update);
    return;
  }

  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;

  if (dropCounter > dropInterval) {
    softDrop();
  }

  draw();
  requestAnimationFrame(update);
}

function updateStats() {
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function resetGame() {
  board = makeBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropCounter = 0;
  dropInterval = 800;
  lastTime = 0;
  paused = false;
  gameOver = false;
  running = true;
  statusEl.textContent = '游戏进行中';
  updateStats();
  spawn();
}

document.addEventListener('keydown', (e) => {
  if (!running && !gameOver) return;

  switch (e.code) {
    case 'ArrowLeft':
      move(-1);
      break;
    case 'ArrowRight':
      move(1);
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
      spin();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyP':
      if (gameOver) return;
      paused = !paused;
      statusEl.textContent = paused ? '已暂停（按 P 继续）' : '游戏进行中';
      break;
    default:
      break;
  }
});

restartBtn.addEventListener('click', resetGame);

board = makeBoard();
score = 0;
lines = 0;
level = 1;
dropCounter = 0;
dropInterval = 800;
lastTime = 0;
running = false;
paused = false;
gameOver = false;
spawn();
updateStats();
statusEl.textContent = '点击“重新开始”开始游戏';
requestAnimationFrame(update);
