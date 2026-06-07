// ---------- НАСТРОЙКИ ----------
const canvas = document.getElementById('tetrisCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreSpan = document.getElementById('score');
const levelSpan = document.getElementById('level');

const COLS = 10;
const ROWS = 20;
const CELL_SIZE = canvas.width / COLS; // 40px (400/10=40)

let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let score = 0;
let level = 0;
let activePiece = null;
let nextPiece = null;
let gameInterval = null;
let intervalTime = 500;

// ---------- ФИГУРЫ (ЦВЕТА + ФОРМЫ) ----------
const PIECES = [
    {   // I
        shape: [[1,1,1,1]],
        color: '#2dd4db'
    },
    {   // O
        shape: [[1,1],[1,1]],
        color: '#facc15'
    },
    {   // T
        shape: [[0,1,0],[1,1,1]],
        color: '#c084fc'
    },
    {   // S
        shape: [[0,1,1],[1,1,0]],
        color: '#4ade80'
    },
    {   // Z
        shape: [[1,1,0],[0,1,1]],
        color: '#f87171'
    },
    {   // L
        shape: [[1,0,0],[1,1,1]],
        color: '#fb923c'
    },
    {   // J
        shape: [[0,0,1],[1,1,1]],
        color: '#60a5fa'
    }
];

function randomPiece() {
    const idx = Math.floor(Math.random() * PIECES.length);
    const piece = PIECES[idx];
    const shapeCopy = piece.shape.map(row => [...row]);
    return {
        shape: shapeCopy,
        color: piece.color,
        x: Math.floor((COLS - shapeCopy[0].length) / 2),
        y: 0
    };
}

function initNextPiece() {
    if (!nextPiece) {
        nextPiece = randomPiece();
    }
}

function spawnNewPiece() {
    if (!nextPiece) {
        nextPiece = randomPiece();
    }
    activePiece = {
        shape: nextPiece.shape.map(row => [...row]),
        color: nextPiece.color,
        x: Math.floor((COLS - nextPiece.shape[0].length) / 2),
        y: 0
    };
    nextPiece = randomPiece();
    
    if (collide(activePiece, 0, 0)) {
        gameOver();
    }
    drawNext();
    draw();
}

// проверка столкновений
function collide(piece, offsetX, offsetY) {
    for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[0].length; col++) {
            if (piece.shape[row][col] !== 0) {
                const boardX = piece.x + col + offsetX;
                const boardY = piece.y + row + offsetY;
                if (boardX < 0 || boardX >= COLS || boardY >= ROWS || boardY < 0) return true;
                if (boardY >= 0 && board[boardY][boardX] !== 0) return true;
            }
        }
    }
    return false;
}

// закрепление на доске
function mergePiece() {
    for (let row = 0; row < activePiece.shape.length; row++) {
        for (let col = 0; col < activePiece.shape[0].length; col++) {
            if (activePiece.shape[row][col] !== 0) {
                const boardX = activePiece.x + col;
                const boardY = activePiece.y + row;
                if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                    board[boardY][boardX] = activePiece.color;
                }
            }
        }
    }
    clearLines();
    spawnNewPiece();
}

// удаление линий + очки
function clearLines() {
    let linesCleared = 0;
    for (let row = ROWS-1; row >= 0; ) {
        let full = true;
        for (let col = 0; col < COLS; col++) {
            if (board[row][col] === 0) {
                full = false;
                break;
            }
        }
        if (full) {
            for (let r = row; r > 0; r--) {
                board[r] = [...board[r-1]];
            }
            board[0] = Array(COLS).fill(0);
            linesCleared++;
        } else {
            row--;
        }
    }

    if (linesCleared > 0) {
        const points = [0, 100, 300, 600, 1000];
        let addScore = points[linesCleared] * (level + 1);
        score += addScore;
        updateUI();
        
        let newLevel = Math.floor(score / 600);
        if (newLevel > level) {
            level = newLevel;
            adjustInterval();
        }
    }
}

function updateUI() {
    scoreSpan.innerText = score;
    levelSpan.innerText = level;
}

function adjustInterval() {
    if (gameInterval) clearInterval(gameInterval);
    let newTime = Math.max(120, 500 - level * 35);
    intervalTime = newTime;
    gameInterval = setInterval(gameTick, intervalTime);
}

function gameTick() {
    if (!activePiece) return;
    if (!collide(activePiece, 0, 1)) {
        activePiece.y++;
        draw();
    } else {
        mergePiece();
        draw();
    }
}

