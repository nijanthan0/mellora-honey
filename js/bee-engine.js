/* ==========================================================================
   MELLORA ARTISAN RAW HONEY - ULTRA-REALISTIC AUTONOMOUS BEE ENGINE
   Features:
   - High-resolution photographic macro specimen extraction & alpha-keying
   - Procedural anatomical fallback with fuzzy setae, chitin plates & compound eyes
   - High-frequency wing fluttering (180-230Hz) with iridescent motion blur fans
   - Dynamic 3D depth: altitude scaling, banking (roll), pitch, and real cast shadow
   - Biological flight behaviors: hovering micro-wobble, curiosity hover, darting,
     pollen gathering, and waggle dances.
   ========================================================================== */

class BeeEngine {
  constructor(canvasId = 'bee-canvas', pollenCanvasId = 'pollen-canvas') {
    this.canvas = document.getElementById(canvasId);
    this.pollenCanvas = document.getElementById(pollenCanvasId);
    if (!this.canvas || !this.pollenCanvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.pollenCtx = this.pollenCanvas.getContext('2d');

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;

    this.bees = [];
    this.pollenBursts = [];
    this.numBees = 5;
    this.isPaused = false;

    // Sprite assets
    this.spriteLoaded = false;
    this.bodySprite = null;
    this.leftWingSprite = null;
    this.rightWingSprite = null;

    this.mouse = {
      x: this.width / 2,
      y: this.height / 2,
      prevX: this.width / 2,
      prevY: this.height / 2,
      speed: 0,
      active: false,
      lastMoved: 0
    };

    this.audioCallback = null;

    this.init();
    this.loadSpecimenSprite();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Mouse tracking
    window.addEventListener('mousemove', (e) => {
      const dx = e.clientX - this.mouse.x;
      const dy = e.clientY - this.mouse.y;
      this.mouse.speed = Math.sqrt(dx * dx + dy * dy);
      this.mouse.prevX = this.mouse.x;
      this.mouse.prevY = this.mouse.y;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.active = true;
      this.mouse.lastMoved = performance.now();
    });

    window.addEventListener('mouseout', () => {
      this.mouse.active = false;
    });

    // Click to drop pollen flower
    window.addEventListener('click', (e) => {
      if (e.target.closest('button, a, input, select, textarea, .stage-btn, .header-tool-btn')) return;
      this.spawnPollenBurst(e.clientX, e.clientY);
    });

    // Initialize bees
    for (let i = 0; i < this.numBees; i++) {
      this.bees.push(this.createBee(i));
    }

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // Load and process photographic specimen
  loadSpecimenSprite() {
    const img = new Image();
    img.src = 'assets/images/bee-specimen.jpg';
    img.onload = () => {
      try {
        const size = 512;
        // 1. Process Body Sprite
        const bodyCanvas = document.createElement('canvas');
        bodyCanvas.width = size;
        bodyCanvas.height = size;
        const bCtx = bodyCanvas.getContext('2d');
        bCtx.drawImage(img, 0, 0, size, size);

        const imgData = bCtx.getImageData(0, 0, size, size);
        const d = imgData.data;

        // Mask out black background and static wings so we can animate wings dynamically
        const centerX = size / 2;
        const centerY = size / 2;

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const r = d[idx];
            const g = d[idx + 1];
            const b = d[idx + 2];
            const maxVal = Math.max(r, g, b);

            // Black background keying
            if (maxVal < 22) {
              d[idx + 3] = 0;
            } else if (maxVal < 65) {
              const alphaRatio = (maxVal - 22) / 43;
              d[idx + 3] = Math.round(d[idx + 3] * alphaRatio);
            }

            // Exclude static side wings from body sprite (keep central body, head, legs)
            const distFromCenter = Math.abs(x - centerX);
            const isWingArea = distFromCenter > 75 && y > 110 && y < 290;
            if (isWingArea) {
              // Fade out static wings
              const fade = Math.max(0, 1 - (distFromCenter - 75) / 25);
              d[idx + 3] = Math.round(d[idx + 3] * fade);
            }
          }
        }
        bCtx.putImageData(imgData, 0, 0);
        this.bodySprite = bodyCanvas;

        // 2. Process Wing Sprite (Extract high-res veined transparent wing)
        const wingCanvas = document.createElement('canvas');
        wingCanvas.width = 240;
        wingCanvas.height = 140;
        const wCtx = wingCanvas.getContext('2d');

        // Draw cropped right wing from specimen
        wCtx.drawImage(img, 280, 110, 220, 140, 0, 0, 240, 140);
        const wData = wCtx.getImageData(0, 0, 240, 140);
        const wd = wData.data;
        for (let i = 0; i < wd.length; i += 4) {
          const maxVal = Math.max(wd[i], wd[i + 1], wd[i + 2]);
          if (maxVal < 25) {
            wd[i + 3] = 0;
          } else if (maxVal < 80) {
            wd[i + 3] = Math.round(wd[i + 3] * ((maxVal - 25) / 55));
          }
        }
        wCtx.putImageData(wData, 0, 0);
        this.rightWingSprite = wingCanvas;

        this.spriteLoaded = true;
      } catch (err) {
        console.warn('Specimen image processing fallback to procedural rendering:', err);
        this.spriteLoaded = false;
      }
    };
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.pollenCanvas.width = this.width * this.dpr;
    this.pollenCanvas.height = this.height * this.dpr;
    this.pollenCanvas.style.width = `${this.width}px`;
    this.pollenCanvas.style.height = `${this.height}px`;
    this.pollenCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  createBee(index = 0) {
    return {
      id: index,
      x: 80 + Math.random() * (this.width - 160),
      y: 80 + Math.random() * (this.height - 160),
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      speed: 2.2 + Math.random() * 1.5,
      targetX: Math.random() * this.width,
      targetY: Math.random() * this.height,
      angle: Math.random() * Math.PI * 2,
      targetAngle: 0,
      bank: 0, // roll angle when turning
      pitch: 0, // pitch tilt forward/backward
      altitude: 20 + Math.random() * 25, // height above page (casts shadow)
      targetAltitude: 25,
      wingCycle: Math.random() * Math.PI * 2,
      wingSpeed: 1.4 + Math.random() * 0.4, // high frequency flap rate
      scale: 0.65 + Math.random() * 0.2,
      waggleTime: 0,
      carryingNectar: false,
      pollenTarget: null,
      wobbleSeed: Math.random() * 1000,
      pollenColor: '#f59e0b',
      hasPollenBasket: Math.random() > 0.35 // golden pollen on hind legs
    };
  }

  setBeeCount(count) {
    this.numBees = Math.max(1, Math.min(10, count));
    while (this.bees.length < this.numBees) {
      this.bees.push(this.createBee(this.bees.length));
    }
    while (this.bees.length > this.numBees) {
      this.bees.pop();
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  spawnPollenBurst(x, y) {
    const particleCount = 18;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 1.4 + Math.random() * 3.2;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2.2 + Math.random() * 3.5,
        alpha: 1,
        life: 0,
        maxLife: 60 + Math.random() * 45,
        color: ['#fef08a', '#fbbf24', '#f59e0b', '#fff'][Math.floor(Math.random() * 4)]
      });
    }

    this.pollenBursts.push({ x, y, particles, createdAt: performance.now() });

    // Send the closest bee to investigate
    let closestBee = null;
    let minDist = Infinity;
    this.bees.forEach((bee) => {
      const dist = Math.hypot(bee.x - x, bee.y - y);
      if (dist < minDist) {
        minDist = dist;
        closestBee = bee;
      }
    });

    if (closestBee) {
      closestBee.pollenTarget = { x, y, radius: 28 };
      closestBee.targetX = x;
      closestBee.targetY = y;
      closestBee.targetAltitude = 14; // descend closer to flower
    }
  }

