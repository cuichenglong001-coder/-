const CELL = 24;
const COLS = 20;
const ROWS = 20;
const START_SPEED = 140;
const MIN_SPEED = 70;
const HIGH_SCORE_KEY = "snake-high-score";

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

if (typeof ctx.roundRect !== "function") {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h) {
    this.rect(x, y, w, h);
  };
}
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startBtn = document.getElementById("start-btn");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let snake;
let dir;
let queuedDir;
let food;
let score;
let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
let running = false;
let paused = false;
let timer = null;

highScoreEl.textContent = String(highScore);

function resetGame() {
  const midX = Math.floor(COLS / 2);
  const midY = Math.floor(ROWS / 2);
  snake = [
    { x: midX, y: midY },
    { x: midX - 1, y: midY },
    { x: midX - 2, y: midY },
  ];
  dir = DIRS.right;
  queuedDir = dir;
  score = 0;
  scoreEl.textContent = "0";
  food = placeFood();
}

function placeFood() {
  const taken = new Set(snake.map((part) => `${part.x},${part.y}`));
  let next;
  do {
    next = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (taken.has(`${next.x},${next.y}`));
  return next;
}

function speed() {
  return Math.max(MIN_SPEED, START_SPEED - Math.floor(score / 5) * 8);
}

function startLoop() {
  clearTimeout(timer);
  timer = setTimeout(tick, speed());
}

function sameDir(a, b) {
  return a.x === b.x && a.y === b.y;
}

function opposite(a, b) {
  return a.x === -b.x && a.y === -b.y;
}

function tick() {
  if (!running || paused) return;

  if (!opposite(queuedDir, dir)) {
    dir = queuedDir;
  }

  const head = snake[0];
  const next = { x: head.x + dir.x, y: head.y + dir.y };

  const hitWall = next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS;
  const hitSelf = snake.some((part) => part.x === next.x && part.y === next.y);

  if (hitWall || hitSelf) {
    endGame();
    return;
  }

  snake.unshift(next);

  if (next.x === food.x && next.y === food.y) {
    score += 1;
    scoreEl.textContent = String(score);
    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = String(highScore);
      localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
    }
    food = placeFood();
  } else {
    snake.pop();
  }

  draw();
  startLoop();
}

function drawCell(x, y, fill, radius = 6) {
  const px = x * CELL;
  const py = y * CELL;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(px + 2, py + 2, CELL - 4, CELL - 4, radius);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(61, 255, 176, 0.06)";
  ctx.lineWidth = 1;
  for (let i = 1; i < COLS; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * CELL, 0);
    ctx.lineTo(i * CELL, canvas.height);
    ctx.stroke();
  }
  for (let i = 1; i < ROWS; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, i * CELL);
    ctx.lineTo(canvas.width, i * CELL);
    ctx.stroke();
  }

  drawCell(food.x, food.y, "#ff5d7a", 10);

  snake.forEach((part, index) => {
    const color = index === 0 ? "#d7ffe8" : `hsl(158, 90%, ${48 - Math.min(index, 12)}%)`;
    drawCell(part.x, part.y, color, index === 0 ? 8 : 6);
  });
}

function showOverlay(title, text, buttonLabel) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startBtn.textContent = buttonLabel;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function play() {
  resetGame();
  running = true;
  paused = false;
  hideOverlay();
  draw();
  startLoop();
}

function endGame() {
  running = false;
  paused = false;
  clearTimeout(timer);
  draw();
  showOverlay("游戏结束", `本局得分 ${score}，点击再来一局`, "再来一局");
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) {
    clearTimeout(timer);
    showOverlay("已暂停", "按空格或点击继续", "继续");
  } else {
    hideOverlay();
    startLoop();
  }
}

function setDirection(name) {
  const next = DIRS[name];
  if (!next) return;
  if (!running) {
    play();
    queuedDir = opposite(next, DIRS.right) ? DIRS.right : next;
    return;
  }
  if (paused) return;
  queuedDir = next;
}

const keyMap = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
  W: "up",
  A: "left",
  S: "down",
  D: "right",
};

document.addEventListener("keydown", (event) => {
  if (event.key === " " || event.code === "Space") {
    event.preventDefault();
    if (!running) {
      play();
    } else {
      togglePause();
    }
    return;
  }

  const name = keyMap[event.key];
  if (!name) return;
  event.preventDefault();
  setDirection(name);
});

startBtn.addEventListener("click", () => {
  if (running && paused) {
    togglePause();
    return;
  }
  play();
});

document.querySelectorAll("[data-dir]").forEach((button) => {
  button.addEventListener("click", () => setDirection(button.dataset.dir));
});

resetGame();
draw();