// управление
function movePiece(dx, dy) {
    if (!activePiece) return false;
    if (!collide(activePiece, dx, dy)) {
        activePiece.x += dx;
        activePiece.y += dy;
        draw();
        return true;
    } else if (dy === 1) {
        mergePiece();
        draw();
    }
    return false;
}

function rotatePiece() {
    if (!activePiece) return;
    const oldShape = activePiece.shape;
    const rotated = oldShape[0].map((_, idx) => oldShape.map(row => row[idx]).reverse());
    activePiece.shape = rotated;
    if (collide(activePiece, 0, 0)) {
        activePiece.shape = oldShape;
        for (let shift of [-1, 1, -2, 2]) {
            if (!collide(activePiece, shift, 0)) {
                activePiece.x += shift;
                draw();
                return;
            }
        }
    } else {
        draw();
    }
}

function hardDrop() {
    if (!activePiece) return;
    while (!collide(activePiece, 0, 1)) {
        activePiece.y++;
    }
    mergePiece();
    draw();
}

// ОТРИСОВКА основной игры (большой холст)
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // сетка и блоки
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col] !== 0) {
                ctx.fillStyle = board[row][col];
                ctx.fillRect(col*CELL_SIZE, row*CELL_SIZE, CELL_SIZE-1, CELL_SIZE-1);
                ctx.shadowBlur = 3;
                ctx.shadowColor = "rgba(0,0,0,0.5)";
            } else {
                ctx.fillStyle = '#121926';
                ctx.fillRect(col*CELL_SIZE, row*CELL_SIZE, CELL_SIZE-1, CELL_SIZE-1);
            }
            ctx.strokeStyle = '#2a3c55';
            ctx.strokeRect(col*CELL_SIZE, row*CELL_SIZE, CELL_SIZE-1, CELL_SIZE-1);
        }
    }
    // активная фигура
    if (activePiece) {
        for (let row = 0; row < activePiece.shape.length; row++) {
            for (let col = 0; col < activePiece.shape[0].length; col++) {
                if (activePiece.shape[row][col]) {
                    ctx.fillStyle = activePiece.color;
                    const x = (activePiece.x + col) * CELL_SIZE;
                    const y = (activePiece.y + row) * CELL_SIZE;
                    ctx.fillRect(x, y, CELL_SIZE-1, CELL_SIZE-1);
                    ctx.shadowBlur = 4;
                    ctx.strokeStyle = '#ffffffaa';
                    ctx.strokeRect(x, y, CELL_SIZE-1, CELL_SIZE-1);
                }
            }
        }
    }
    ctx.shadowBlur = 0;
}

// отрисовка следующей фигуры (в маленьком canvas)
function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.fillStyle = "#0b101ccc";
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPiece) {
        const shape = nextPiece.shape;
        const color = nextPiece.color;
        const blockW = nextCanvas.width / 5;  // отступы
        const shapeCols = shape[0].length;
        const shapeRows = shape.length;
        const startX = (nextCanvas.width - (shapeCols * blockW)) / 2;
        const startY = (nextCanvas.height - (shapeRows * blockW)) / 2;
        for (let row = 0; row < shapeRows; row++) {
            for (let col = 0; col < shapeCols; col++) {
                if (shape[row][col]) {
                    nextCtx.fillStyle = color;
                    nextCtx.fillRect(startX + col * blockW, startY + row * blockW, blockW-2, blockW-2);
                    nextCtx.strokeStyle = "#ffffff80";
                    nextCtx.strokeRect(startX + col * blockW, startY + row * blockW, blockW-2, blockW-2);
                }
            }
        }
    }
}

function gameOver() {
    clearInterval(gameInterval);
    gameInterval = null;
    alert(`💀 ИГРА ОКОНЧЕНА 💀\nТвой счёт: ${score}`);
}

function resetGame() {
    if (gameInterval) clearInterval(gameInterval);
    // очистка доски
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            board[row][col] = 0;
        }
    }
    score = 0;
    level = 0;
    intervalTime = 500;
    updateUI();
    nextPiece = randomPiece();
    spawnNewPiece();  // создаст активную из next и новый next
    drawNext();
    draw();
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameTick, intervalTime);
}

// ---------- УПРАВЛЕНИЕ ----------
document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key === 'ArrowLeft') movePiece(-1, 0);
    else if (key === 'ArrowRight') movePiece(1, 0);
    else if (key === 'ArrowDown') movePiece(0, 1);
    else if (key === 'ArrowUp') rotatePiece();
    else if (key === ' ' || key === 'Space') {
        e.preventDefault();
        hardDrop();
    }
    e.preventDefault();
});

document.getElementById('resetBtn').addEventListener('click', () => resetGame());

// СТАРТ
resetGame();