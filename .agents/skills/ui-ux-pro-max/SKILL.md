---
name: ui-ux-pro-max
description: UI/UX design intelligence engine for web, mobile, and dashboard interfaces. Use when designing, building, reviewing, or styling interfaces, components, design systems, layouts, color schemes, typography, responsive behavior, accessibility, and stack-specific UI implementation. Drives offline BM25 search over local design databases to generate custom blueprints.
argument-hint: "[query] [--design-system] [--domain styles|palettes|typography|ux|stacks] [--stack react|nextjs|vue|tailwind]"
user-invocable: true
license: MIT
---

# UI/UX Pro Max: Design Intelligence & Architecture Engine

> *A local, zero-dependency design intelligence engine that queries curated design knowledge bases using BM25 search to generate production-ready design system blueprints before writing code.*

---

## When to Use This Skill

Activate this skill when:
- Designing new pages, components, dashboards, or portals from scratch.
- Searching for optimal color palettes, font pairings, and layout structures tailored to a specific domain (e.g. EdTech, SaaS, Healthcare, FinTech).
- Reviewing UX edge cases: touch targets, contrast ratios, empty states, and accessibility compliance.
- Aligning UI code with framework-specific best practices (React, Next.js, Tailwind CSS, Shadcn UI).

---

## Local BM25 Search CLI

The skill includes an embedded offline Python search tool located at `scripts/search.py` (uses standard library only, zero network requests):

```bash
# 1. Generate a complete design system blueprint for your domain:
python .agent/skills/ui-ux-pro-max/scripts/search.py "edtech student portal" --design-system --stack react

# 2. Search specific design domains:
python .agent/skills/ui-ux-pro-max/scripts/search.py "dashboard analytics" --domain styles
python .agent/skills/ui-ux-pro-max/scripts/search.py "education steam" --domain palettes
python .agent/skills/ui-ux-pro-max/scripts/search.py "vietnamese readability" --domain typography
python .agent/skills/ui-ux-pro-max/scripts/search.py "contrast accessibility" --domain ux
```

---

## Core Design Workflow

1. **Query Design Intelligence:**
   Before coding a screen or component, query `search.py` with your domain keywords to retrieve the recommended aesthetic style, color harmonies, typography scale, and UX rules.

2. **Harmonize with Project Context:**
   Combine the search findings with the project's [`PRODUCT.md`](file:///d:/KLTN/SEP490_FA26_TEKY-Learning-Hub/PRODUCT.md) and [`DESIGN.md`](file:///d:/KLTN/SEP490_FA26_TEKY-Learning-Hub/DESIGN.md).

3. **Verify Quality Baseline:**
   - **Contrast:** $\ge 4.5:1$ for body text; $\ge 3:1$ for large headings.
   - **Spacing:** $2:1$ whitespace ratio above headings vs below.
   - **Touch Targets:** $\ge 44\text{px} \times 44\text{px}$ for interactive elements on mobile/student views.
   - **Numerals:** `tabular-nums` for timetable, attendance, and financial data.
   - **State Completeness:** Default, hover, active, focus-visible, disabled, loading, empty, and error states.

4. **Generate Production Code:**
   Output clean, modular, accessible code utilizing the project's chosen stack (React + Tailwind CSS + Lucide Icons).
