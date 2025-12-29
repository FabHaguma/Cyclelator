# Cyclelator v2.1 – Product Requirements Document (PRD)

## 1. Product Overview

**Cyclelator v2.1** is a web-based menstrual cycle tracking system designed for a **single administrator** to manage and monitor menstrual cycles for multiple individuals. The application emphasizes clarity, predictability, and centralized control, moving beyond static assumptions toward adaptive, data-informed cycle predictions.

Version 2.1 formalizes architectural and UX decisions made after v2.0 planning, particularly around styling, data flow, and system boundaries.

---

## 2. Core Principles

- **Single Admin Model:** One user manages all profiles.
- **Predictability Over Cleverness:** All calculations are deterministic and explainable.
- **Separation of Concerns:** Business logic, persistence, and UI rendering are strictly separated.
- **Centralized Theming:** Visual changes should be achievable from a single theme source.
- **Online-Only Operation:** The system assumes continuous connectivity.

---

## 3. Functional Requirements

### 3.1 Guest Mode (Landing Page)

The application must be usable immediately upon load.

- User may input a **Cycle Start Date**
- System generates a calendar using the **Standard Model**
- No data is persisted
- No profile is created

**Standard Model:**
- Fixed 28-day cycle
- Ovulation = Day 14 (L − 14)
- Dangerous Zone = Ovulation − 5 days through Ovulation day (6 days total)

---

### 3.2 Profile Management

The administrator can manage multiple tracked individuals.

#### 3.2.1 Create Profile

Inputs:
- Nickname (required, unique)
- Avatar color (selected via color picker)
- Optional historical cycle start dates (1–3 entries)

Rules:
- Avatar color is used **only** for profile identification (UI labels, list indicators)
- Avatar color **does not propagate** to calendar styling or logic

Defaults:
- If no history is provided, the profile uses the Standard Model

---

#### 3.2.2 Edit Profile

The admin can:
- Rename the profile
- Change avatar color
- Set or remove a **manual cycle length override**
- Delete the profile

Manual override:
- Forces a fixed cycle length
- Takes precedence over inferred averages

---

#### 3.2.3 Profile List Behavior

- Profiles are displayed in a persistent ordered list
- Reordering is allowed **only within the list**
- Reordering is persisted
- Profiles cannot be dragged outside the list or into other UI zones

---

## 4. Cycle Logic & Calculations

All cycle calculations are performed **outside UI components**.

### 4.1 Cycle Length Determination (L)

Priority order:

1. Manual override (if set)
2. Average of last 3 recorded cycles (if ≥3 exist)
3. Standard Model (L = 28)

---

### 4.2 Derived Values

- **Ovulation Day (O):** L − 14
- **Dangerous Zone:**
  - Start: O − 5
  - End: O
  - Duration: 6 days

---

### 4.3 Calendar Model

UI components receive a **fully precomputed calendar model**, e.g.:

```ts
type CalendarDay = {
  date: string;
  isDangerous: boolean;
  isOvulation: boolean;
  isPeriodStart: boolean;
};
```

UI components must not:
- Perform date math
- Infer cycle logic
- Recalculate boundaries

---

## 5. Data Entry & Recalculation

- Admin can add a new period start date per profile
- On entry:
  - Previous cycle length is computed
  - Historical data is updated
  - Future predictions are recalculated immediately

---

## 6. Data Persistence

### 6.1 Database

- SQLite
- Accessed via an **abstraction service layer**
- React components do not interact with SQLite directly

---

### 6.2 Schema

#### profiles table

| Column | Type | Description |
|------|------|------------|
| id | INTEGER | Primary key |
| nickname | TEXT | Display name |
| avatar_color | TEXT | Hex color |
| display_order | INTEGER | Sorting order |
| manual_cycle_length | INTEGER | Nullable |
| created_at | DATETIME | Creation timestamp |

---

#### cycles table

| Column | Type | Description |
|------|------|------------|
| id | INTEGER | Primary key |
| profile_id | INTEGER | FK to profiles.id |
| start_date | TEXT | ISO date (YYYY-MM-DD) |
| computed_length | INTEGER | Calculated when next cycle is added |

---

## 7. UI / UX Requirements

### 7.1 Styling System

- **Vite + React**
- **CSS Modules** for component-level styling
- **Global theme file** for:
  - Colors
  - Spacing
  - Typography
  - Semantic tokens

Example:

```css
:root {
  --color-danger: #ff6b6b;
  --color-ovulation: #ff3b3b;
  --color-neutral: #f5f5f5;
}
```

Changing the theme must not require component-level edits.

---

### 7.2 Dashboard

- Header: “Tracking: [Profile Name]”
- Status summary (e.g., “Day 10 of 31”, “Dangerous Zone”)
- Calendar grid:
  - Neutral days
  - Dangerous zone (theme color)
  - Ovulation day (distinct emphasis)

---

### 7.3 Management Interface

- Profile switcher (dropdown or sidebar)
- Edit modals for profile changes
- Drag handles for list reordering
- Clear visual distinction between view mode and manage mode

---

## 8. Technical Constraints & Assumptions

- Web-only application
- Online-only operation
- No authentication system
- No offline mode
- No background sync
- Business logic must be testable independently of UI

---

## 9. Explicit Non-Goals

- Multi-user authentication
- Partner sharing
- Medical diagnosis
- Notifications or reminders
- Offline-first support

---

## 10. Future Considerations (Out of Scope)

- Mobile wrapper
- Exporting data
- Multi-admin support
- Analytics dashboards
- Role-based access

---

**End of Document**
