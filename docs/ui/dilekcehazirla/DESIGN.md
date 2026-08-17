---
name: Cyber-Juris Logic
colors:
  surface: '#0c1324'
  surface-dim: '#0c1324'
  surface-bright: '#33394c'
  surface-container-lowest: '#070d1f'
  surface-container-low: '#151b2d'
  surface-container: '#191f31'
  surface-container-high: '#23293c'
  surface-container-highest: '#2e3447'
  on-surface: '#dce1fb'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dce1fb'
  inverse-on-surface: '#2a3043'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00a572'
  on-tertiary-container: '#00311f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0c1324'
  on-background: '#dce1fb'
  surface-variant: '#2e3447'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.1em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: '0'
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 32px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  section-gap: 64px
---

## Brand & Style

This design system establishes a high-performance, futuristic workspace for modern legal professionals. It moves away from the traditional "paper and mahogany" aesthetic in favor of a **Sophisticated Glass-Dark** style, blending **Minimalism** with **Glassmorphism**. 

The brand personality is expert, efficient, and technologically superior. It evokes the feeling of a command center for legal analysis, utilizing deep obsidian surfaces, precision-engineered typography, and vibrant electric accents. The UI aims to instill confidence through clarity, speed, and high-contrast information density.

**Key visual principles:**
- **Technological Precision:** Every element is aligned to a rigorous grid with razor-thin borders.
- **Luminous Depth:** Use of backdrop blurs and subtle gradients to imply layers of intelligence.
- **High-Velocity Navigation:** Visual cues are sharp and intentional, designed for rapid scanning of complex data.

## Colors

The palette is optimized for long-duration focus in a dark environment, using **Deep Obsidian (#020617)** as the primary surface color to reduce eye strain while maintaining a high-tech feel.

- **Primary (Electric Blue):** Used for primary actions, focus states, and active navigation indicators.
- **Secondary (Cyber Purple):** Used for analytical insights, AI-driven features, and subtle data visualizations.
- **Accents (Neon Green):** Reserved strictly for "Success," "Verified," and "Analysis Complete" states.
- **Surface Tiers:** 
  - Base: `#020617`
  - Elevated (Glass): `rgba(15, 23, 42, 0.7)` with `backdrop-filter: blur(12px)`.
  - Borders: `rgba(255, 255, 255, 0.1)` for a crisp, technical finish.

## Typography

The typography system leverages **Geist** for headlines to achieve a technical, geometric look with tight tracking for a "locked-in" feel. **Inter** provides high readability for dense legal text in the body. **JetBrains Mono** is introduced for labels and metadata to reinforce the sense of a high-tech data environment.

**Usage Guidelines:**
- **Tracking:** Apply `-2%` to `-4%` letter spacing on all Geist headlines above 24px.
- **Hierarchy:** Use `label-caps` for table headers and small metadata categories.
- **Contrast:** Maintain high contrast between headlines (Pure White) and body text (Slate 300) to guide the eye through long-form legal documents.

## Layout & Spacing

The layout utilizes a **12-column fluid grid** for desktop, shifting to a single-column stack for mobile. The system is built on a strict **4px baseline grid** to ensure mathematical precision in all component sizing.

- **Margins:** Desktop uses a 32px safe-area margin to give the interface room to breathe.
- **Density:** While the overall layout is airy, internal component spacing (within cards and tables) should be compact to allow for maximum information density.
- **Responsive Behavior:** Sidebars collapse into icons on tablet, while the primary workspace maintains a minimum width of 600px to ensure legal text remains legible without excessive line lengths.

## Elevation & Depth

Depth is not communicated via shadows, but through **Tonal Layering and Glassmorphism**.

- **Level 0 (Base):** Deep Obsidian (#020617).
- **Level 1 (Sub-surface):** Slightly lighter navy-black for sidebar navigation or secondary panels.
- **Level 2 (Floating/Active):** Semi-transparent glass surfaces (`backdrop-filter: blur(16px)`) with a 1px white border at 10% opacity. 
- **Active State Highlights:** Use a 2px outer glow (Primary Blue) instead of a traditional drop shadow to simulate a "powered-on" device state.
- **Transitions:** All depth changes (e.g., hovering over a card) must use a 150ms "Ease-Out" transition for a snappy, high-performance feel.

## Shapes

The shape language is **Soft (0.25rem)**, bordering on sharp. This maintains the "clean and technical" aesthetic without the clinical coldness of 0px corners.

- **Buttons & Inputs:** Use the standard `rounded` (4px).
- **Cards & Modal Containers:** Use `rounded-lg` (8px) to subtly differentiate larger structural blocks.
- **Progress Indicators:** Use sharp 0px corners for progress bars and linear gauges to emphasize the "data" nature of the interface.

## Components

### Buttons
- **Primary:** Electric Blue background, white text, Geist Semibold. 1px inner border of a lighter blue for a "glass-shard" effect.
- **Secondary:** Transparent background, 1px white border (20% opacity), hover state fills with 10% white.

### Inputs
- **Text Fields:** Dark background, 1px border. On focus, the border turns Electric Blue with a subtle 4px outer glow.
- **Labels:** Use `label-caps` in JetBrains Mono, positioned above the field.

### Chips & Badges
- **Status Badges:** Small, pill-shaped, using low-opacity backgrounds (e.g., 10% Neon Green for "Success") with high-intensity text colors.

### Cards
- **Analysis Cards:** Glassmorphic background, 1px border. Headers should have a subtle gradient background (Deep Blue to Deep Obsidian).

### Data Tables
- **Styling:** No vertical borders. Horizontal borders at 5% white opacity. Hovering a row should apply a 5% white overlay to signify selection.

### Micro-interactions
- **Loading:** Use a linear "scanning" bar that moves horizontally across the top of a container rather than a circular spinner.
- **Analysis Complete:** A subtle green pulse that radiates from the 'Analysis Complete' chip.