# FoodBuddy UX/UI Critique Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement UI/UX fixes based on the critique in @docs/critique-ux-ui.md, focusing on hierarchy, typography, colors, and usability.

**Architecture:** Frontend-focused refactoring of React components and CSS theme tokens. No backend changes expected.

**Tech Stack:** React (TypeScript), Tailwind CSS (v4), Custom CSS Variables.

---

## Completed Tasks (Drafted from previous actions)

- [x] **Task 1: Dashboard Reorganization (`/arrange`)**
  - Moved Food Log to the top.
  - Made Supplements, Exercise, and Notes sections collapsible.
  - Cleaned up toolbar (removed emojis, improved hierarchy).
- [x] **Task 2: Typography Scale (`/typeset`)**
  - Replaced system fonts with "Geist"/"Inter".
  - Defined 3-level typographic scale in `index.css`.
- [x] **Task 3: Semantic Palette Fix (`/colorize`)**
  - Updated `--green`, `--yellow`, `--red` to be distinct and colorblind-friendly.
- [x] **Task 4: Water Section Simplification (`/distill`)**
  - Reduced quick-add options.
  - Added "History" label to toggle.
- [x] **Task 5: Empty States (`/onboard`)**
  - Added empty states for Favorites, Frequent, and Supplements.
- [x] **Task 6: Branding and Polish (`/polish`)**
  - Updated logo to "FoodBuddy".
  - Fixed hardcoded English strings in several places.
  - Refined nav edit button.

---

## Remaining Tasks

### Task 7: Safety & Verification (Undo & Confirmations)

**Problem:** Confirm All and Delete actions lack enough safety/undo.
**Files:**
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/components/EntryTable.tsx` (if needed for undo)

- [ ] **Step 1: Add confirmation for 'Confirm All'**
  - Implement a confirmation dialog before executing `handleConfirmAll`.

- [ ] **Step 2: Add Undo capability for quick-logs**
  - When a quick-log (favorite/frequent) is performed, show a toast with an "Undo" action.

- [ ] **Step 3: Verification**
  - Run the app and verify the confirmation dialog appears.
  - Verify that undoing a quick-log removes the entry.

### Task 8: Final Polish & Audit

**Files:**
- Modify: `src/i18n/translations.ts`
- Audit: All modified files

- [ ] **Step 1: Audit for remaining hardcoded strings**
  - Search for strings like "logged", "planned", "Pantry short" that might still be in English in components.
  - Ensure Italian translations are 100% complete for the new keys.

- [ ] **Step 2: Verification**
  - Check linter and build.

---

## Verification Checklist

- [ ] **Visual Hierarchy:** Dashboard Search is prominent at the top.
- [ ] **Typography:** Font is consistent (not system default).
- [ ] **Accessibility:** Colors for Macros (Green/Yellow/Red) are distinct.
- [ ] **Usability:** Water section has fewer buttons; "History" is labeled.
- [ ] **Safety:** "Confirm All" requires confirmation.
- [ ] **Branding:** "FoodBuddy" logo visible in Nav.
