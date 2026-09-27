/* ==========================================================================
   MELLORA ARTISAN RAW HONEY - HONEY SPOON & VISCOUS DRIP PHYSICS ENGINE
   Simulates viscoelastic fluid mechanics: teardrop elongation, surface tension,
   liquid filament snapping, and concentric ripples upon jar impact.
   ========================================================================== */

if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii = 0) {
    let r = radii;
    if (typeof r === 'number') r = [r, r, r, r];
    else if (!Array.isArray(r)) r = [0, 0, 0, 0];
    const tl = r[0] || 0, tr = r[1] || r[0] || 0, br = r[2] || r[0] || 0, bl = r[3] || r[1] || r[0] || 0;
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
    return this;
  };
}

class HoneyPhysicsEngine {
  constructor(canvasId = 'honey-spoon-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;

    // Simulation parameters
    this.viscosity = 0.85; // 0.3 (runny) to 0.95 (super thick)
    this.gravity = 0.32;
    this.flowRate = 1.0;
    this.isPouring = false;

    // Dipper state
    this.dipper = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      angle: -0.25, // slight tilt in radians
      targetAngle: -0.25,
      isDragging: false,
      width: 140,
      height: 48,
      grooves: 4
    };

    // Drops and filaments
    this.formingDrop = null;
    this.activeDrops = [];
    this.ripples = [];
    this.coilingStreams = [];

    // Jar surface below
    this.jar = {
      surfaceY: 0,
      width: 0,
      level: 0.55
    };

    this.onDropImpact = null; // callback for sound/effects

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Mouse / Touch interaction for the dipper
    this.setupInteractions();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 420;
    this.height = rect.height || 500;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    // Initial dipper position near top center
    this.dipper.x = this.width * 0.48;
    this.dipper.y = 110;
    this.dipper.targetX = this.dipper.x;
    this.dipper.targetY = this.dipper.y;