  flyItemToCart(startX, startY, cartEl) {
    if (!cartEl) return;
    const rect = cartEl.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    const bee = this.bees[0] || this.createBee(99);
    bee.x = startX;
    bee.y = startY;
    bee.carryingNectar = true;
    bee.targetX = targetX;
    bee.targetY = targetY;
    bee.speed = 4.2;
    bee.targetAltitude = 38; // fly high above content

    const checkArrival = setInterval(() => {
      const dist = Math.hypot(bee.x - targetX, bee.y - targetY);
      if (dist < 35) {
        bee.carryingNectar = false;
        bee.speed = 2.2;
        bee.targetX = Math.random() * this.width;
        bee.targetY = Math.random() * this.height;
        bee.targetAltitude = 25;
        clearInterval(checkArrival);
      }
    }, 45);
  }

  updateBees(time) {
    this.bees.forEach((bee) => {
      // 1. Pollen Target Logic
      if (bee.pollenTarget) {
        const pDist = Math.hypot(bee.pollenTarget.x - bee.x, bee.pollenTarget.y - bee.y);
        if (pDist < bee.pollenTarget.radius) {
          bee.waggleTime = 55; // Waggle dance upon nectar collection!
          bee.pollenTarget = null;
          bee.hasPollenBasket = true;
          bee.targetAltitude = 24;
        } else {
          bee.targetX = bee.pollenTarget.x;
          bee.targetY = bee.pollenTarget.y;
        }
      }

      // 2. Waggle Dance
      if (bee.waggleTime > 0) {
        bee.waggleTime--;
        // Figure-8 waggle oscillation
        bee.angle += Math.sin(time * 0.08) * 0.45;
        bee.wingCycle += bee.wingSpeed * 2.2;
        bee.vx *= 0.85;
        bee.vy *= 0.85;
        return;
      }

      // 3. Mouse Curiosity & Avoidance
      if (this.mouse.active) {
        const distToMouse = Math.hypot(this.mouse.x - bee.x, this.mouse.y - bee.y);

        if (distToMouse < 70) {
          // Fast escape when startled
          const angleAway = Math.atan2(bee.y - this.mouse.y, bee.x - this.mouse.x);
          bee.vx += Math.cos(angleAway) * 1.2;
          bee.vy += Math.sin(angleAway) * 1.2;
          bee.targetX = bee.x + Math.cos(angleAway) * 180;
          bee.targetY = bee.y + Math.sin(angleAway) * 180;
          bee.targetAltitude = 42; // ascend quickly
        } else if (distToMouse < 240 && this.mouse.speed < 7 && Math.random() < 0.05) {
          // Inquisitive hover toward gentle cursor
          bee.targetX = this.mouse.x + (Math.random() - 0.5) * 90;
          bee.targetY = this.mouse.y + (Math.random() - 0.5) * 90;
          bee.targetAltitude = 18;
          if (this.audioCallback && distToMouse < 95) {
            this.audioCallback('buzz', distToMouse);
          }
        }
      }

      // 4. Smooth Waypoint Navigation
      const distToTarget = Math.hypot(bee.targetX - bee.x, bee.targetY - bee.y);
      if (distToTarget < 60 || Math.random() < 0.012) {
        bee.targetX = 80 + Math.random() * (this.width - 160);
        bee.targetY = 80 + Math.random() * (this.height - 160);
        bee.targetAltitude = 16 + Math.random() * 26;
      }

      // 5. Angular Steering & 3D Banking Physics
      const desiredAngle = Math.atan2(bee.targetY - bee.y, bee.targetX - bee.x);
      let angleDiff = desiredAngle - bee.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Turn rate
      bee.angle += angleDiff * 0.075;

      // Realistic Roll / Bank into turns
      const targetBank = Math.max(-0.45, Math.min(0.45, angleDiff * 1.2));
      bee.bank += (targetBank - bee.bank) * 0.12;

      // Pitch tilt forward when accelerating
      const currentSpeed = Math.hypot(bee.vx, bee.vy);
      const targetPitch = Math.min(0.3, currentSpeed * 0.08);
      bee.pitch += (targetPitch - bee.pitch) * 0.1;

      // Altitude smoothing
      bee.altitude += (bee.targetAltitude - bee.altitude) * 0.05;

      // Micro-hover oscillation (natural biological air bobbing)
      const hoverWobble = Math.sin((time + bee.wobbleSeed) * 0.007) * 0.25;
      const moveAngle = bee.angle + hoverWobble;

      bee.vx += Math.cos(moveAngle) * 0.18;
      bee.vy += Math.sin(moveAngle) * 0.18;

      // Viscous air drag damping
      bee.vx *= 0.95;
      bee.vy *= 0.95;

      // Speed clamp
      const spd = Math.hypot(bee.vx, bee.vy);
      if (spd > bee.speed) {
        bee.vx = (bee.vx / spd) * bee.speed;
        bee.vy = (bee.vy / spd) * bee.speed;
      }

      bee.x += bee.vx;
      bee.y += bee.vy;

      // Boundary handling
      const pad = 30;
      if (bee.x < pad) { bee.x = pad; bee.vx *= -1; }
      if (bee.x > this.width - pad) { bee.x = this.width - pad; bee.vx *= -1; }
      if (bee.y < pad) { bee.y = pad; bee.vy *= -1; }
      if (bee.y > this.height - pad) { bee.y = this.height - pad; bee.vy *= -1; }

      // Ultra-fast wing flap cycle
      bee.wingCycle += bee.wingSpeed;
    });
  }

