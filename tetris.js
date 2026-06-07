// ---------- НАСТРОЙКИ ----------
const canvas = document.getElementById('tetrisCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreSpan = document.getElementById('score');
const levelSpan = document.getElementById('level');

const COLS = 10;
const ROWS = 20;
const CELL_SIZE = canvas.width / COLS; // 40px

let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let score = 0;
let level = 0;
let activePiece = null;
let nextPiece = null;
let gameInterval = null;
let intervalTime = 500;
let isGameOverFlag = false;

// Массив для хранения анимированных строк
let animatingRows = [];

// ---------- ФИГУРЫ (ЦВЕТА + ФОРМЫ) ----------
const PIECES = [
    { shape: [[1,1,1,1]], color: '#2dd4db' },        // I
    { shape: [[1,1],[1,1]], color: '#facc15' },      // O
    { shape: [[0,1,0],[1,1,1]], color: '#c084fc' },  // T
    { shape: [[0,1,1],[1,1,0]], color: '#4ade80' },  // S
    { shape: [[1,1,0],[0,1,1]], color: '#f87171' },  // Z
    { shape: [[1,0,0],[1,1,1]], color: '#fb923c' },  // L
    { shape: [[0,0,1],[1,1,1]], color: '#60a5fa' }   // J
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
    clearLinesWithAnimation();
    spawnNewPiece();
}

// Анимированное удаление линий
function clearLinesWithAnimation() {
    let linesToClear = [];
    
    for (let row = ROWS - 1; row >= 0; row--) {
        let full = true;
        for (let col = 0; col < COLS; col++) {
            if (board[row][col] === 0) {
                full = false;
                break;
            }
        }
        if (full) {
            linesToClear.push(row);
        }
    }
    
    if (linesToClear.length === 0) return;
    
    // Добавляем строки в анимацию
    linesToClear.forEach(row => {
        animatingRows.push({
            row: row,
            progress: 0
        });
    });
    
    // Запускаем анимацию
    animateRowFlash(linesToClear.length);
    
    // Удаляем строки после анимации
    setTimeout(() => {
        let linesCleared = 0;
        
        // Удаляем все заполненные строки
        for (let i = 0; i < linesToClear.length; i++) {
            const rowToRemove = linesToClear[i] - linesCleared;
            for (let r = rowToRemove; r > 0; r--) {
                board[r] = [...board[r - 1]];
            }
            board[0] = Array(COLS).fill(0);
            linesCleared++;
        }
        
        // Обновляем очки и уровень
        if (linesCleared > 0) {
            const points = [0, 100, 300, 600, 1000];
            let addScore = points[Math.min(linesCleared, 4)] * (level + 1);
            score += addScore;
            
            // Анимация счета
            const scoreElement = document.getElementById('score');
            scoreElement.classList.remove('score-pop');
            void scoreElement.offsetWidth; // Триггер перерисовки
            scoreElement.classList.add('score-pop');
            
            updateUI();
            
            let newLevel = Math.floor(score / 600);
            if (newLevel > level) {
                level = newLevel;
                adjustInterval();
                // Анимация уровня
                const levelElement = document.getElementById('level');
                levelElement.classList.remove('score-pop');
                void levelElement.offsetWidth;
                levelElement.classList.add('score-pop');
            }
        }
        
        // Очищаем анимированные строки
        animatingRows = [];
        draw();
    }, 200);
}

// Анимация мигания строк
function animateRowFlash(lineCount) {
    let flashCount = 0;
    const flashInterval = setInterval(() => {
        if (flashCount >= 3 || animatingRows.length === 0) {
            clearInterval(flashInterval);
            return;
        }
        draw(); // Перерисовываем с эффектом
        flashCount++;
    }, 60);
}

function updateUI() {
    scoreSpan.innerText = score;
    levelSpan.innerText = level;
}

function adjustInterval() {
    if (gameInterval) clearInterval(gameInterval);
    let newTime = Math.max(100, 500 - level * 35);
    intervalTime = newTime;
    gameInterval = setInterval(gameTick, intervalTime);
}

function gameTick() {
    if (!activePiece || isGameOverFlag) return;
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
    if (!activePiece || isGameOverFlag) return false;
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
    if (!activePiece || isGameOverFlag) return;
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
    if (!activePiece || isGameOverFlag) return;
    while (!collide(activePiece, 0, 1)) {
        activePiece.y++;
    }
    mergePiece();
    draw();
}

// ОТРИСОВКА с поддержкой анимации
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Отрисовка фона и сетки
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const isAnimating = animatingRows.some(anim => anim.row === row);
            
            if (board[row][col] !== 0) {
                if (isAnimating) {
                    // Эффект мигания для удаляемых строк
                    const gradient = ctx.createLinearGradient(col * CELL_SIZE, row * CELL_SIZE, (col + 1) * CELL_SIZE, (row + 1) * CELL_SIZE);
                    gradient.addColorStop(0, '#ffffff');
                    gradient.addColorStop(0.5, board[row][col]);
                    gradient.addColorStop(1, '#ffffff');
                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = board[row][col];
                }
                ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
                ctx.shadowBlur = isAnimating ? 8 : 3;
                ctx.shadowColor = isAnimating ? "rgba(255,255,200,0.8)" : "rgba(0,0,0,0.5)";
            } else {
                ctx.fillStyle = '#121926';
                ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
            }
            
            // Декоративная сетка
            ctx.strokeStyle = isAnimating ? '#ffdd88' : '#2a3c55';
            ctx.lineWidth = isAnimating ? 1.5 : 1;
            ctx.strokeRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
        }
    }
    
    // Отрисовка активной фигуры с эффектом свечения
    if (activePiece && !isGameOverFlag) {
        for (let row = 0; row < activePiece.shape.length; row++) {
            for (let col = 0; col < activePiece.shape[0].length; col++) {
                if (activePiece.shape[row][col]) {
                    ctx.fillStyle = activePiece.color;
                    const x = (activePiece.x + col) * CELL_SIZE;
                    const y = (activePiece.y + row) * CELL_SIZE;
                    ctx.fillRect(x, y, CELL_SIZE - 1, CELL_SIZE - 1);
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = activePiece.color + 'aa';
                    ctx.strokeStyle = '#ffffffcc';
                    ctx.strokeRect(x, y, CELL_SIZE - 1, CELL_SIZE - 1);
                }
            }
        }
    }
    
    ctx.shadowBlur = 0;
    
    // Тень для игрового поля
    ctx.shadowBlur = 0;
}

