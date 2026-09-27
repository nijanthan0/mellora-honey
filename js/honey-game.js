/* ==========================================================================
   MELLORA ARTISAN RAW HONEY - NECTAR HARVEST GAME
   Interactive arcade game replacing static spoon stage:
   - Catch golden drops and wild nectar into your artisan jar
   - Avoid falling raindrops
   - Reach 100% full jar to unlock a real 15% discount code (QUEENBEE15)!
   ========================================================================== */

class HoneyHarvestGame {
  constructor(canvasId = 'honey-game-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;

    // Game state
    this.state = 'START'; // 'START', 'PLAYING', 'VICTORY', 'GAME_OVER'
    this.score = 0;
    this.targetScore = 100;
    this.lives = 3;
    this.combo = 0;

    // Player (Honey Jar)
    this.jar = {
      x: 0,
      targetX: 0,
      y: 0,
      width: 84,
      height: 72,
      fillLevel: 0, // 0 to 1
      tilt: 0
    };

    // Falling items & particles
    this.items = [];
    this.splashes = [];
    this.floatingTexts = [];
    this.spawnTimer = 0;
    this.lastTime = 0;

    // Keys
    this.keys = { left: false, right: false };

    // Audio hook
    this.onSound = null;

    // DOM UI Overlays
    this.ui = {
      score: document.getElementById('game-score-val'),
      fillBar: document.getElementById('game-fill-bar'),
      fillPct: document.getElementById('game-fill-pct'),
      lives: document.getElementById('game-lives-val'),
      startOverlay: document.getElementById('game-start-overlay'),
      victoryOverlay: document.getElementById('game-victory-overlay'),
      gameOverOverlay: document.getElementById('game-over-overlay'),
      startBtn: document.getElementById('game-start-btn'),
      retryBtn: document.getElementById('game-retry-btn'),
      playAgainBtn: document.getElementById('game-play-again-btn'),
      applyPromoBtn: document.getElementById('game-apply-promo-btn')
    };

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupControls();

    // Start loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 440;
    this.height = rect.height || 500;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.jar.y = this.height - 80;
    this.jar.x = this.width / 2;
    this.jar.targetX = this.jar.x;
  }