    // Jar position at bottom
    this.jar.surfaceY = this.height - 110;
    this.jar.width = this.width * 0.72;
  }

  setupInteractions() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const onStart = (e) => {
      const pos = getPos(e);
      // If clicked near dipper, start dragging
      const dist = Math.hypot(pos.x - this.dipper.x, pos.y - this.dipper.y);
      if (dist < 120) {
        this.dipper.isDragging = true;
        this.dipper.targetX = pos.x;
        this.dipper.targetY = Math.min(pos.y, this.jar.surfaceY - 100);
      }
    };

    const onMove = (e) => {
      const pos = getPos(e);
      if (this.dipper.isDragging) {
        this.dipper.targetX = Math.max(60, Math.min(this.width - 60, pos.x));
        this.dipper.targetY = Math.max(60, Math.min(this.jar.surfaceY - 80, pos.y));
        this.dipper.targetAngle = (pos.x - this.width / 2) * 0.0015 - 0.2;
      }
    };

    const onEnd = () => {
      this.dipper.isDragging = false;
      // return toward center rest position
      this.dipper.targetX = this.width * 0.48;
      this.dipper.targetY = 110;
      this.dipper.targetAngle = -0.25;
    };

    this.canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    this.canvas.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  }

  // Force spawn a luscious honey drop
  triggerDrip() {
    if (!this.formingDrop) {
      this.startNewDrop(true);
    } else {
      this.formingDrop.mass += 6;
    }
  }

  setPouring(pouring) {
    this.isPouring = pouring;
  }

  setViscosity(val) {
    this.viscosity = Math.max(0.2, Math.min(0.95, val));
  }

  getDripOrigin() {
    // Calculate tip/lowest point of tilted honey dipper head
    const rad = this.dipper.angle;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Grooved head center offset
    const headOffsetX = 20;
    const headOffsetY = 15;

    return {
      x: this.dipper.x + headOffsetX * cos - headOffsetY * sin,
      y: this.dipper.y + headOffsetX * sin + headOffsetY * cos + 18
    };
  }

  startNewDrop(immediate = false) {
    const origin = this.getDripOrigin();
    this.formingDrop = {
      originX: origin.x,
      originY: origin.y,
      x: origin.x,
      y: origin.y,
      vy: 0,
      mass: immediate ? 6 : 1.5,
      maxMass: 10 + (1 - this.viscosity) * 8,
      stretch: 0,
      detached: false,
      neckWidth: 8
    };
  }

  updatePhysics() {
    // Smooth dipper movement
    this.dipper.x += (this.dipper.targetX - this.dipper.x) * 0.12;
    this.dipper.y += (this.dipper.targetY - this.dipper.y) * 0.12;
    this.dipper.angle += (this.dipper.targetAngle - this.dipper.angle) * 0.12;

    const origin = this.getDripOrigin();

    // 1. Continuous stream pouring logic
    if (this.isPouring) {
      if (Math.random() < 0.7) {
        this.coilingStreams.push({
          x: origin.x + (Math.random() - 0.5) * 4,
          y: origin.y,
          vy: 2.5 + Math.random() * 2,
          radius: 4 + Math.random() * 3,
          color: '#fbbf24'
        });
      }
    }

    // Update continuous stream
    for (let i = this.coilingStreams.length - 1; i >= 0; i--) {
      const s = this.coilingStreams[i];
      s.y += s.vy;
      s.vy += this.gravity * 0.8;
      // Stream coiling effect near surface
      if (s.y >= this.jar.surfaceY) {
        this.addRipple(s.x, this.jar.surfaceY, s.radius * 1.5);
        this.coilingStreams.splice(i, 1);
        if (this.onDropImpact) this.onDropImpact();
      }
    }

    // 2. Forming Drop at dipper tip
    if (!this.formingDrop) {
      this.startNewDrop();
    } else {
      this.formingDrop.originX = origin.x;
      this.formingDrop.originY = origin.y;

      // Accumulate honey volume
      const growthRate = (1.1 - this.viscosity) * 0.12 * this.flowRate;
      this.formingDrop.mass += growthRate;

      // Drop stretches downward under gravity resisted by viscosity
      const elasticPull = (1 - this.viscosity) * 1.6;
      this.formingDrop.stretch += (this.gravity * 2.2 + this.formingDrop.mass * 0.18) * (1 - this.viscosity * 0.7);
      this.formingDrop.neckWidth = Math.max(1.2, 8 - this.formingDrop.stretch * 0.12);

      this.formingDrop.x = origin.x;
      this.formingDrop.y = origin.y + this.formingDrop.stretch;

      // When stretch and mass exceed surface tension threshold -> PINCH OFF!
      const snapThreshold = 38 + this.viscosity * 45;
      if (this.formingDrop.stretch > snapThreshold || this.formingDrop.mass >= this.formingDrop.maxMass) {
        // Pinch off into falling droplet!
        this.activeDrops.push({
          x: this.formingDrop.x,
          y: this.formingDrop.y,
          vy: 1.8 + this.formingDrop.stretch * 0.04,
          radius: Math.min(14, 5 + this.formingDrop.mass * 0.6),
          length: Math.min(22, 10 + this.formingDrop.stretch * 0.2),
          viscosity: this.viscosity
        });

        // Small secondary satellite droplet (typical of viscous pinch-off)
        if (Math.random() > 0.3) {
          this.activeDrops.push({
            x: this.formingDrop.x,
            y: this.formingDrop.originY + this.formingDrop.stretch * 0.45,
            vy: 0.9,
            radius: 2.2,
            length: 3,
            viscosity: this.viscosity
          });
        }

        this.formingDrop = null;
      }
    }

    // 3. Falling active droplets
    for (let i = this.activeDrops.length - 1; i >= 0; i--) {
      const drop = this.activeDrops[i];
      drop.vy += this.gravity;
      // Air drag
      drop.vy *= 0.985;
      drop.y += drop.vy;

      // Impact on jar honey surface!
      if (drop.y >= this.jar.surfaceY) {
        this.addRipple(drop.x, this.jar.surfaceY, drop.radius * 2);
        this.activeDrops.splice(i, 1);
        if (this.onDropImpact) this.onDropImpact();
      }
    }

    // 4. Concentric Viscous Ripples on Honey Surface
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += r.speed;
      r.alpha -= 0.018;
      r.speed *= 0.96; // slows down due to viscosity
      if (r.alpha <= 0) {
        this.ripples.splice(i, 1);
      }
    }
  }

  addRipple(x, y, initialRadius) {
    this.ripples.push({
      x,
      y,
      radius: initialRadius * 0.4,
      maxRadius: initialRadius * 2.8,
      speed: 1.2,
      alpha: 0.85
    });
  }

  drawJar(ctx) {
    const jarX = this.width / 2;
    const jarY = this.height - 40;
    const jarW = Math.min(300, this.width * 0.75);
    const jarH = 120;
    const rimY = this.jar.surfaceY;

    ctx.save();

    // 1. Honey Liquid Body in Jar
    ctx.beginPath();
    ctx.ellipse(jarX, rimY, jarW * 0.48, 18, 0, 0, Math.PI * 2);
    ctx.rect(jarX - jarW * 0.48, rimY, jarW * 0.96, jarH);
    const honeyGrad = ctx.createLinearGradient(0, rimY - 20, 0, rimY + jarH);
    honeyGrad.addColorStop(0, '#f59e0b');
    honeyGrad.addColorStop(0.35, '#d97706');
    honeyGrad.addColorStop(0.8, '#b45309');
    honeyGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = honeyGrad;
    ctx.fill();

    // 2. Honey Surface Ellipse (liquid meniscus with golden glow)
    ctx.beginPath();
    ctx.ellipse(jarX, rimY, jarW * 0.48, 18, 0, 0, Math.PI * 2);
    const meniscusGrad = ctx.createRadialGradient(jarX, rimY - 4, 10, jarX, rimY, jarW * 0.5);
    meniscusGrad.addColorStop(0, '#fef08a');
    meniscusGrad.addColorStop(0.5, '#fbbf24');
    meniscusGrad.addColorStop(0.85, '#d97706');
    meniscusGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = meniscusGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Draw Ripples on Honey Surface
    this.ripples.forEach((r) => {
      ctx.save();
      ctx.beginPath();
      // Ripples squashed horizontally to match 3D perspective ellipse
      ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${r.alpha * 0.8})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 8;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.radius * 0.7, r.radius * 0.25, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(245, 158, 11, ${r.alpha * 0.9})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    });

    // 4. Glass Jar Contour & Highlights
    ctx.beginPath();
    ctx.roundRect(jarX - jarW * 0.5, rimY - 8, jarW, jarH + 12, [6, 6, 28, 28]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glass Reflection streak
    ctx.beginPath();
    ctx.moveTo(jarX - jarW * 0.44, rimY + 10);
    ctx.lineTo(jarX - jarW * 0.44, jarY + 20);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Jar Label Plaque
    ctx.fillStyle = 'rgba(18, 14, 10, 0.85)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(jarX - 60, rimY + 32, 120, 48, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 12px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText('MELLORA', jarX, rimY + 54);

    ctx.fillStyle = '#e2d3c1';
    ctx.font = '400 9px "Outfit", sans-serif';
    ctx.fillText('RAW RESERVE', jarX, rimY + 68);

    ctx.restore();
  }

  drawDipper(ctx) {
    ctx.save();
    ctx.translate(this.dipper.x, this.dipper.y);
    ctx.rotate(this.dipper.angle);

    // Dipper Wooden Handle (Slender wooden lathe rod extending up-right)
    const handleLen = 220;
    const handleGrad = ctx.createLinearGradient(0, -6, 0, 6);
    handleGrad.addColorStop(0, '#c7925b');
    handleGrad.addColorStop(0.3, '#f2ca9b');
    handleGrad.addColorStop(0.7, '#8f5728');
    handleGrad.addColorStop(1, '#4f2d11');

    ctx.fillStyle = handleGrad;
    ctx.beginPath();
    ctx.roundRect(-20, -5, handleLen, 10, 5);
    ctx.fill();

    // Dipper Grooved Head (Horizontal layers/discs)
    const grooves = [
      { x: -50, w: 18, h: 22 },
      { x: -30, w: 22, h: 36 },
      { x: -6,  w: 24, h: 46 },
      { x: 20,  w: 22, h: 42 },
      { x: 44,  w: 18, h: 32 },
      { x: 64,  w: 12, h: 20 }
    ];

    grooves.forEach((g) => {
      ctx.beginPath();
      ctx.roundRect(g.x - g.w / 2, -g.h / 2, g.w, g.h, 6);

      const discGrad = ctx.createLinearGradient(0, -g.h / 2, 0, g.h / 2);
      discGrad.addColorStop(0, '#e5b882');
      discGrad.addColorStop(0.3, '#fedbb1');
      discGrad.addColorStop(0.7, '#935824');
      discGrad.addColorStop(1, '#532e0e');
      ctx.fillStyle = discGrad;
      ctx.fill();
      ctx.strokeStyle = '#432207';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // ------------------------------------------------------------------------
    // Golden Viscous Honey Glaze Encasing the Dipper Head
    // ------------------------------------------------------------------------
    ctx.beginPath();
    // Smooth teardrop bulb encasing the wooden discs
    ctx.ellipse(8, 6, 68, 28, 0, 0, Math.PI * 2);

    const glazeGrad = ctx.createRadialGradient(8, -2, 10, 8, 8, 70);
    glazeGrad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    glazeGrad.addColorStop(0.4, 'rgba(251, 191, 36, 0.88)');
    glazeGrad.addColorStop(0.75, 'rgba(217, 119, 6, 0.85)');
    glazeGrad.addColorStop(1, 'rgba(120, 53, 15, 0.9)');

    ctx.fillStyle = glazeGrad;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Specular Wet Honey Highlight
    ctx.beginPath();
    ctx.ellipse(6, -10, 38, 6, -0.08, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fill();

    ctx.restore();
  }

  drawDripsAndFilaments(ctx) {
    ctx.save();

    // 1. Draw forming drop & stretching liquid neck
    if (this.formingDrop) {
      const { originX, originY, x, y, neckWidth, stretch } = this.formingDrop;

      // Liquid stretching thread connecting dipper to drop
      ctx.beginPath();
      ctx.moveTo(originX - neckWidth, originY);
      // Bezier curve tapering inward then flaring out to drop
      ctx.bezierCurveTo(
        originX - neckWidth * 0.4, originY + stretch * 0.4,
        x - 6, y - 8,
        x - 6, y
      );
      // Teardrop bottom hemisphere
      ctx.arc(x, y, 7 + this.formingDrop.mass * 0.4, 0, Math.PI);
      // Right side curve back up
      ctx.bezierCurveTo(
        x + 6, y - 8,
        originX + neckWidth * 0.4, originY + stretch * 0.4,
        originX + neckWidth, originY
      );
      ctx.closePath();

      const dripGrad = ctx.createLinearGradient(0, originY, 0, y + 10);
      dripGrad.addColorStop(0, '#fbbf24');
      dripGrad.addColorStop(0.5, '#f59e0b');
      dripGrad.addColorStop(1, '#b45309');

      ctx.fillStyle = dripGrad;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Specular glare along thread and drop
      ctx.beginPath();
      ctx.moveTo(originX - 1, originY + 2);
      ctx.quadraticCurveTo(x - 2, originY + stretch * 0.5, x - 2, y + 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = Math.max(0.6, neckWidth * 0.3);
      ctx.stroke();
    }

    // 2. Draw Falling Active Droplets
    this.activeDrops.forEach((d) => {
      ctx.save();
      ctx.translate(d.x, d.y);

      // Teardrop shape pointed upwards
      ctx.beginPath();
      ctx.moveTo(0, -d.length);
      ctx.quadraticCurveTo(-d.radius * 0.9, 0, -d.radius, d.radius * 0.6);
      ctx.arc(0, d.radius * 0.6, d.radius, 0, Math.PI);
      ctx.quadraticCurveTo(d.radius * 0.9, 0, 0, -d.length);
      ctx.closePath();

      const dropGrad = ctx.createRadialGradient(-d.radius * 0.3, -d.radius * 0.3, 1, 0, 0, d.radius * 1.5);
      dropGrad.addColorStop(0, '#fef08a');
      dropGrad.addColorStop(0.4, '#fbbf24');
      dropGrad.addColorStop(0.8, '#d97706');
      dropGrad.addColorStop(1, '#78350f');

      ctx.fillStyle = dropGrad;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.fill();

      // Specular dot
      ctx.beginPath();
      ctx.arc(-d.radius * 0.35, d.radius * 0.3, d.radius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fill();

      ctx.restore();
    });

    // 3. Draw Continuous Stream Coils
    this.coilingStreams.forEach((s) => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.fill();
    });

    ctx.restore();
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.updatePhysics();
    this.drawJar(this.ctx);
    this.drawDripsAndFilaments(this.ctx);
    this.drawDipper(this.ctx);

    requestAnimationFrame(this.animate);
  }
}

window.HoneyPhysicsEngine = HoneyPhysicsEngine;
