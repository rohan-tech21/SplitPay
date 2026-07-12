---
name: Aurelian Reserve
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d8c3b4'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#a08d80'
  outline-variant: '#524439'
  surface-tint: '#ffb77b'
  primary: '#ffb77b'
  on-primary: '#4d2700'
  primary-container: '#c8803f'
  on-primary-container: '#432100'
  inverse-primary: '#8c4f10'
  secondary: '#d3c5ad'
  on-secondary: '#382f1e'
  secondary-container: '#524835'
  on-secondary-container: '#c5b79f'
  tertiary: '#a4d2a6'
  on-tertiary: '#0e3819'
  tertiary-container: '#709b73'
  on-tertiary-container: '#063113'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdcc2'
  primary-fixed-dim: '#ffb77b'
  on-primary-fixed: '#2e1500'
  on-primary-fixed-variant: '#6d3a00'
  secondary-fixed: '#f0e0c8'
  secondary-fixed-dim: '#d3c5ad'
  on-secondary-fixed: '#221b0b'
  on-secondary-fixed-variant: '#4f4533'
  tertiary-fixed: '#bfeec1'
  tertiary-fixed-dim: '#a4d2a6'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#274f2e'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1200px
  gutter: 24px
---

## Brand & Style
The brand personality centers on the intersection of high finance and artisanal craftsmanship. It targets a discerning user who values precision, discretion, and the tactile quality of physical luxury—evoking the weight of a brushed metal card or the grain of premium leather. 

The design style is a hybrid of **Modern Minimalism** and **Tactile Glassmorphism**. It utilizes deep obsidian surfaces layered with semi-transparent modules to create a sense of structural depth. Visuals are anchored by "metallic" accents and extremely fine-lined borders that mimic engraving. The emotional goal is to provide a sense of calm, absolute security, and effortless sophistication, moving away from typical "startup" vibrancy toward a permanent, institutional aesthetic.

## Colors
The palette is rooted in a "Noir-Metallic" spectrum. The foundation is an ultra-dark obsidian (#121212) which provides the necessary void for luxury accents to resonate.

- **Primary (Copper):** Used sparingly for interactive highlights, active states, and critical branding moments. It should be treated as a physical material, often paired with subtle gradients to simulate light hitting metal.
- **Secondary (Champagne):** This is the primary typographic color. It offers a softer, more sophisticated contrast than pure white, reducing eye strain and feeling more "editorial."
- **Tertiary (Forest Green):** Reserved strictly for positive financial growth and successful transaction states. Its deep tone maintains the serious atmosphere.
- **Borders:** Extremely subtle. Use the champagne color at 8% opacity to define structure without breaking the visual flow of the dark canvas.

## Typography
The system uses **Manrope** across all functional levels to ensure maximum readability and a systematic, geometric appearance that feels engineered. (Note: For Logo and Display elements, high-contrast geometric sans-serifs should be utilized to maintain the "Linear" aesthetic).

- **Headlines:** Use tighter letter-spacing and medium-to-bold weights to create a "locked-in" professional look.
- **Body Text:** Standard weight with generous line height for clarity in financial disclosures and transaction details.
- **Labels:** Use uppercase and increased letter-spacing for small metadata to evoke the feel of premium stationery or watch-face engravings.

## Layout & Spacing
The layout philosophy is built on "The Gallery Grid"—a 12-column system that prioritizes generous white space (or "black space") to create a sense of exclusivity and breathing room.

- **Desktop:** 12-column grid, 80px side margins, 24px gutters. Content is often centered or offset to create a dynamic, editorial feel.
- **Mobile:** 4-column grid, 20px side margins.
- **Vertical Rhythm:** A strict 8px baseline grid is used. Sections should be separated by large vertical gaps (48px to 80px) to prevent the UI from feeling cluttered or "cheap."
- **Components:** Use inner padding of 24px for cards to ensure data has significant clearance from borders.

## Elevation & Depth
Depth is created through "Obsidian Stacking" rather than traditional drop shadows.

- **Level 0 (Base):** #121212. The infinite floor.
- **Level 1 (Cards):** #1A1A1A with a 1px border of `rgba(247,231,206,0.08)`. These appear to sit directly on the base.
- **Level 2 (Active/Hover):** Cards gain a subtle outer glow using a very low-opacity copper tint and a secondary inner shadow to create a "pressed" or "beveled" look.
- **Level 3 (Overlays):** 80% opacity backgrounds with a 20px backdrop blur (Glassmorphism). This is used for modals and dropdowns to maintain context of the financial data beneath while providing a premium, translucent feel.

## Shapes
The shape language is "Precision-Crafted." We avoid overly bubbly or circular forms in favor of architectural strength.

- **Standard Radius:** 8px for small components (inputs, buttons).
- **Large Radius:** 16px for primary containers and cards.
- **Interactive Elements:** Buttons should feel like physical tiles. Small rounding (8px) keeps them looking sharp and professional while being comfortable to touch.

## Components
- **Buttons:** 
    - *Primary:* Solid Copper (#B87333) with dark text. No shadow, or a very tight, hard shadow. 
    - *Secondary:* Ghost style with 1px Champagne border at 15% opacity.
- **Cards:** Use #1A1A1A. Every card must have a 1px subtle border. In premium contexts, add a 2px copper top-border accent.
- **Inputs:** Darker than the card background (#121212), 8px radius. The cursor and focus border should be Copper. Labels sit above the field in `label-sm` style.
- **Chips/Status:** Use the Forest Green for success, but keep it low-chroma. Backgrounds for status chips should be at 10% opacity of the status color to keep the UI sophisticated.
- **Lists:** Transaction rows are separated by 1px champagne-tinted lines (8% opacity). Use generous 16px vertical padding for each row to emphasize "luxury space."
- **Glass Overlays:** Use for navigation bars (top-fixed) with a `saturate(180%) blur(20px)` effect to allow content to bleed through elegantly.