  setupControls() {
    // Mouse movement
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      this.jar.targetX = Math.max(this.jar.width / 2, Math.min(this.width - this.jar.width / 2, mouseX));
    });

    // Touch movement
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      this.jar.targetX = Math.max(this.jar.width / 2, Math.min(this.width - this.jar.width / 2, touchX));
    }, { passive: false });

    // Keyboard support
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
    });

    // Button hooks
    if (this.ui.startBtn) this.ui.startBtn.addEventListener('click', () => this.startGame());
    if (this.ui.retryBtn) this.ui.retryBtn.addEventListener('click', () => this.startGame());
    if (this.ui.playAgainBtn) this.ui.playAgainBtn.addEventListener('click', () => this.startGame());

    if (this.ui.applyPromoBtn) {
      this.ui.applyPromoBtn.addEventListener('click', () => {
        const promoInput = document.getElementById('promo-code-input');
        const applyBtn = document.getElementById('apply-promo-btn');
        if (promoInput && applyBtn) {
          promoInput.value = 'QUEENBEE15';
          applyBtn.click();
        }
        // Open cart
        const cartTrigger = document.querySelector('.cart-btn');
        if (cartTrigger) cartTrigger.click();
      });
    }
  }

  startGame() {
    this.state = 'PLAYING';
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.items = [];
    this.splashes = [];
    this.floatingTexts = [];
    this.spawnTimer = 0;
    this.jar.fillLevel = 0;

    if (this.ui.startOverlay) this.ui.startOverlay.style.display = 'none';
    if (this.ui.victoryOverlay) this.ui.victoryOverlay.style.display = 'none';
    if (this.ui.gameOverOverlay) this.ui.gameOverOverlay.style.display = 'none';

    this.updateUI();
  }

  updateUI() {
    if (this.ui.score) this.ui.score.textContent = this.score;

    const fillRatio = Math.min(1, this.score / this.targetScore);
    this.jar.fillLevel = fillRatio;

    if (this.ui.fillBar) this.ui.fillBar.style.width = `${fillRatio * 100}%`;
    if (this.ui.fillPct) this.ui.fillPct.textContent = `${Math.round(fillRatio * 100)}%`;

    if (this.ui.lives) {
      let hearts = '';
      for (let i = 0; i < this.lives; i++) hearts += '🐝 ';
      this.ui.lives.textContent = hearts.trim();
    }
  }

  spawnItem() {
    const rand = Math.random();
    let type = 'HONEY';
    let points = 10;
    let radius = 14;
    let speed = 2.4 + Math.random() * 1.5;

    if (rand < 0.55) {
      // Regular Golden Honey Drop
      type = 'HONEY';
      points = 10;
      radius = 13;
    } else if (rand < 0.75) {
      // Lavender Nectar Drop
      type = 'LAVENDER';
      points = 15;
      radius = 12;
      speed += 0.5;
    } else if (rand < 0.88) {
      // Royal Jelly Star Drop (Rare bonus)
      type = 'ROYAL_STAR';
      points = 25;
      radius = 16;
      speed += 0.8;
    } else {
      // Raindrop (Hazard!)
      type = 'RAINDROP';
      points = -1; // lose life
      radius = 11;
      speed += 1.2;
    }

    const padding = 40;
    this.items.push({
      x: padding + Math.random() * (this.width - padding * 2),
      y: -20,
      vy: speed,
      vx: (Math.random() - 0.5) * 0.8,
      wobbleSeed: Math.random() * 100,
      radius,
      type,
      points
    });
  }

  addSplash(x, y, color) {
    for (let i = 0; i < 9; i++) {
      const angle = (Math.PI / 8) + (i / 9) * (Math.PI * 0.75);
      const spd = 2 + Math.random() * 3.5;
      this.splashes.push({
        x,
        y,
        vx: Math.cos(angle) * spd * (i % 2 === 0 ? 1 : -1),
        vy: -Math.sin(angle) * spd,
        radius: 2 + Math.random() * 3,
        alpha: 1,
        color
      });
    }
  }

  addFloatingText(x, y, text, color) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      vy: -1.6,
      alpha: 1
    });
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;

    // Keyboard motion
    const speedKbd = 8;
    if (this.keys.left) this.jar.targetX = Math.max(this.jar.width / 2, this.jar.targetX - speedKbd);
    if (this.keys.right) this.jar.targetX = Math.min(this.width - this.jar.width / 2, this.jar.targetX + speedKbd);

    // Smooth jar position
    const dx = this.jar.targetX - this.jar.x;
    this.jar.x += dx * 0.18;
    this.jar.tilt = Math.max(-0.15, Math.min(0.15, dx * 0.015));

    // Spawn items
    this.spawnTimer++;
    const spawnRate = Math.max(38, 65 - Math.floor(this.score / 20) * 5);
    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;
      this.spawnItem();
    }

    // Jar catch boundary
    const jarLeft = this.jar.x - this.jar.width / 2;
    const jarRight = this.jar.x + this.jar.width / 2;
    const jarTop = this.jar.y;

    // Update items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += item.vy;
      item.x += Math.sin(item.y * 0.04 + item.wobbleSeed) * 0.7 + item.vx;

      // Check catch
      if (item.y >= jarTop && item.y <= jarTop + 24) {
        if (item.x >= jarLeft && item.x <= jarRight) {
          // CAUGHT!
          if (item.type === 'RAINDROP') {
            this.lives--;
            this.addSplash(item.x, jarTop, 'rgba(147, 197, 253, 0.8)');
            this.addFloatingText(item.x, jarTop - 10, '💔 Raindrop!', '#f87171');
            if (this.onSound) this.onSound('hazard');

            if (this.lives <= 0) {
              this.state = 'GAME_OVER';
              if (this.ui.gameOverOverlay) this.ui.gameOverOverlay.style.display = 'flex';
            }
          } else {
            this.score += item.points;
            this.combo++;

            let splashColor = '#fbbf24';
            if (item.type === 'LAVENDER') splashColor = '#c084fc';
            if (item.type === 'ROYAL_STAR') splashColor = '#fef08a';

            this.addSplash(item.x, jarTop, splashColor);
            this.addFloatingText(item.x, jarTop - 10, `+${item.points}`, splashColor);

            if (this.onSound) this.onSound('catch', item.type);

            // Check Victory!
            if (this.score >= this.targetScore) {
              this.state = 'VICTORY';
              if (this.ui.victoryOverlay) this.ui.victoryOverlay.style.display = 'flex';
              if (window.beeEngine) {
                // Pollen fireworks
                for (let k = 0; k < 6; k++) {
                  setTimeout(() => {
                    window.beeEngine.spawnPollenBurst(this.jar.x, this.jar.y);
                  }, k * 180);
                }
              }
            }
          }

          this.updateUI();
          this.items.splice(i, 1);
          continue;
        }
      }

      // Fell off screen
      if (item.y > this.height + 30) {
        this.items.splice(i, 1);
      }
    }

    // Update Splashes
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.25; // gravity
      s.alpha -= 0.035;
      if (s.alpha <= 0) this.splashes.splice(i, 1);
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.025;
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  drawJar(ctx) {
    const { x, y, width, height, fillLevel, tilt } = this.jar;

    ctx.save();
    ctx.translate(x, y + height / 2);
    ctx.rotate(tilt);

    // 1. Honey Liquid inside the jar
    if (fillLevel > 0) {
      const liquidHeight = (height - 18) * fillLevel;
      const liquidTop = (height / 2) - liquidHeight;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-width * 0.44, -height * 0.45, width * 0.88, height * 0.9, 12);
      ctx.clip();

      const honeyGrad = ctx.createLinearGradient(0, liquidTop, 0, height / 2);
      honeyGrad.addColorStop(0, '#fef08a');
      honeyGrad.addColorStop(0.3, '#f59e0b');
      honeyGrad.addColorStop(0.8, '#d97706');
      honeyGrad.addColorStop(1, '#78350f');

      ctx.fillStyle = honeyGrad;
      ctx.fillRect(-width / 2, liquidTop, width, liquidHeight + 10);

      // Liquid Surface meniscus
      ctx.beginPath();
      ctx.ellipse(0, liquidTop, width * 0.42, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#fffbeb';
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.restore();
    }

    // 2. Glass Jar Contour
    ctx.beginPath();
    ctx.roundRect(-width * 0.46, -height * 0.46, width * 0.92, height * 0.92, [4, 4, 16, 16]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Jar Rim at top
    ctx.beginPath();
    ctx.roundRect(-width * 0.48, -height * 0.48 - 4, width * 0.96, 8, 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Specular glass highlight streak
    ctx.beginPath();
    ctx.moveTo(-width * 0.36, -height * 0.35);
    ctx.lineTo(-width * 0.36, height * 0.35);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Label
    ctx.fillStyle = 'rgba(18, 14, 10, 0.85)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-width * 0.34, -height * 0.12, width * 0.68, height * 0.34, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 9px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText('MELLORA', 0, 0);

    ctx.fillStyle = '#e2d3c1';
    ctx.font = '600 7px "Outfit", sans-serif';
    ctx.fillText('RAW HONEY', 0, 10);

    ctx.restore();
  }

  drawItems(ctx) {
    this.items.forEach((item) => {
      ctx.save();
      ctx.translate(item.x, item.y);

      if (item.type === 'HONEY') {
        // Glistening Golden Honey Drop
        ctx.beginPath();
        ctx.moveTo(0, -item.radius * 1.3);
        ctx.quadraticCurveTo(-item.radius, 0, -item.radius, item.radius * 0.5);
        ctx.arc(0, item.radius * 0.5, item.radius, 0, Math.PI);
        ctx.quadraticCurveTo(item.radius, 0, 0, -item.radius * 1.3);
        ctx.closePath();

        const grad = ctx.createRadialGradient(-item.radius * 0.3, -item.radius * 0.2, 1, 0, 0, item.radius * 1.4);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.4, '#fbbf24');
        grad.addColorStop(0.8, '#d97706');
        grad.addColorStop(1, '#78350f');

        ctx.fillStyle = grad;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.fill();

        // Specular dot
        ctx.beginPath();
        ctx.arc(-item.radius * 0.3, item.radius * 0.2, item.radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

      } else if (item.type === 'LAVENDER') {
        // Wild Lavender Flower Drop
        ctx.beginPath();
        ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, item.radius);
        grad.addColorStop(0, '#f3e8ff');
        grad.addColorStop(0.6, '#a855f7');
        grad.addColorStop(1, '#6b21a8');
        ctx.fillStyle = grad;
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 12;
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌸', 0, 1);

      } else if (item.type === 'ROYAL_STAR') {
        // Rare 24K Royal Star
        ctx.beginPath();
        ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, item.radius);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.5, '#fde047');
        grad.addColorStop(1, '#eab308');
        ctx.fillStyle = grad;
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 16;
        ctx.fill();

        ctx.fillStyle = '#1a1005';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', 0, 1);

      } else if (item.type === 'RAINDROP') {
        // Falling Raindrop (Water hazard!)
        ctx.beginPath();
        ctx.moveTo(0, -item.radius * 1.4);
        ctx.quadraticCurveTo(-item.radius, 0, -item.radius, item.radius * 0.6);
        ctx.arc(0, item.radius * 0.6, item.radius, 0, Math.PI);
        ctx.quadraticCurveTo(item.radius, 0, 0, -item.radius * 1.4);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, -item.radius, 0, item.radius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        grad.addColorStop(0.5, 'rgba(147, 197, 253, 0.8)');
        grad.addColorStop(1, 'rgba(59, 130, 246, 0.9)');
        ctx.fillStyle = grad;
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 8;
        ctx.fill();
      }

      ctx.restore();
    });
  }

  drawSplashes(ctx) {
    this.splashes.forEach((s) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.fill();
      ctx.restore();
    });
  }

  drawFloatingTexts(ctx) {
    this.floatingTexts.forEach((ft) => {
      ctx.save();
      ctx.font = '700 14px "Outfit", sans-serif';
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }

  animate(time) {
    const dt = time - this.lastTime;
    this.lastTime = time;

    this.ctx.clearRect(0, 0, this.width, this.height);

    this.update(dt);
    this.drawItems(this.ctx);
    this.drawSplashes(this.ctx);
    this.drawJar(this.ctx);
    this.drawFloatingTexts(this.ctx);

    requestAnimationFrame(this.animate);
  }
}

window.HoneyHarvestGame = HoneyHarvestGame;
