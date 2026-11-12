# Impeccable Reference: Polish & Pre-Ship QA

**Command:** `/impeccable polish [target]`

## Purpose
The final quality gate before shipping frontend code. Polishes details, cures visual drift, and guarantees state completeness without altering incumbent design architecture.

## Execution Checklist

1. **Token Alignment:**
   - Verify all paddings, margins, gaps, fonts, and colors map directly to design system tokens.
   - Eliminate one-off arbitrary values (e.g. `mt-[13px]`, `#494949`).

2. **Transition & Micro-Interactions:**
   - Smooth all state changes (`transition-colors duration-150 ease-out` or `transition-all duration-200`).
   - Remove instant jarring pop-in/pop-out.

3. **Alignment & Visual Rhythms:**
   - Align baselines of labels and input fields.
   - Align icons optically within button frames.
   - Ensure vertical rhythm across columns is balanced.

4. **Edge Cases & Empty States:**
   - Test text truncation with ellipsis or multi-line wrap (`truncate` or `line-clamp-2`).
   - Confirm skeleton loaders or spinners render smoothly without layout shift.

