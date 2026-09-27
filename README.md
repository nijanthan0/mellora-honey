# 🍯 MELLORA — Artisan Raw Honey Experience

A luxury, highly animated brand showcase and eCommerce website crafted for **Mellora** (Little Beez Honey). Built with pure HTML5, CSS3, and high-performance Vanilla JavaScript simulations.

---

## 🌟 Key Interactive Features

1. **🐝 Autonomous Roaming Bees (`js/bee-engine.js`)**:
   - Realistic 3D-styled honeybees with dynamic rapid wing fluttering.
   - Natural flocking and wandering across the viewport.
   - **Curiosity Hover**: Bees gently drift toward the mouse cursor when moving nearby.
   - **Startle Dodge**: Bees quickly dart away if startled by fast cursor movement.
   - **Click Pollen Burst**: Clicking anywhere drops glowing golden floral pollen that attracts nearby bees to collect nectar!
   - **Header Controls**: Adjust bee count (2 to 8) or pause anytime.

2. **🍯 Honey Spoon & Viscous Dripping Physics (`js/honey-physics.js`)**:
   - **Interactive Wooden Spoon/Dipper**: Move or drag the dipper around with your mouse or finger on touchscreens.
   - **Viscoelastic Liquid Dynamics**: Honey stretches into a slender golden filament, breaks into teardrop droplets, and splashes into the glass jar below with realistic concentric ripples.
   - **Controls**:
     - `[ 🍯 Drip Drop ]`: Releases an immediate fresh honey droplet.
     - `[ ⏳ Hold to Pour ]`: Holds a continuous golden stream that coils into the jar.
     - `[ 🌀 Stir Spoon ]`: Swirls the wooden dipper to release droplets.

3. **🔬 Interactive Honey Lab & Viscosity Slider**:
   - Explore how temperature, botanical origin, and season change honey viscosity (from silky Spring Acacia to ultra-dense Royal Nectar Comb).
   - Dynamic real-time flow visualizer displaying shear viscosity in Pa·s.

4. **🛒 Honeycomb Basket & Slide-Out Cart (`js/app.js`)**:
   - Slide-out glassmorphism cart drawer.
   - **Animated Delivery**: Adding an item makes a bee carry the golden nectar badge directly to your basket!
   - **Free Gift Progress Bar**: Unlock a free olive wood honey dipper with orders over $50.
   - **Promo Code Support**: Try `SWEET10` for 10% off.
   - Interactive checkout modal with celebration golden pollen burst.

5. **🔊 Sensory Sound Synthesizer (Web Audio API)**:
   - Opt-in nature sound ambiance with gentle honey droplet pings, pleasant low bee hums, and luxurious cart chimes. (Muted by default, toggle with the speaker button in the header).

6. **📜 Sticky Golden Scroll Stream**:
   - Golden liquid ribbon that flows down the left margin, tracking your scroll depth through the site.

---

## 📂 Project Structure

```
Mellora-static/
├── index.html                 # Main website markup & semantic sections
├── README.md                  # Documentation and setup guide
├── css/
│   ├── style.css              # Design tokens, obsidian luxury theme & typography
│   ├── animations.css         # Keyframe physics, wing flaps, ripples & sparkles
│   └── components.css         # Navigation, dipper stage, product cards, cart drawer
├── js/
│   ├── bee-engine.js          # Autonomous bee kinematics & pollen particle physics
│   ├── honey-physics.js       # Honey spoon dipper & viscoelastic dripping simulation
│   └── app.js                 # Cart state, audio synthesizer, 3D card tilt & controls
└── assets/
    └── images/                # High-definition studio product & apiary photography
        ├── jar-wildflower.jpg # Wildflower Raw Reserve
        ├── jar-acacia.jpg     # Pure Acacia Nectar
        ├── jar-forest.jpg     # Dark Forest & Comb Honey
        ├── jar-royal.jpg      # Royal Nectar 24K Gold
        └── apiary-hero.jpg    # Mountain Alpine Apiary Sanctuary
```

---

## 🚀 How to Run Locally

You can open `index.html` directly in any web browser, or launch a quick local static server:

```bash
# Using Python 3:
python3 -m http.server 8000

# Using Node.js (npx serve):
npx serve .
```

Then visit `http://localhost:8000` in your browser.
