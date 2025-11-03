// ========== CARREGA TECLAS PERSONALIZADAS DAS CONFIGURAÇÕES ==========

const ability1Key = localStorage.getItem('ability1Key') || 'KeyC';
const ability2Key = localStorage.getItem('ability2Key') || 'KeyV';
const ability3Key = localStorage.getItem('ability3Key') || 'KeyB';

// ========== CARREGA MODO DE CONTROLE ==========

const controlMode = localStorage.getItem('controlMode') || 'arrows';

// ========== ✅ BUG FIX: TODO O CÓDIGO DENTRO DO DOMContentLoaded ==========

window.addEventListener('DOMContentLoaded', function() {

// ========== CARREGA A FASE INICIAL SALVA (ou começa na fase 1) ==========

let level = parseInt(localStorage.getItem('faseInicial')) || 1;
let lives = 3;
let paused = false;
let countdown = 0;
let savedDx = 0;
let savedDy = 0;
let countdownInterval = null;
let levelScore = 0;
let winner = false;
let score = 0;
let gameOver = false;
let bricks = [];

// ========== SISTEMA DE HABILIDADES ==========

let bigPaddleStored = false;
let bigPaddleActive = false;
let bigPaddleTimer = 0;
let bigPaddleInterval = null;
const ORIGINAL_PADDLE_WIDTH = 75;
const BIG_PADDLE_WIDTH = 225;
const BIG_PADDLE_DURATION = 20;

let extraLifeStored = false;
let extraLifeUsed = false;

let extraBallStored = false;
let extraBallActive = false;
let ball2Active = false;
let x2 = 0, y2 = 0, dx2 = 0, dy2 = 0;
const DOUBLE_PADDLE_WIDTH = 150;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ✅ CORREÇÃO: Canvas mantém tamanho do HTML (480x600)
// NÃO redefinir canvas.width e canvas.height aqui

// Bola 1 (principal)
const ballRadius = 10;
let x = canvas.width / 2;
let y = canvas.height - 30;

// ✅ BUG FIX: Limita velocidade máxima
let dx = Math.min(2 + (level - 1) * 0.3, 8);
let dy = Math.max(-2 - (level - 1) * 0.3, -8);
let collisionDetected = false;

// Raquete
const paddleHeight = 10;
let paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;

// Controle da raquete
let rightPressed = false;
let leftPressed = false;

// Blocos
const brickRowCount = 5;
const brickColumnCount = 7;
const brickWidth = 55;
const brickHeight = 20;
const brickPadding = 8;
const brickOffsetTop = 30;
const brickOffsetLeft = 30;

function getBlocosNecessarios(fase) {
    return fase * 10;
}

function criaBlocos() {
    bricks = [];
    
    const coresArcoIris = [
        'rgb(255, 0, 0)',
        'rgb(255, 127, 0)',
        'rgb(255, 255, 0)',
        'rgb(0, 255, 0)',
        'rgb(0, 0, 255)',
        'rgb(75, 0, 130)',
        'rgb(148, 0, 211)'
    ];
    
    const coresEmbaralhadas = [...coresArcoIris].sort(() => Math.random() - 0.5);
    const coresFileiras = coresEmbaralhadas.slice(0, 5);
    
    for(let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for(let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = {
                x: 0,
                y: 0,
                status: 1,
                color: coresFileiras[r],
                hits: 1
            };
        }
    }
    
    // ✅ BUG FIX: Garante exatamente 5 blocos brancos únicos
    let blocosExtrasAdicionados = 0;
    const corUnicaExtra = 'rgb(255, 255, 255)';
    
    while(blocosExtrasAdicionados < 5) {
        const colAleatoria = Math.floor(Math.random() * brickColumnCount);
        const linAleatoria = Math.floor(Math.random() * brickRowCount);
        
        if(bricks[colAleatoria][linAleatoria].color !== corUnicaExtra) {
            bricks[colAleatoria][linAleatoria].color = corUnicaExtra;
            bricks[colAleatoria][linAleatoria].hits = 2;
            blocosExtrasAdicionados++;
        }
    }
}

criaBlocos();

// Eventos do teclado
document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);

// Evento do mouse
if(controlMode === 'mouse') {
    canvas.addEventListener("mousemove", mouseMoveHandler);
}

function keyDownHandler(e) {
    if(controlMode === 'arrows') {
        if(e.code === "ArrowRight") rightPressed = true;
        else if(e.code === "ArrowLeft") leftPressed = true;
    }
    
    if(controlMode === 'wasd') {
        if(e.code === "KeyD") rightPressed = true;
        else if(e.code === "KeyA") leftPressed = true;
    }
    
    if(e.code === "Space") {
        if(gameOver) {
            if(winner) {
                nextLevel();
            } else {
                resetGame();
            }
        } else {
            if(paused) {
                startCountdown();
            } else {
                savedDx = dx;
                savedDy = dy;
                paused = true;
            }
        }
    }
    else if(e.code === ability1Key) {
        if(bigPaddleStored && !bigPaddleActive && !gameOver && !extraBallActive) {
            activateBigPaddle();
        }
    }
    else if(e.code === ability2Key) {
        if(extraLifeStored && !gameOver) {
            activateExtraLife();
        }
    }
    else if(e.code === ability3Key) {
        if(extraBallStored && !extraBallActive && !gameOver && !bigPaddleActive) {
            activateExtraBall();
        }
    }
}

function keyUpHandler(e) {
    if(controlMode === 'arrows') {
        if(e.code === "ArrowRight") rightPressed = false;
        else if(e.code === "ArrowLeft") leftPressed = false;
    }
    
    if(controlMode === 'wasd') {
        if(e.code === "KeyD") rightPressed = false;
        else if(e.code === "KeyA") leftPressed = false;
    }
}

// ✅ BUG FIX: Usa getBoundingClientRect()
function mouseMoveHandler(e) {
    const rect = canvas.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    
    if(relativeX > 0 && relativeX < canvas.width) {
        paddleX = relativeX - paddleWidth / 2;
        
        if(paddleX < 0) paddleX = 0;
        if(paddleX + paddleWidth > canvas.width) {
            paddleX = canvas.width - paddleWidth;
        }
    }
}

function startCountdown() {
    countdown = 3;
    
    if(countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    countdownInterval = setInterval(() => {
        countdown--;
        
        if(countdown <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            
            if(savedDx > 0) {
                dx = Math.max(savedDx - 0.2, 1);
            } else {
                dx = Math.min(savedDx + 0.2, -1);
            }
            
            if(savedDy > 0) {
                dy = Math.max(savedDy - 0.2, 1);
            } else {
                dy = Math.min(savedDy + 0.2, -1);
            }
            
            paused = false;
            extraLifeUsed = false;
        }
    }, 1000);
}

function nextLevel() {
    level++;
    levelScore = 0;
    score = 0;
    
    updateScoreDisplay();
    updateLivesDisplay();
    updateLevelDisplay();
    
    x = canvas.width / 2;
    y = canvas.height - 30;
    
    // ✅ BUG FIX: Limita velocidade máxima
    dx = Math.min(2 + (level - 1) * 0.3, 8);
    dy = Math.max(-2 - (level - 1) * 0.3, -8);
    
    paddleWidth = ORIGINAL_PADDLE_WIDTH;
    paddleX = (canvas.width - paddleWidth) / 2;
    
    if(bigPaddleActive) {
        deactivateBigPaddle();
    }
    
    if(extraBallActive) {
        deactivateExtraBall();
    }
    
    ball2Active = false;
    criaBlocos();
    gameOver = false;
    winner = false;
    draw();
}

function recarregaBlocos() {
    paused = true;
    countdown = 3;
    
    dx = dx * 0.8;
    dy = dy * 0.8;
    
    if(Math.abs(dx) < 1) dx = dx > 0 ? 1 : -1;
    if(Math.abs(dy) < 1) dy = dy > 0 ? 1 : -1;
    
    if(countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    countdownInterval = setInterval(() => {
        countdown--;
        
        if(countdown <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            criaBlocos();
            paused = false;
        }
    }, 1000);
}

function collisionDetection() {
    collisionDetected = false;
    let blocosRestantes = 0;
    
    for(let c = 0; c < brickColumnCount; c++) {
        for(let r = 0; r < brickRowCount; r++) {
            let b = bricks[c][r];
            
            if(b.status === 1) {
                blocosRestantes++;
                
                if(x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
                    if(!collisionDetected) {
                        dy = -dy;
                        collisionDetected = true;
                        
                        b.hits--;
                        if(b.hits <= 0) {
                            b.status = 0;
                            score++;
                            levelScore++;
                            updateScoreDisplay();
                            
                            if(b.color === 'rgb(255, 255, 255)') {
                                if(Math.random() < 0.4) {
                                    grantRandomAbility();
                                }
                            }
                            
                            if(dx > 0) dx = Math.min(dx + 0.2, 8);
                            else dx = Math.max(dx - 0.2, -8);
                            
                            if(dy > 0) dy = Math.min(dy + 0.2, 8);
                            else dy = Math.max(dy - 0.2, -8);
                            
                            if(levelScore >= getBlocosNecessarios(level)) {
                                winner = true;
                                gameOver = true;
                            }
                        }
                    }
                }
                
                if(ball2Active && x2 > b.x && x2 < b.x + brickWidth && y2 > b.y && y2 < b.y + brickHeight) {
                    dy2 = -dy2;
                    
                    b.hits--;
                    if(b.hits <= 0) {
                        b.status = 0;
                        score++;
                        levelScore++;
                        updateScoreDisplay();
                        
                        if(b.color === 'rgb(255, 255, 255)') {
                            if(Math.random() < 0.4) {
                                grantRandomAbility();
                            }
                        }
                        
                        if(dx2 > 0) dx2 = Math.min(dx2 + 0.2, 8);
                        else dx2 = Math.max(dx2 - 0.2, -8);
                        
                        if(dy2 > 0) dy2 = Math.min(dy2 + 0.2, 8);
                        else dy2 = Math.max(dy2 - 0.2, -8);
                        
                        if(levelScore >= getBlocosNecessarios(level)) {
                            winner = true;
                            gameOver = true;
                        }
                    }
                }
            }
        }
    }
    
    if(blocosRestantes === 0 && levelScore < getBlocosNecessarios(level) && !gameOver) {
        recarregaBlocos();
    }
}

function grantRandomAbility() {
    const availableAbilities = [];
    
    if(!bigPaddleStored && !bigPaddleActive && !extraBallActive) {
        availableAbilities.push('bigPaddle');
    }
    
    if(!extraLifeStored) {
        availableAbilities.push('extraLife');
    }
    
    if(!extraBallStored && !extraBallActive && !bigPaddleActive) {
        availableAbilities.push('extraBall');
    }
    
    if(availableAbilities.length === 0) return;
    
    const randomAbility = availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
    
    if(randomAbility === 'bigPaddle') {
        storeBigPaddle();
    } else if(randomAbility === 'extraLife') {
        storeExtraLife();
    } else if(randomAbility === 'extraBall') {
        storeExtraBall();
    }
}

function storeBigPaddle() {
    bigPaddleStored = true;
    updateAbilityDisplay();
}

function activateBigPaddle() {
    if(!bigPaddleStored || extraBallActive) return;
    
    bigPaddleStored = false;
    bigPaddleActive = true;
    bigPaddleTimer = BIG_PADDLE_DURATION;
    paddleWidth = BIG_PADDLE_WIDTH;
    
    if(paddleX + paddleWidth > canvas.width) {
        paddleX = canvas.width - paddleWidth;
    }
    
    updateAbilityDisplay();
    
    if(bigPaddleInterval) {
        clearInterval(bigPaddleInterval);
    }
    
    bigPaddleInterval = setInterval(() => {
        bigPaddleTimer--;
        updateAbilityDisplay();
        
        if(bigPaddleTimer <= 0) {
            deactivateBigPaddle();
        }
    }, 1000);
}

function deactivateBigPaddle() {
    bigPaddleActive = false;
    bigPaddleTimer = 0;
    paddleWidth = ORIGINAL_PADDLE_WIDTH;
    
    if(paddleX + paddleWidth > canvas.width) {
        paddleX = canvas.width - paddleWidth;
    }
    
    if(bigPaddleInterval) {
        clearInterval(bigPaddleInterval);
        bigPaddleInterval = null;
    }
    
    updateAbilityDisplay();
}

function storeExtraLife() {
    extraLifeStored = true;
    updateAbilityDisplay();
}

function activateExtraLife() {
    if(!extraLifeStored) return;
    
    extraLifeStored = false;
    lives++;
    extraLifeUsed = true;
    
    updateLivesDisplay();
    updateAbilityDisplay();
    
    paused = true;
    startCountdown();
}

function autoActivateExtraLife() {
    if(!extraLifeStored || extraLifeUsed) return false;
    
    extraLifeStored = false;
    lives = 1;
    extraLifeUsed = true;
    
    updateLivesDisplay();
    updateAbilityDisplay();
    
    x = canvas.width / 2;
    y = canvas.height / 2;
    paddleX = (canvas.width - paddleWidth) / 2;
    
    if(Math.abs(dx) > 5) dx = dx / 2;
    if(Math.abs(dy) > 5) dy = dy / 2;
    
    if(Math.abs(dx) < 1) dx = dx > 0 ? 1 : -1;
    if(Math.abs(dy) < 1) dy = dy > 0 ? 1 : -1;
    
    savedDx = dx;
    savedDy = dy;
    
    paused = true;
    startCountdown();
    
    return true;
}

function storeExtraBall() {
    extraBallStored = true;
    updateAbilityDisplay();
}

function activateExtraBall() {
    if(!extraBallStored || bigPaddleActive) return;
    
    extraBallStored = false;
    extraBallActive = true;
    ball2Active = true;
    paddleWidth = DOUBLE_PADDLE_WIDTH;
    
    if(paddleX + paddleWidth > canvas.width) {
        paddleX = canvas.width - paddleWidth;
    }
    
    x2 = x + 30;
    y2 = y - 20;
    dx2 = -dx;
    dy2 = dy;
    
    updateAbilityDisplay();
}

function deactivateExtraBall() {
    extraBallActive = false;
    ball2Active = false;
    paddleWidth = ORIGINAL_PADDLE_WIDTH;
    
    if(paddleX + paddleWidth > canvas.width) {
        paddleX = canvas.width - paddleWidth;
    }
    
    updateAbilityDisplay();
}

function updateAbilityDisplay() {
    const ability1 = document.getElementById('ability1');
    const ability1Status = document.getElementById('ability1Status');
    const ability1Hint = document.getElementById('ability1Hint');
    
    const ability2 = document.getElementById('ability2');
    const ability2Status = document.getElementById('ability2Status');
    const ability2Hint = document.getElementById('ability2Hint');
    
    const ability3 = document.getElementById('ability3');
    const ability3Status = document.getElementById('ability3Status');
    const ability3Hint = document.getElementById('ability3Hint');
    
    if(bigPaddleActive) {
        ability1.className = 'ability ability-active';
        ability1Status.textContent = 'Ativa: ' + bigPaddleTimer + 's';
        ability1Hint.textContent = '';
    } else if(bigPaddleStored) {
        ability1.className = 'ability ability-ready';
        ability1Status.textContent = 'Pronta!';
        ability1Hint.textContent = 'Pressione "C"';
    } else {
        ability1.className = 'ability ability-inactive';
        ability1Status.textContent = 'Bloqueado';
        ability1Hint.textContent = '';
    }
    
    if(extraLifeStored) {
        ability2.className = 'ability ability-ready';
        ability2Status.textContent = 'Pronta!';
        ability2Hint.textContent = 'Pressione "V"';
    } else {
        ability2.className = 'ability ability-inactive';
        ability2Status.textContent = 'Bloqueado';
        ability2Hint.textContent = '';
    }
    
    if(extraBallActive) {
        ability3.className = 'ability ability-active';
        ability3Status.textContent = 'Ativa!';
        ability3Hint.textContent = '2 Bolinhas';
    } else if(extraBallStored) {
        ability3.className = 'ability ability-ready';
        ability3Status.textContent = 'Pronta!';
        ability3Hint.textContent = 'Pressione "B"';
    } else {
        ability3.className = 'ability ability-inactive';
        ability3Status.textContent = 'Bloqueado';
        ability3Hint.textContent = '';
    }
}

function updateScoreDisplay() {
    document.getElementById('score-display').textContent = score;
}

function updateLivesDisplay() {
    document.getElementById('lives-display').textContent = lives;
}

function updateLevelDisplay() {
    document.getElementById('level-display').textContent = level;
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI*2);
    ctx.fillStyle = "#a6f750";
    ctx.fill();
    ctx.closePath();
    
    if(ball2Active) {
        ctx.beginPath();
        ctx.arc(x2, y2, ballRadius, 0, Math.PI*2);
        ctx.fillStyle = "#f7a850";
        ctx.fill();
        ctx.closePath();
    }
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, canvas.height - paddleHeight - 10, paddleWidth, paddleHeight);
    ctx.fillStyle = "#a6f750";
    ctx.fill();
    ctx.closePath();
}

function drawBricks() {
    for(let c = 0; c < brickColumnCount; c++) {
        for(let r = 0; r < brickRowCount; r++) {
            if(bricks[c][r].status === 1) {
                let brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                let brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                
                if(bricks[c][r].color === 'rgb(255, 255, 255)' && bricks[c][r].hits === 1) {
                    ctx.globalAlpha = 0.5;
                }
                
                ctx.fillStyle = bricks[c][r].color;
                ctx.fill();
                ctx.closePath();
                
                ctx.globalAlpha = 1.0;
            }
        }
    }
}

function drawGameOver() {
    const faseInicial = parseInt(localStorage.getItem('faseInicial')) || 1;
    
    ctx.fillStyle = "rgba(24,24,37, 0.95)";
    ctx.fillRect(50, 50, 380, 220);
    
    ctx.font = "36px Arial";
    ctx.fillStyle = "#a6f750";
    ctx.fillText("Game Over", 140, 110);
    
    ctx.font = "18px Arial";
    ctx.fillText('Fase: ' + level, 200, 150);
    ctx.fillText('Score Final: ' + score, 170, 180);
    ctx.fillText('Pressione "Espaço" para recomeçar', 110, 220);
    
    ctx.font = "14px Arial";
    ctx.fillStyle = "#a6f750";
    ctx.fillText('(Voltará para Fase ' + faseInicial + ')', 150, 245);
}

function drawWinner() {
    ctx.fillStyle = "rgba(24,24,37, 0.95)";
    ctx.fillRect(50, 70, 380, 180);
    
    ctx.font = "36px Arial";
    ctx.fillStyle = "#a6f750";
    ctx.fillText("Fase Completa!", 110, 120);
    
    ctx.font = "18px Arial";
    ctx.fillText('Fase ' + level + ' concluída!', 170, 160);
    ctx.fillText('Score: ' + score, 190, 190);
    ctx.fillText('Pressione "Espaço" para próxima fase', 90, 230);
}

function drawPause() {
    ctx.fillStyle = "rgba(24,24,37, 0.95)";
    ctx.fillRect(50, 90, 380, 140);
    
    ctx.font = "48px Arial";
    ctx.fillStyle = "#a6f750";
    ctx.fillText("PAUSE", 170, 170);
    
    ctx.font = "16px Arial";
    ctx.fillText('Pressione "Espaço" para continuar', 120, 210);
}

function drawCountdown() {
    ctx.fillStyle = "rgba(24,24,37, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = "72px Arial";
    ctx.fillStyle = "#a6f750";
    ctx.textAlign = "center";
    ctx.fillText(countdown, canvas.width / 2, canvas.height / 2 + 20);
    ctx.textAlign = "left";
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBricks();
    drawBall();
    drawPaddle();
    
    if(countdown > 0) {
        drawCountdown();
        requestAnimationFrame(draw);
        return;
    }
    
    if(paused) {
        drawPause();
        requestAnimationFrame(draw);
        return;
    }
    
    collisionDetection();
    
    if(gameOver) {
        if(winner) {
            drawWinner();
        } else {
            drawGameOver();
        }
        return;
    }
    
    if(x + dx > canvas.width - ballRadius || x + dx < ballRadius) dx = -dx;
    if(y + dy < ballRadius) dy = -dy;
    else if(y + dy > canvas.height - ballRadius - paddleHeight - 10) {
        if(x > paddleX && x < paddleX + paddleWidth) {
            dy = -dy;
        } else {
            if(ball2Active) {
                ball2Active = false;
                deactivateExtraBall();
                
                x = canvas.width / 2;
                y = canvas.height - 30;
                dx = Math.min(2 + (level - 1) * 0.3, 8);
                dy = Math.max(-2 - (level - 1) * 0.3, -8);
                paddleX = (canvas.width - paddleWidth) / 2;
            } else {
                lives--;
                updateLivesDisplay();
                
                if(lives <= 0) {
                    const lifeRestored = autoActivateExtraLife();
                    if(!lifeRestored) {
                        gameOver = true;
                    }
                } else {
                    if(Math.abs(dx) > 5) dx = dx / 2;
                    if(Math.abs(dy) > 5) dy = dy / 2;
                    
                    if(Math.abs(dx) < 1) dx = dx > 0 ? 1 : -1;
                    if(Math.abs(dy) < 1) dy = dy > 0 ? 1 : -1;
                    
                    x = canvas.width / 2;
                    y = canvas.height - 30;
                    paddleX = (canvas.width - paddleWidth) / 2;
                }
            }
        }
    }
    
    if(ball2Active) {
        if(x2 + dx2 > canvas.width - ballRadius || x2 + dx2 < ballRadius) dx2 = -dx2;
        if(y2 + dy2 < ballRadius) dy2 = -dy2;
        else if(y2 + dy2 > canvas.height - ballRadius - paddleHeight - 10) {
            if(x2 > paddleX && x2 < paddleX + paddleWidth) {
                dy2 = -dy2;
            } else {
                ball2Active = false;
                deactivateExtraBall();
            }
        }
        
        x2 += dx2;
        y2 += dy2;
    }
    
    if(rightPressed && paddleX < canvas.width - paddleWidth) paddleX += 5;
    else if(leftPressed && paddleX > 0) paddleX -= 5;
    
    x += dx;
    y += dy;
    
    requestAnimationFrame(draw);
}

function resetGame() {
    if(bigPaddleActive) {
        deactivateBigPaddle();
    }
    
    if(extraBallActive) {
        deactivateExtraBall();
    }
    
    bigPaddleStored = false;
    extraLifeStored = false;
    extraLifeUsed = false;
    extraBallStored = false;
    ball2Active = false;
    
    const faseInicial = parseInt(localStorage.getItem('faseInicial')) || 1;
    
    x = canvas.width / 2;
    y = canvas.height - 30;
    dx = Math.min(2 + (faseInicial - 1) * 0.3, 8);
    dy = Math.max(-2 - (faseInicial - 1) * 0.3, -8);
    paddleX = (canvas.width - paddleWidth) / 2;
    
    score = 0;
    lives = 3;
    level = faseInicial;
    levelScore = 0;
    paused = false;
    countdown = 0;
    savedDx = 0;
    savedDy = 0;
    
    if(countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    updateScoreDisplay();
    updateLivesDisplay();
    updateLevelDisplay();
    updateAbilityDisplay();
    
    criaBlocos();
    gameOver = false;
    winner = false;
    draw();
}

// ✅ INICIALIZAÇÃO - NÃO redefinir canvas.width e canvas.height
// O tamanho já está definido no HTML como 480x600

updateScoreDisplay();
updateLivesDisplay();
updateLevelDisplay();
draw();

// ========== TOUCH SUPPORT ==========

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

let touchStartX = null;

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchStartX = touch.clientX - rect.left;
    
    if(touchStartX > 0 && touchStartX < canvas.width) {
        paddleX = touchStartX - paddleWidth / 2;
        
        if(paddleX < 0) paddleX = 0;
        if(paddleX + paddleWidth > canvas.width) {
            paddleX = canvas.width - paddleWidth;
        }
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if(touchStartX === null) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const relativeX = touch.clientX - rect.left;
    
    if(relativeX > 0 && relativeX < canvas.width) {
        paddleX = relativeX - paddleWidth / 2;
        
        if(paddleX < 0) paddleX = 0;
        if(paddleX + paddleWidth > canvas.width) {
            paddleX = canvas.width - paddleWidth;
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    touchStartX = null;
}

// Touch duplo para pausar
let lastTouchTime = 0;

canvas.addEventListener('touchstart', function(e) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTouchTime;
    
    if(tapLength < 300 && tapLength > 0) {
        if(!gameOver) {
            if(paused) {
                startCountdown();
            } else {
                savedDx = dx;
                savedDy = dy;
                paused = true;
            }
        }
    }
    
    lastTouchTime = currentTime;
}, { passive: false });

// Botões virtuais mobile
if('ontouchstart' in window) {
    createMobileTouchButtons();
}

function createMobileTouchButtons() {
    const touchButtonsContainer = document.createElement('div');
    touchButtonsContainer.id = 'touch-buttons';
    touchButtonsContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 10px;
        z-index: 1000;
        pointer-events: none;
    `;
    
    const btn1 = document.createElement('button');
    btn1.textContent = '🎯';
    btn1.style.cssText = `
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: 3px solid #a6f750;
        background: rgba(24, 24, 37, 0.9);
        color: #a6f750;
        font-size: 24px;
        cursor: pointer;
        pointer-events: auto;
    `;
    
    btn1.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if(bigPaddleStored && !bigPaddleActive && !gameOver && !extraBallActive) {
            activateBigPaddle();
        }
    });
    
    const btn2 = document.createElement('button');
    btn2.textContent = '❤️';
    btn2.style.cssText = btn1.style.cssText;
    
    btn2.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if(extraLifeStored && !gameOver) {
            activateExtraLife();
        }
    });
    
    const btn3 = document.createElement('button');
    btn3.textContent = '⚡';
    btn3.style.cssText = btn1.style.cssText;
    
    btn3.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if(extraBallStored && !extraBallActive && !gameOver && !bigPaddleActive) {
            activateExtraBall();
        }
    });
    
    const btnPause = document.createElement('button');
    btnPause.textContent = '⏸️';
    btnPause.style.cssText = btn1.style.cssText;
    
    btnPause.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if(!gameOver) {
            if(paused) {
                startCountdown();
            } else {
                savedDx = dx;
                savedDy = dy;
                paused = true;
            }
        } else if(gameOver) {
            if(winner) {
                nextLevel();
            } else {
                resetGame();
            }
        }
    });
    
    touchButtonsContainer.appendChild(btn1);
    touchButtonsContainer.appendChild(btn2);
    touchButtonsContainer.appendChild(btn3);
    touchButtonsContainer.appendChild(btnPause);
    
    document.body.appendChild(touchButtonsContainer);
}

}); // FIM DO DOMContentLoaded