// отрисовка следующей фигуры
function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.fillStyle = "#0c1320";
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const shape = nextPiece.shape;
        const color = nextPiece.color;
        const blockW = nextCanvas.width / 5;
        const shapeCols = shape[0].length;
        const shapeRows = shape.length;
        const startX = (nextCanvas.width - (shapeCols * blockW)) / 2;
        const startY = (nextCanvas.height - (shapeRows * blockW)) / 2;
        
        for (let row = 0; row < shapeRows; row++) {
            for (let col = 0; col < shapeCols; col++) {
                if (shape[row][col]) {
                    nextCtx.fillStyle = color;
                    nextCtx.fillRect(startX + col * blockW, startY + row * blockW, blockW - 2, blockW - 2);
                    nextCtx.shadowBlur = 3;
                    nextCtx.shadowColor = "rgba(0,0,0,0.5)";
                    nextCtx.strokeStyle = "#ffffffaa";
                    nextCtx.strokeRect(startX + col * blockW, startY + row * blockW, blockW - 2, blockW - 2);
                }
            }
        }
        nextCtx.shadowBlur = 0;
    }
}

function gameOver() {
    if (isGameOverFlag) return;
    isGameOverFlag = true;
    clearInterval(gameInterval);
    gameInterval = null;
    
    // Создаем кастомное уведомление
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.85);
        backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        font-family: monospace;
        animation: fadeIn 0.3s ease;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: linear-gradient(145deg, #1a2538, #0f1825);
        padding: 40px 50px;
        border-radius: 48px;
        text-align: center;
        border: 1px solid rgba(255,200,100,0.3);
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        animation: slideUp 0.4s ease;
    `;
    
    modal.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 20px;">💀</div>
        <div style="font-size: 2rem; color: #ffcc77; margin-bottom: 20px; font-weight: bold;">ИГРА ОКОНЧЕНА</div>
        <div style="font-size: 1.5rem; color: #aaffdd; margin-bottom: 30px;">Счёт: ${score}</div>
        <button id="gameOverReset" style="
            background: linear-gradient(135deg, #3e6b9b, #1c4668);
            border: none;
            font-size: 1.2rem;
            padding: 12px 28px;
            border-radius: 40px;
            color: white;
            cursor: pointer;
            font-weight: bold;
            transition: transform 0.2s;
        ">🔄 Новая игра</button>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    document.getElementById('gameOverReset').onclick = () => {
        document.body.removeChild(overlay);
        resetGame();
    };
    
    // Добавляем стили анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

function resetGame() {
    if (gameInterval) clearInterval(gameInterval);
    isGameOverFlag = false;
    
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            board[row][col] = 0;
        }
    }
    
    score = 0;
    level = 0;
    intervalTime = 500;
    animatingRows = [];
    updateUI();
    nextPiece = randomPiece();
    spawnNewPiece();
    drawNext();
    draw();
    
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameTick, intervalTime);
}

// ---------- УПРАВЛЕНИЕ ----------
document.addEventListener('keydown', (e) => {
    if (isGameOverFlag) {
        if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter') {
            resetGame();
        }
        e.preventDefault();
        return;
    }
    
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