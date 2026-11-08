# Impeccable Craft Floor & Quality Standards

This document specifies the strict mechanical and visual baseline that all frontend UI work must satisfy before it can be considered production-ready.

---

## 1. Contrast & Color Strategy
- **Contrast Ratios:**
  - Body copy & interactive text: $\ge 4.5:1$ against the immediate background.
  - Large headings ($\ge 18\text{pt}$ or $\ge 14\text{pt}$ bold): $\ge 3:1$.
  - Placeholder text: $\ge 4.5:1$ (never use unreadable light gray on white).
- **Surface Harmonization:**
  - On tinted or colored surfaces (e.g. dark blue card, green alert), secondary/muted text must NOT be pure neutral gray (`#888`). It must be tinted with the surface hue to prevent muddy, dirty visual artifacts.
  - Borders on colored surfaces must use opacity-based color scales (`rgba(white, 0.1)` or `rgba(black, 0.08)`), not hardcoded gray hex values.

---

## 2. Typography & Readability
- **Measure (Line Length):** Paragraph and prose body measure should be constrained to 65–75 characters (`max-w-prose` or `max-width: 68ch`).
- **Scale & Hierarchy:**
  - Establish clear, intentional scale steps (e.g., Minor Third 1.2 or Major Third 1.25).
  - Ensure headings have noticeably stronger presence than body copy.
  - Heading tracking (letter-spacing) should tighten slightly as font size increases (e.g., `-0.02em` to `-0.04em` on display titles).
  - Text numbers in data tables or financial figures must use tabular numerals (`font-variant-numeric: tabular-nums`).

---

## 3. Depth, Elevation & Borders
- **Realistic Light Source:**
  - Shadows must have a vertical offset and a proportional soft blur (e.g., `box-shadow: 0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)`).
  - Do NOT use unblurred zero-offset glowing borders as an excuse for depth unless explicit neon/cyberpunk aesthetics are specified in the brief.
- **Card Nesting Restraint:**
  - Avoid "cards inside cards inside cards". Differentiate nested sections using background tonal shifts, subtle dividers, or whitespace rather than repeated bordered boxes.

---

## 4. Spacing, Rhythm & Layout
- **Proximity Principle:** Items that belong together must be grouped closer together than unrelated items.
- **Headings Proximity:** Headings must always have more whitespace *above* them than *below* them (at least a 2:1 ratio) so they clearly bind to the content they introduce.
- **Responsive Rhythm:** Ensure container paddings adapt gracefully (e.g., `px-4` on mobile scaling to `px-8` on desktop).

---

## 5. State Completeness
Every interactive element and page component must implement:
- **Default State:** Clean, readable, balanced.
- **Hover State:** Smooth transition (150–200ms ease-out).
- **Focus-Visible State:** High-contrast accessible focus ring for keyboard navigation (`focus-visible:ring-2 focus-visible:ring-offset-2`).
- **Active/Pressed State:** Subtle tactile feedback (scale: 0.98 or slight inset).
- **Disabled State:** Clearly signaled (`opacity-50 cursor-not-allowed`), non-interactive.
- **Loading State:** Skeleton screen or discrete spinner without jarring layout shift (CLS = 0).
- **Empty State:** Helpful graphic/icon, clear explanation, and primary action call-to-action.
- **Error State:** Friendly actionable error message, colored indicator, and retry capability.