  // Draw Dynamic Realistic Drop Shadow underneath the bee
  drawBeeShadow(ctx, bee) {
    ctx.save();
    // Shadow displacement based on altitude and top-left sunlight
    const shadowOffsetX = bee.altitude * 0.55;
    const shadowOffsetY = bee.altitude * 0.85;

    ctx.translate(bee.x + shadowOffsetX, bee.y + shadowOffsetY);
    ctx.rotate(bee.angle + Math.PI / 2);
    ctx.scale(bee.scale * (1 + bee.altitude * 0.01), bee.scale * (1 + bee.altitude * 0.01));

    // Shadow softness increases with altitude
    const shadowAlpha = Math.max(0.08, 0.38 - bee.altitude * 0.005);
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.filter = `blur(${Math.max(2, bee.altitude * 0.15)}px)`;

    // Approximate anatomical shadow silhouette
    ctx.beginPath();
    ctx.ellipse(0, 4, 12, 22, 0, 0, Math.PI * 2); // body shadow
    ctx.ellipse(-14, -6, 16, 8, -0.3, 0, Math.PI * 2); // left wing blur shadow
    ctx.ellipse(14, -6, 16, 8, 0.3, 0, Math.PI * 2); // right wing blur shadow
    ctx.fill();

    ctx.filter = 'none';
    ctx.restore();
  }

