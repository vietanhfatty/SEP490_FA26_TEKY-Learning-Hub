# Impeccable Reference: Init & Context Discovery

**Command:** `/impeccable init` (or `teach`)

## Purpose
Establishes the durable design context and identity of the product, preventing the AI agent from guessing or defaulting to generic templates. Saves findings into `PRODUCT.md` and `DESIGN.md`.

## Execution Steps

1. **Scan Existing Evidence:**
   - Look for existing `PRODUCT.md`, `DESIGN.md`, README, design tokens, `tailwind.config.js`, or Figma links.
   - If present, summarize what is known and only ask for missing pieces.

2. **Conduct the 3-Question Interview (if needed):**
   - **Target Audience & Persona:** Who uses this app daily? (e.g. educators, kids 7-16, corporate managers).
   - **Visual Personality & Tone:** What is the mood? (e.g. vibrant & playful vs. minimal & high-trust enterprise vs. editorial tech).
   - **Key Constraints:** Tech stack constraints, accessibility targets (WCAG AA), theme modes (Dark/Light/Both).

3. **Output Artifact: `PRODUCT.md`:**
   Write a concise, permanent Markdown document containing:
   - Product One-Liner
   - Primary User Personas & Jobs-to-be-Done
   - Aesthetic Identity (Fonts, Primary Palette, Tone of Voice)
   - Do's & Don'ts
