/* ==========================================================================
   MELLORA ARTISAN RAW HONEY - MAIN APPLICATION CONTROLLER
   Integrates Bee Engine, Honey Physics, Audio Synthesis, 3D Tilt Cards,
   Cart Drawer, and Interactive Tasting Features.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // 1. WEB AUDIO SYNTHESIZER (Gentle, organic, non-intrusive sound FX)
  // --------------------------------------------------------------------------
  class HoneyAudio {
    constructor() {
      this.ctx = null;
      this.isEnabled = false;
      this.lastDripTime = 0;
      this.lastBuzzTime = 0;
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.isEnabled = !this.isEnabled;
      if (this.isEnabled) this.init();
      return this.isEnabled;
    }

    // Viscous honey droplet ping
    playDripSound() {
      if (!this.isEnabled || !this.ctx) return;
      const now = performance.now();
      if (now - this.lastDripTime < 180) return; // avoid sonic overload
      this.lastDripTime = now;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Pitch drops slightly like a drop splashing in liquid
      osc.frequency.setValueAtTime(820 + Math.random() * 80, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(340, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    }

    // Gentle bee hum when mouse is very close
    playBeeBuzz() {
      if (!this.isEnabled || !this.ctx) return;
      const now = performance.now();
      if (now - this.lastBuzzTime < 350) return;
      this.lastBuzzTime = now;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140 + Math.random() * 20, this.ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.26);
    }

    // Luxurious golden cart chime
    playCartChime() {
      if (!this.isEnabled || !this.ctx) return;
      const notes = [587.33, 739.99, 880.00]; // D5, F#5, A5
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.09, this.ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + idx * 0.08);
        osc.stop(this.ctx.currentTime + idx * 0.08 + 0.42);
      });
    }
  }

  const audio = new HoneyAudio();

  // --------------------------------------------------------------------------
  // 2. INITIALIZE ENGINES
  // --------------------------------------------------------------------------
  const beeEngine = new BeeEngine('bee-canvas', 'pollen-canvas');
  window.beeEngine = beeEngine;

  // Initialize Nectar Harvest Game
  const honeyGame = new HoneyHarvestGame('honey-game-canvas');
  honeyGame.onSound = (type, sub) => {
    if (type === 'catch') {
      if (sub === 'ROYAL_STAR') {
        audio.playCartChime();
      } else {
        audio.playDripSound();
      }
    } else if (type === 'hazard') {
      audio.playBeeBuzz();
    }
  };

  // Hook bee audio callback
  beeEngine.audioCallback = (type) => {
    if (type === 'buzz') audio.playBeeBuzz();
  };

  // Optional honey physics if canvas exists
  const honeyPhysicsCanvas = document.getElementById('honey-spoon-canvas');
  const honeyPhysics = honeyPhysicsCanvas ? new HoneyPhysicsEngine('honey-spoon-canvas') : null;
  if (honeyPhysics) {
    honeyPhysics.onDropImpact = () => {
      audio.playDripSound();
    };
  }

  if (btnPour) {
    // Hold to pour continuous flow
    const startPour = () => honeyPhysics.setPouring(true);
    const endPour = () => honeyPhysics.setPouring(false);

    btnPour.addEventListener('mousedown', startPour);
    window.addEventListener('mouseup', endPour);
    btnPour.addEventListener('touchstart', startPour, { passive: true });
    window.addEventListener('touchend', endPour);
  }

  if (btnStir) {
    let stirring = false;
    btnStir.addEventListener('click', () => {
      if (stirring) return;
      stirring = true;
      let angle = 0;
      const centerX = honeyPhysics.width * 0.48;
      const centerY = 110;
      const radiusX = 45;
      const radiusY = 22;

      const stirInterval = setInterval(() => {
        angle += 0.18;
        honeyPhysics.dipper.targetX = centerX + Math.cos(angle) * radiusX;
        honeyPhysics.dipper.targetY = centerY + Math.sin(angle) * radiusY;
        honeyPhysics.dipper.targetAngle = -0.25 + Math.sin(angle) * 0.2;

        if (Math.random() < 0.25) honeyPhysics.triggerDrip();

        if (angle > Math.PI * 4) {
          clearInterval(stirInterval);
          honeyPhysics.dipper.targetX = centerX;
          honeyPhysics.dipper.targetY = centerY;
          honeyPhysics.dipper.targetAngle = -0.25;
          stirring = false;
        }
      }, 30);
    });
  }

  // --------------------------------------------------------------------------
  // 4. HEADER AUDIO & BEE TOGGLES
  // --------------------------------------------------------------------------
  const audioToggleBtn = document.getElementById('audio-toggle-btn');
  const audioStatusText = document.getElementById('audio-status-text');

  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      const active = audio.toggle();
      audioToggleBtn.classList.toggle('active', active);
      if (audioStatusText) {
        audioStatusText.textContent = active ? 'Sound: On' : 'Sound: Muted';
      }
    });
  }

  const beeCountBtn = document.getElementById('bee-count-btn');
  const beeCountDisplay = document.getElementById('bee-count-display');
  let currentBeeCount = 5;

  if (beeCountBtn) {
    beeCountBtn.addEventListener('click', () => {
      currentBeeCount = currentBeeCount >= 8 ? 2 : currentBeeCount + 2;
      beeEngine.setBeeCount(currentBeeCount);
      if (beeCountDisplay) {
        beeCountDisplay.textContent = `Bees: ${currentBeeCount}`;
      }
    });
  }

  // --------------------------------------------------------------------------
  // 5. 3D TILT EFFECT FOR PRODUCT CARDS
  // --------------------------------------------------------------------------
  const productCards = document.querySelectorAll('.product-card');

  productCards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });

  // --------------------------------------------------------------------------
  // 6. SHOPPING CART STATE & DRAWER
  // --------------------------------------------------------------------------
  const cart = [
    {
      id: 'wildflower',
      title: 'Mellora Wildflower Honey',
      price: 28.00,
      weight: '340g / 12 oz',
      img: 'assets/images/jar-wildflower.jpg',
      qty: 1
    }
  ];

  const cartDrawerOverlay = document.getElementById('cart-drawer-overlay');
  const cartOpenBtns = document.querySelectorAll('.open-cart-trigger');
  const cartCloseBtn = document.getElementById('cart-close-btn');
  const cartItemsContainer = document.getElementById('cart-items-container');
  const cartSubtotalEl = document.getElementById('cart-subtotal-val');
  const cartBadgeEl = document.getElementById('cart-badge-count');
  const freeGiftFillEl = document.getElementById('free-gift-fill');
  const freeGiftTextEl = document.getElementById('free-gift-text');
  const cartBtnEl = document.querySelector('.cart-btn');

  function openCart() {
    if (cartDrawerOverlay) cartDrawerOverlay.classList.add('open');
  }

  function closeCart() {
    if (cartDrawerOverlay) cartDrawerOverlay.classList.remove('open');
  }

  cartOpenBtns.forEach(btn => btn.addEventListener('click', openCart));
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
  if (cartDrawerOverlay) {
    cartDrawerOverlay.addEventListener('click', (e) => {
      if (e.target === cartDrawerOverlay) closeCart();
    });
  }

  function renderCart() {
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="cart-empty-message">
          <p style="font-size: 2rem; margin-bottom: 0.5rem;">🍯</p>
          <p style="font-weight: 600; color: var(--honey-200); margin-bottom: 0.3rem;">Your Honeycomb Basket is Empty</p>
          <p style="font-size: 0.85rem;">Discover our pure raw harvests and add a jar of golden nectar.</p>
        </div>
      `;
    } else {
      cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
          <img class="cart-item-img" src="${item.img}" alt="${item.title}" />
          <div class="cart-item-details">
            <h4 class="cart-item-title">${item.title}</h4>
            <div class="cart-item-price">$${item.price.toFixed(2)}</div>
            <div class="cart-qty-ctrl">
              <button class="qty-btn btn-qty-dec" data-id="${item.id}">-</button>
              <span style="font-size: 0.85rem; font-weight: 600; min-width: 16px; text-align: center;">${item.qty}</span>
              <button class="qty-btn btn-qty-inc" data-id="${item.id}">+</button>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Attach quantity click events
    cartItemsContainer.querySelectorAll('.btn-qty-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = cart.find(i => i.id === id);
        if (item) item.qty++;
        renderCart();
      });
    });

    cartItemsContainer.querySelectorAll('.btn-qty-dec').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const itemIndex = cart.findIndex(i => i.id === id);
        if (itemIndex > -1) {
          if (cart[itemIndex].qty > 1) {
            cart[itemIndex].qty--;
          } else {
            cart.splice(itemIndex, 1);
          }
        }
        renderCart();
      });
    });

    // Subtotal and count calculations
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
    const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);

    if (cartSubtotalEl) cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (cartBadgeEl) cartBadgeEl.textContent = totalItems;

    // Free gift milestone ($50 threshold)
    const goal = 50.0;
    const progress = Math.min(100, (subtotal / goal) * 100);
    if (freeGiftFillEl) freeGiftFillEl.style.width = `${progress}%`;
    if (freeGiftTextEl) {
      if (subtotal >= goal) {
        freeGiftTextEl.innerHTML = `<span>🎉 Unlocked!</span> <strong>Free Olive Wood Honey Dipper</strong>`;
      } else {
        const remaining = (goal - subtotal).toFixed(2);
        freeGiftTextEl.innerHTML = `<span>Free Gift</span> <span>Add <strong>$${remaining}</strong> for a Free Honey Spoon</span>`;
      }
    }
  }

  // Handle "Add to Cart" button clicks from product cards
  const addToCartButtons = document.querySelectorAll('.btn-add-cart');
  addToCartButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const card = button.closest('.product-card');
      const id = card.getAttribute('data-id') || 'wildflower';
      const title = card.querySelector('.product-title').textContent.trim();
      const priceText = card.querySelector('.product-price').textContent.replace('$', '').trim();
      const price = parseFloat(priceText) || 28.00;
      const img = card.querySelector('.product-image').getAttribute('src');

      const existingItem = cart.find(i => i.id === id);
      if (existingItem) {
        existingItem.qty++;
      } else {
        cart.push({ id, title, price, img, qty: 1 });
      }

      // Fly bee with nectar to cart
      const rect = button.getBoundingClientRect();
      beeEngine.flyItemToCart(rect.left + rect.width / 2, rect.top, cartBtnEl);

      // Play sound
      audio.playCartChime();

      renderCart();
      openCart();
    });
  });

  renderCart();

  // --------------------------------------------------------------------------
  // 7. CHECKOUT SIMULATION MODAL
  // --------------------------------------------------------------------------
  const checkoutBtn = document.getElementById('cart-checkout-btn');
  const promoInput = document.getElementById('promo-code-input');
  const applyPromoBtn = document.getElementById('apply-promo-btn');
  const promoMsg = document.getElementById('promo-status-msg');

  if (applyPromoBtn && promoInput) {
    applyPromoBtn.addEventListener('click', () => {
      const code = promoInput.value.trim().toUpperCase();
      if (code === 'SWEET10' || code === 'LITTLEBEEZ') {
        promoMsg.style.display = 'block';
        promoMsg.style.color = '#34d399';
        promoMsg.textContent = '10% discount applied to your nectar harvest!';
        audio.playCartChime();
      } else if (code === 'QUEENBEE15') {
        promoMsg.style.display = 'block';
        promoMsg.style.color = '#fde047';
        promoMsg.textContent = '🎉 15% Nectar Harvest Champion discount applied!';
        audio.playCartChime();
      } else {
        promoMsg.style.display = 'block';
        promoMsg.style.color = '#f87171';
        promoMsg.textContent = 'Invalid promo code. Play game to win QUEENBEE15';
      }
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) {
        alert('Your honey basket is empty!');
        return;
      }
      closeCart();

      // Trigger celebratory pollen burst
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          beeEngine.spawnPollenBurst(
            window.innerWidth * (0.3 + Math.random() * 0.4),
            window.innerHeight * (0.3 + Math.random() * 0.4)
          );
        }, i * 200);
      }

      alert('🍯 Thank you for your harvest order! Your raw artisan honey will be hand-packaged with love from our apiaries.');
      cart.length = 0;
      renderCart();
    });
  }

  // --------------------------------------------------------------------------
  // 8. INTERACTIVE VISCOSITY LAB SLIDER
  // --------------------------------------------------------------------------
  const labSlider = document.getElementById('lab-viscosity-slider');
  const labHoneyCanvas = document.getElementById('lab-canvas');
  const labFlowNameEl = document.getElementById('lab-flow-name');
  const labViscosityValEl = document.getElementById('lab-viscosity-val');

  if (labSlider && labHoneyCanvas) {
    const labCtx = labHoneyCanvas.getContext('2d');
    let labAnimFrame;

    function resizeLab() {
      const rect = labHoneyCanvas.getBoundingClientRect();
      labHoneyCanvas.width = rect.width * (window.devicePixelRatio || 1);
      labHoneyCanvas.height = rect.height * (window.devicePixelRatio || 1);
      labCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
    resizeLab();
    window.addEventListener('resize', resizeLab);

    let labTime = 0;

    function renderLab() {
      const rect = labHoneyCanvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      labCtx.clearRect(0, 0, w, h);
      labTime += 0.03;

      const val = parseFloat(labSlider.value); // 1 to 4
      let color1, color2, name, textVal;

      if (val <= 1.5) {
        name = 'Spring Acacia (Light, Silky)';
        textVal = '18.2 Pa·s (Flows gently)';
        color1 = '#fef08a';
        color2 = '#f59e0b';
      } else if (val <= 2.5) {
        name = 'Wild Meadow Blossom (Velvet)';
        textVal = '32.4 Pa·s (Balanced viscosity)';
        color1 = '#fbbf24';
        color2 = '#d97706';
      } else if (val <= 3.5) {
        name = 'Dark Forest Oak (Dense Amber)';
        textVal = '58.0 Pa·s (Thick & slow ribboning)';
        color1 = '#d97706';
        color2 = '#78350f';
      } else {
        name = 'Royal Nectar Comb (Ultra Viscous)';
        textVal = '86.5 Pa·s (Rich honey strings)';
        color1 = '#f59e0b';
        color2 = '#451a03';
      }

      if (labFlowNameEl) labFlowNameEl.textContent = name;
      if (labViscosityValEl) labViscosityValEl.textContent = textVal;

      // Draw flowing golden ribbons in lab canvas
      labCtx.save();
      const streamWidth = 8 + val * 6;
      const streamX = w / 2;

      // Top nozzle
      labCtx.fillStyle = '#261a10';
      labCtx.fillRect(streamX - 25, 0, 50, 20);

      // Flowing wavy stream
      labCtx.beginPath();
      labCtx.moveTo(streamX - streamWidth / 2, 20);
      for (let y = 20; y <= h - 40; y += 10) {
        const wave = Math.sin(y * 0.05 + labTime * (5 - val)) * (val * 3);
        labCtx.lineTo(streamX - streamWidth / 2 + wave, y);
      }
      for (let y = h - 40; y >= 20; y -= 10) {
        const wave = Math.sin(y * 0.05 + labTime * (5 - val)) * (val * 3);
        labCtx.lineTo(streamX + streamWidth / 2 + wave, y);
      }
      labCtx.closePath();

      const streamGrad = labCtx.createLinearGradient(0, 20, 0, h);
      streamGrad.addColorStop(0, color1);
      streamGrad.addColorStop(1, color2);
      labCtx.fillStyle = streamGrad;
      labCtx.shadowColor = '#f59e0b';
      labCtx.shadowBlur = 12;
      labCtx.fill();

      // Pooling puddle at bottom
      labCtx.beginPath();
      labCtx.ellipse(streamX, h - 35, 70 + val * 10, 18, 0, 0, Math.PI * 2);
      labCtx.fillStyle = streamGrad;
      labCtx.fill();

      labCtx.restore();
      labAnimFrame = requestAnimationFrame(renderLab);
    }

    renderLab();

    labSlider.addEventListener('input', () => {
      const v = parseFloat(labSlider.value);
      // Map to 0.3 - 0.95
      honeyPhysics.setViscosity(0.25 + (v / 4) * 0.65);
    });
  }

  // --------------------------------------------------------------------------
  // 9. STICKY HONEY SCROLL STREAM & HEADER SHADOW
  // --------------------------------------------------------------------------
  const scrollStream = document.getElementById('honey-scroll-stream');
  const siteHeader = document.querySelector('.site-header');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = Math.min(100, Math.max(0, (scrollY / maxScroll) * 100));

    if (scrollStream) {
      scrollStream.style.height = `${progress}%`;
    }

    if (siteHeader) {
      if (scrollY > 50) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    }
  });
});
