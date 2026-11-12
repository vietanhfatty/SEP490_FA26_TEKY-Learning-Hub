---
name: impeccable
description: Use when the user wants to design, redesign, shape, critique, audit, polish, simplify, harden, animate, or otherwise improve a frontend interface: websites, landing pages, dashboards, product UI, components, forms, settings, onboarding, empty states, and responsive views. Handles UX review, hierarchy, layout, typography, color, motion, UX copy, accessibility, responsive behavior, edge cases, and capturing or documenting design systems (PRODUCT.md, DESIGN.md). Also for making bland UI bolder, loud UI quieter, or crafting out-of-distribution visual craft. Not for backend-only or non-UI tasks.
argument-hint: "[command] [target]"
user-invocable: true
license: Apache 2.0
---

# Impeccable: Frontend Design Vocabulary & Quality Engine

> *This skill gives you the tools and permission to make design that earns the name out-of-distribution craft. Work as an award-winning design director would: production-grade code, a clear POV, a deep grasp of what the user needs, and exceptional craft.*

---

## Core Philosophy & Laws

1. **The Brief Wins:** Pinned aesthetics, eras, materials, fonts, and brand colors defined in `PRODUCT.md` or `DESIGN.md` override generic defaults. Never steer an authentic user brand into generic AI aesthetics.
2. **Refinement Preserves; Redesign Replaces:** A polish, harden, or audit pass preserves incumbent identity, scope, and behavior. Redesigns happen only when explicitly requested.
3. **No AI Slop:** Strictly reject cookie-cutter AI tropes:
   - No default ubiquitous Inter + monotone purplish-blue gradients.
   - No nesting cards inside cards inside cards without purpose.
   - No unstyled gray text on colored backgrounds (secondary text must be tinted to match the hue).
   - No zero-offset flat glowing borders as a lazy substitute for depth.
4. **The Quality Floor:**
   - Contrast: Body & placeholder $\ge 4.5:1$, large text $\ge 3:1$.
   - Typography: Body reading measure 65–75ch, purposeful scale, balanced headings.
   - Depth: Real light-source shadow offsets + soft blurs, layered elevation.
   - Spacing: Systematic tokenized spacing, generous section separation, breathing room above headings.
   - States: Every interactive element must ship default, hover, active, focus-visible, disabled, empty, and loading states.

---

## Command Routing & Vocabulary

All commands run under `/impeccable [command] [target]`:

### 1. Setup & Context
- **/impeccable init** (or `teach`): Interview the project owner to define audience, persona, goals, and technical boundaries; generate or update `PRODUCT.md`.
- **/impeccable document**: Inspect current codebase tokens (colors, typography, spacing, radius) and document them into `DESIGN.md`.
- **/impeccable extract [target]**: Extract reusable UI components and tokens from an existing screen or design mockup.

### 2. Planning & Direction
- **/impeccable shape [idea/feature]**: Plan and wireframe layout, user flow, and visual direction *before* writing code.
- **/impeccable [new surface/page]**: Greenfield creation with high craft, distinctive typography, and intentional aesthetics.

### 3. Evaluation & Review
- **/impeccable critique [target]**: Rigorous design review scoring against Nielsen's 10 heuristics (out of 40), cognitive load, hierarchy, and usability flaws (P0 to P3).
- **/impeccable audit [target]**: Systematic check for accessibility (WCAG AA), contrast, touch targets, keyboard navigation, and anti-pattern flags.

### 4. Directional Steering
- **/impeccable bolder [target]**: Elevate safe or timid designs. Enhance contrast, push type scale, sharpen hierarchy, and introduce decisive visual character.
- **/impeccable quieter [target]**: Tone down cluttered, overwhelming, or noisy interfaces. Reduce borders, soften contrast, and increase breathing room.
- **/impeccable distill [target]**: Strip redundant elements, simplify complex flows, and reduce cognitive load down to the essential core.
- **/impeccable typeset [target]**: Audit and refine font pairings, modular scale, line lengths, tracking, leading, and tabular alignment.
- **/impeccable colorize [target]**: Harmonize color palettes, calibrate light/dark theme contrast, and eliminate dirty grays on colored surfaces.
- **/impeccable layout [target]**: Correct alignment, grid consistency, responsive flex/grid wrappers, and visual rhythms.

### 5. Finishing & Hardening
- **/impeccable polish [target]**: The final ship-ready QA pass. Fix alignment drift, refine micro-interactions, smooth hover transitions, and verify state completeness.
- **/impeccable harden [target]**: Stress-test edge cases: extra-long text strings, missing avatars, network failure states, overflow clipping, and mobile viewports.
- **/impeccable clarify [target]**: Polish UX microcopy, error validation messages, tooltips, and empty-state guidance.
- **/impeccable adapt [target]**: Ensure fluid responsiveness across mobile (360px+), tablet, desktop, and ultra-wide screens.
- **/impeccable animate [target]**: Add purposeful, subtle micro-interactions and transitions (ease-out curves, 150-300ms durations, respect `prefers-reduced-motion`).
- **/impeccable delight [target]**: Introduce thoughtful signature details (subtle sound, playful micro-delight, Easter eggs, refined hover reactions).

---

## Execution Workflow

1. **Check Context:** Look for `PRODUCT.md` and `DESIGN.md`. If missing and starting greenfield, ask 3 concise questions to anchor the brand direction.
2. **Inspect Incumbent Code:** Read target files, styles, and markup.
3. **Apply Quality Floor:** Respect the craft rules in `reference/craft-floor.md`.
4. **Implement Cleanly:** Output production-ready, accessible, modular HTML/CSS/Tailwind/React/Vue/Svelte code matching the project stack.
