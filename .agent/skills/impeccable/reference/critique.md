# Impeccable Reference: Critique & UX Review

**Command:** `/impeccable critique [target]`

## Purpose
Acts as a Design Director review of an existing screen, component, or URL. Identifies usability flaws, cognitive overload, and anti-patterns before evaluating code.

## Review Rubric

### 1. Nielsen's 10 Heuristics Score (Score out of 40)
Evaluate each on a 1-4 scale:
1. Visibility of system status
2. Match between system and real world
3. User control and freedom (Undo / Back)
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, and recover from errors
10. Help and documentation

### 2. Cognitive Load & Hierarchy
- Does the primary action jump out in under 3 seconds?
- Is there too much competing visual weight?
- Are items grouped logically according to Gestalt principles?

### 3. Defect Classification
Group all issues by severity:
- **P0 (Blocker):** Broken user flow, missing critical CTA, illegible text (contrast < 3:1).
- **P1 (High):** Confusing layout, missing responsive behavior, lack of error states.
- **P2 (Medium):** Inconsistent spacing, uncalibrated border contrast, harsh shadows.
- **P3 (Polish):** Microcopy improvements, transition smoothness, subtle token drift.

### 4. Next Actions
Provide the immediate recommended commands (e.g. "Run `/impeccable polish` to fix P2/P3" or "Run `/impeccable bolder` to resolve timid hierarchy").

