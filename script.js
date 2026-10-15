// Simple Pong game
// Left paddle: player (mouse + arrow keys)
// Right paddle: simple AI
// Scoreboard, collision detection, ball bounce angle based on hit position

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

// Game objects
const paddleWidth = 12;
const paddleHeight = 100;
const paddleSpeed = 6; // keyboard speed
const aiSpeed = 4.0; // right paddle follow speed

const ballRadius = 8;
let leftScore = 0;
let rightScore = 0;

const leftPaddle = {
  x: 20,
  y: (H - paddleHeight) / 2,
  w: paddleWidth,
  h: paddleHeight
};

const rightPaddle = {
  x: W - 20 - paddleWidth,
  y: (H - paddleHeight) / 2,
  w: paddleWidth,
  h: paddleHeight
};

const ball = {
  x: W / 2,
  y: H / 2,
  r: ballRadius,
  vx: 0,
  vy: 0,
  speed: 5
};

// Input state
let upPressed = false;
let downPressed = false;
let mouseControlY = null; // when set, mouse controls left paddle

// Initialize ball with random direction
function resetBall(direction = null) {
  ball.x = W / 2;
  ball.y = H / 2;
  ball.speed = 5;
  // direction: 'left' or 'right' or null(random)
  const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8); // -22.5deg..22.5deg
  const dir = direction === 'left' ? -1 : direction === 'right' ? 1 : (Math.random() < 0.5 ? -1 : 1);
  ball.vx = dir * ball.speed * Math.cos(angle);
  ball.vy = ball.speed * Math.sin(angle);
}

// Draw helpers
function drawRect(x, y, w, h, color = '#fff') {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function drawCircle(x, y, r, color = '#fff') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function drawNet() {
  const seg = 10;
  const gap = 10;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let y = 0; y < H; y += seg + gap) {
    ctx.fillRect(W/2 - 1, y, 2, seg);
  }
}

// Update physics and game logic
let lastTime = 0;
let pausedUntil = 0;

function update(dt) {
  // Move left paddle: keyboard
  if (upPressed) leftPaddle.y -= paddleSpeed;
  if (downPressed) leftPaddle.y += paddleSpeed;

  // Mouse control overrides keyboard when active
  if (mouseControlY !== null) {
    // center paddle on mouse y
    leftPaddle.y = mouseControlY - leftPaddle.h / 2;
  }

  // Clamp left paddle
  if (leftPaddle.y < 0) leftPaddle.y = 0;
  if (leftPaddle.y + leftPaddle.h > H) leftPaddle.y = H - leftPaddle.h;

  // Right paddle AI: follow the ball with a bit of delay/chance
  // Try to move toward ball center but limit speed
  const rightCenter = rightPaddle.y + rightPaddle.h / 2;
  if (ball.y < rightCenter - 8) {
    rightPaddle.y -= aiSpeed;
  } else if (ball.y > rightCenter + 8) {
    rightPaddle.y += aiSpeed;
  }
  // Clamp right paddle
  if (rightPaddle.y < 0) rightPaddle.y = 0;
  if (rightPaddle.y + rightPaddle.h > H) rightPaddle.y = H - rightPaddle.h;

  // Move ball only if not paused
  if (performance.now() < pausedUntil) return;

  ball.x += ball.vx;
  ball.y += ball.vy;

  // Collide top/bottom walls
  if (ball.y - ball.r <= 0) {
    ball.y = ball.r;
    ball.vy = -ball.vy;
  } else if (ball.y + ball.r >= H) {
    ball.y = H - ball.r;
    ball.vy = -ball.vy;
  }

  // Paddle collisions
  // Left paddle
  if (ball.vx < 0) {
    if (ball.x - ball.r <= leftPaddle.x + leftPaddle.w) {
      if (ball.y >= leftPaddle.y && ball.y <= leftPaddle.y + leftPaddle.h) {
        // collision
        ball.x = leftPaddle.x + leftPaddle.w + ball.r; // prevent sticking
        reflectOffPaddle(leftPaddle);
      }
    }
  } else { // Right paddle
    if (ball.x + ball.r >= rightPaddle.x) {
      if (ball.y >= rightPaddle.y && ball.y <= rightPaddle.y + rightPaddle.h) {
        ball.x = rightPaddle.x - ball.r;
        reflectOffPaddle(rightPaddle);
      }
    }
  }

  // Score: ball went out left or right
  if (ball.x < -ball.r) {
    // right player scores
    rightScore++;
    updateScoreboard();
    resetBall('right'); // launch to right side (toward scorer) for fairness
    pausedUntil = performance.now() + 800; // short pause
  } else if (ball.x > W + ball.r) {
    leftScore++;
    updateScoreboard();
    resetBall('left');
    pausedUntil = performance.now() + 800;
  }

  // Gradually increase speed over time (small)
  const speedUp = 0.0005 * dt;
  ball.speed += speedUp;
  const sp = Math.hypot(ball.vx, ball.vy);
  if (sp > 0) {
    ball.vx = (ball.vx / sp) * ball.speed;
    ball.vy = (ball.vy / sp) * ball.speed;
  }
}

function reflectOffPaddle(paddle) {
  // Compute hit position relative to paddle center: [-1 .. 1]
  const relativeY = (ball.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
  const maxBounce = Math.PI / 3; // 60 degrees max
  const bounceAngle = relativeY * maxBounce;
  const dir = (paddle === leftPaddle) ? 1 : -1;
  ball.vx = dir * ball.speed * Math.cos(bounceAngle);
  ball.vy = ball.speed * Math.sin(bounceAngle);

  // Slightly increase speed on paddle hit
  ball.speed *= 1.03;
}

// Drawing
function render() {
  // Clear
  ctx.clearRect(0, 0, W, H);

  // Background subtle
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.fillRect(0,0,W,H);

  // Draw net
  drawNet();

  // Draw paddles
  drawRect(leftPaddle.x, leftPaddle.y, leftPaddle.w, leftPaddle.h, '#9df0be');
  drawRect(rightPaddle.x, rightPaddle.y, rightPaddle.w, rightPaddle.h, '#9df0be');

  // Draw ball
  drawCircle(ball.x, ball.y, ball.r, '#fff');

  // Optionally show paused or countdown
  if (performance.now() < pausedUntil) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Get ready...', W/2, H/2 - 30);
  }
}

// Scoreboard DOM update
function updateScoreboard() {
  document.getElementById('leftScore').textContent = leftScore;
  document.getElementById('rightScore').textContent = rightScore;
}

// Main loop
function loop(timestamp) {
  const dt = timestamp - (lastTime || timestamp);
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// Input handlers
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  mouseControlY = y;
});

canvas.addEventListener('mouseleave', () => {
  mouseControlY = null;
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    upPressed = true;
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    downPressed = true;
    e.preventDefault();
  } else if (e.key === ' ') {
    // space to resume if paused
    pausedUntil = 0;
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp') upPressed = false;
  else if (e.key === 'ArrowDown') downPressed = false;
});

// Initialize
resetBall();
updateScoreboard();
requestAnimationFrame(loop);

// Make canvas crisp on high-DPI screens (optional)
(function scaleForHiDPI(){
  const dpr = window.devicePixelRatio || 1;
  if (dpr === 1) return;
  const logicalW = canvas.width;
  const logicalH = canvas.height;
  canvas.width = logicalW * dpr;
  canvas.height = logicalH * dpr;
  canvas.style.width = logicalW + 'px';
  canvas.style.height = logicalH + 'px';
  ctx.scale(dpr, dpr);
})();