  // Realistic Procedural Anatomical Bee (Fallback or Enhanced Underlay)
  drawProceduralBee(ctx, bee) {
    const flap = Math.sin(bee.wingCycle);
    const flapCos = Math.cos(bee.wingCycle);

    // 1. Jointed Legs (Dangling when hovering, tucked when flying)
    ctx.save();
    ctx.strokeStyle = '#1e140a';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const legDangle = Math.max(0, 1 - Math.hypot(bee.vx, bee.vy) / 2.5);

    // Front Legs
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.quadraticCurveTo(-14 - legDangle * 3, -10 + legDangle * 6, -18, -14 + legDangle * 4);
    ctx.moveTo(5, -6);
    ctx.quadraticCurveTo(14 + legDangle * 3, -10 + legDangle * 6, 18, -14 + legDangle * 4);
    ctx.stroke();

    // Middle Legs
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.quadraticCurveTo(-18, 4 + legDangle * 5, -20, 10 + legDangle * 6);
    ctx.moveTo(6, 0);
    ctx.quadraticCurveTo(18, 4 + legDangle * 5, 20, 10 + legDangle * 6);
    ctx.stroke();

    // Hind Legs & Pollen Baskets (Corbiculae)
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.quadraticCurveTo(-16, 18 + legDangle * 4, -15, 28 + legDangle * 8);
    ctx.moveTo(6, 8);
    ctx.quadraticCurveTo(16, 18 + legDangle * 4, 15, 28 + legDangle * 8);
    ctx.stroke();

    // Golden Pollen Basket pellet on hind legs
    if (bee.hasPollenBasket) {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(-14, 18 + legDangle * 4, 3.2, 4.5, 0.2, 0, Math.PI * 2);
      ctx.ellipse(14, 18 + legDangle * 4, 3.2, 4.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-14.5, 16 + legDangle * 4, 1.2, 0, Math.PI * 2);
      ctx.arc(13.5, 16 + legDangle * 4, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Abdomen (Metasoma / Gaster) with 6 anatomical tergite plates
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 12, 8.5, 14.5, 0, 0, Math.PI * 2);
    ctx.clip();

    // 3D curved amber base
    const abdGrad = ctx.createLinearGradient(-8, 0, 8, 0);
    abdGrad.addColorStop(0, '#78350f');
    abdGrad.addColorStop(0.3, '#f59e0b');
    abdGrad.addColorStop(0.6, '#fbbf24');
    abdGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = abdGrad;
    ctx.fillRect(-12, -4, 24, 32);

    // Anatomical Tergite dark chitin bands
    ctx.fillStyle = '#1c1208';
    ctx.fillRect(-12, 1, 24, 3);
    ctx.fillRect(-12, 7, 24, 3.2);
    ctx.fillRect(-12, 13, 24, 3.2);
    ctx.fillRect(-12, 19, 24, 3);
    ctx.fillRect(-12, 24, 24, 3);

    // Fine golden micro-hair fringes (setae) on tergites
    ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
    ctx.fillRect(-12, 4, 24, 1.2);
    ctx.fillRect(-12, 10.2, 24, 1.2);
    ctx.fillRect(-12, 16.2, 24, 1.2);
    ctx.fillRect(-12, 22, 24, 1.2);
    ctx.restore();

    // Stinger tip
    ctx.beginPath();
    ctx.moveTo(0, 27.5);
    ctx.lineTo(-1.2, 24);
    ctx.lineTo(1.2, 24);
    ctx.closePath();
    ctx.fillStyle = '#0a0502';
    ctx.fill();

    // 3. Thorax (Fuzzy golden-amber setae velvet)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -4, 8, 8.5, 0, 0, Math.PI * 2);
    const thoraxGrad = ctx.createRadialGradient(-2, -5, 1, 0, -4, 9);
    thoraxGrad.addColorStop(0, '#fef08a');
    thoraxGrad.addColorStop(0.35, '#f59e0b');
    thoraxGrad.addColorStop(0.75, '#b45309');
    thoraxGrad.addColorStop(1, '#3c1803');
    ctx.fillStyle = thoraxGrad;
    ctx.fill();

    // Fuzzy hair bristles on thorax edge
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = 0.8;
    for (let a = 0; a < Math.PI * 2; a += 0.35) {
      const hx = Math.cos(a) * 7.5;
      const hy = -4 + Math.sin(a) * 8;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx * 1.22, hy * 1.22);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Head & Large Compound Eyes
    ctx.beginPath();
    ctx.ellipse(0, -14, 6.2, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#231407';
    ctx.fill();

    // Compound Eyes (Kidney-shaped with specular shine)
    ctx.save();
    const eyeGrad = ctx.createRadialGradient(-4.5, -15, 0.5, -4, -14, 4);
    eyeGrad.addColorStop(0, '#451a03');
    eyeGrad.addColorStop(0.7, '#150a04');
    eyeGrad.addColorStop(1, '#050201');
    ctx.fillStyle = eyeGrad;

    ctx.beginPath();
    ctx.ellipse(-4.2, -14, 2.2, 3.5, -0.25, 0, Math.PI * 2);
    ctx.ellipse(4.2, -14, 2.2, 3.5, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Eye Specular Reflection Highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(-4.6, -15.5, 0.8, 0, Math.PI * 2);
    ctx.arc(3.8, -15.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Antennae (Elbowed / Geniculate with sensory twitch)
    ctx.save();
    ctx.strokeStyle = '#180d05';
    ctx.lineWidth = 1.1;
    const twitch = Math.sin(bee.wingCycle * 0.1) * 1.5;
    ctx.beginPath();
    ctx.moveTo(-2.5, -16);
    ctx.lineTo(-5, -22);
    ctx.lineTo(-9 + twitch, -26);
    ctx.moveTo(2.5, -16);
    ctx.lineTo(5, -22);
    ctx.lineTo(9 - twitch, -26);
    ctx.stroke();
    ctx.restore();
  }

  // Draw High-Speed Flapping Veined Wings with Motion Blur Fan
  drawFlappingWings(ctx, bee) {
    const flap = Math.sin(bee.wingCycle);
    const flapAngle = flap * 0.45; // angle excursion

    ctx.save();

    // 1. Iridescent Motion Blur Fan (Simulates 230Hz wing-beat sweep)
    ctx.save();
    // Left Wing Fan
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.arc(-4, -6, 26, -Math.PI * 0.85, -Math.PI * 0.35);
    ctx.closePath();
    const fanGradL = ctx.createRadialGradient(-4, -6, 2, -4, -6, 26);
    fanGradL.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    fanGradL.addColorStop(0.4, 'rgba(251, 191, 36, 0.25)');
    fanGradL.addColorStop(0.8, 'rgba(186, 230, 253, 0.2)');
    fanGradL.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = fanGradL;
    ctx.fill();

    // Right Wing Fan
    ctx.beginPath();
    ctx.moveTo(4, -6);
    ctx.arc(4, -6, 26, -Math.PI * 0.65, -Math.PI * 0.15);
    ctx.closePath();
    const fanGradR = ctx.createRadialGradient(4, -6, 2, 4, -6, 26);
    fanGradR.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    fanGradR.addColorStop(0.4, 'rgba(251, 191, 36, 0.25)');
    fanGradR.addColorStop(0.8, 'rgba(186, 230, 253, 0.2)');
    fanGradR.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = fanGradR;
    ctx.fill();
    ctx.restore();

    // 2. High-Definition Veined Wings (Forewing & Hindwing)
    // Left Forewing
    ctx.save();
    ctx.translate(-5, -6);
    ctx.rotate(-0.55 + flapAngle);
    ctx.scale(1, 0.5 + Math.abs(flap) * 0.5); // 3D perspective foreshortening
    this.drawSingleVeinedWing(ctx, -1);
    ctx.restore();

    // Right Forewing
    ctx.save();
    ctx.translate(5, -6);
    ctx.rotate(0.55 - flapAngle);
    ctx.scale(1, 0.5 + Math.abs(flap) * 0.5);
    this.drawSingleVeinedWing(ctx, 1);
    ctx.restore();

    ctx.restore();
  }

  // Draw anatomically accurate delicate chitinous wing venation
  drawSingleVeinedWing(ctx, dir = 1) {
    ctx.save();
    ctx.scale(dir, 1);

    // Wing Membrane
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(4, -12, 14, -24, 25, -20);
    ctx.bezierCurveTo(28, -12, 22, 2, 12, 4);
    ctx.bezierCurveTo(6, 4, 2, 2, 0, 0);
    ctx.closePath();

    // Iridescent glassy membrane fill
    const wingGrad = ctx.createLinearGradient(0, -10, 25, -10);
    wingGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    wingGrad.addColorStop(0.5, 'rgba(224, 242, 254, 0.45)');
    wingGrad.addColorStop(0.8, 'rgba(254, 240, 138, 0.35)');
    wingGrad.addColorStop(1, 'rgba(255, 255, 255, 0.6)');
    ctx.fillStyle = wingGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Anatomical Chitin Veins (Costa, Radius, Cubitus)
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.55)';
    ctx.lineWidth = 0.7;

    // Leading Costal Vein
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(4, -11, 13, -22, 24, -19);
    ctx.stroke();

    // Radial Cell Vein
    ctx.beginPath();
    ctx.moveTo(2, -4);
    ctx.quadraticCurveTo(12, -14, 20, -10);
    ctx.stroke();

    // Submarginal cross veins
    ctx.beginPath();
    ctx.moveTo(9, -8);
    ctx.lineTo(13, -1);
    ctx.moveTo(15, -12);
    ctx.lineTo(19, -4);
    ctx.stroke();

    // Pterostigma (Dark chitinous spot on leading wing edge)
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(19, -18, 2.2, 0.9, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawBee(ctx, bee) {
    // 1. Draw realistic ground drop shadow first
    this.drawBeeShadow(ctx, bee);

    ctx.save();
    ctx.translate(bee.x, bee.y);
    ctx.rotate(bee.angle + Math.PI / 2);
    ctx.scale(bee.scale, bee.scale);

    // Apply 3D Banking (Roll) and Pitch tilt
    ctx.transform(
      1 - Math.abs(bee.bank) * 0.2, // scaleX (roll compression)
      bee.bank * 0.25,              // skewY
      0,                            // skewX
      1 - Math.abs(bee.pitch) * 0.15, // scaleY (pitch compression)
      0,
      0
    );

    // 2. Wings (Flapping underneath or over body)
    this.drawFlappingWings(ctx, bee);

    // 3. Draw Body
    if (this.spriteLoaded && this.bodySprite) {
      // Draw photographic body specimen
      ctx.drawImage(this.bodySprite, -32, -32, 64, 64);
    } else {
      // Draw ultra-detailed procedural anatomical bee
      this.drawProceduralBee(ctx, bee);
    }

    // 4. Glowing Golden Honey Drop if carrying nectar
    if (bee.carryingNectar) {
      ctx.beginPath();
      ctx.arc(0, 24, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(-1, 23, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    ctx.restore();
  }

  updatePollen(ctx) {
    for (let i = this.pollenBursts.length - 1; i >= 0; i--) {
      const burst = this.pollenBursts[i];
      let hasAlive = false;

      burst.particles.forEach((p) => {
        p.life++;
        if (p.life < p.maxLife) {
          hasAlive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.alpha = 1 - p.life / p.maxLife;

          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * (1 - p.life / (p.maxLife * 1.4)), 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.restore();
        }
      });

      if (!hasAlive) {
        this.pollenBursts.splice(i, 1);
      }
    }
  }

  animate(time) {
    if (!this.isPaused) {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.pollenCtx.clearRect(0, 0, this.width, this.height);

      this.updatePollen(this.pollenCtx);
      this.updateBees(time);

      this.bees.forEach((bee) => {
        this.drawBee(this.ctx, bee);
      });
    }

    requestAnimationFrame(this.animate);
  }
}

window.BeeEngine = BeeEngine;
