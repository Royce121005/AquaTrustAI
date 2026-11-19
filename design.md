# AquaTrustAI — Master Design System Specification (`design.md`)
**Document Version:** 1.0.0-ENTERPRISE-SCADA  
**Authority:** Single Source of Truth for Frontend Architecture & UI/UX  
**Target Environment:** Mission-Critical Industrial Wastewater Monitoring, Digital Twin, SCADA, AI Analytics & Blockchain Provenance  

---

## 1. Product Design Philosophy

AquaTrustAI is not a generic administrative dashboard; it is a mission-critical industrial SCADA, physical process simulation, automated regulatory compliance, and cryptographic provenance platform. Operators, environmental regulators (CPCB), auditors, and plant engineers rely on this interface to make split-second operational decisions and legal certification judgments.

### Core Tenets
1. **Uncompromised Truthfulness & Data Integrity:**
   - Visual presentation must reflect verified backend truth without fabrication, hardcoded mock values, or artificial smoothing.
   - Simulation modes, mock ledgers, and unverified telemetry must never masquerade as live production Fabric DLT records or certified discharge data.
   - Missing, stale, suspect, or rejected telemetry must be prominently and unambiguously flagged.

2. **Industrial SCADA Ergonomics & Cognitive Load Reduction:**
   - Operators monitor dense streams of multidimensional time-series data for hours. The UI employs an intentional, dark-mode-first industrial control-room aesthetic (`#0B0F17` base) engineered for low ocular fatigue, high contrast legibility, and rapid fault diagnosis.
   - Information hierarchy is strict: High-priority alarms, abnormal kinetic variances, and compliance excursions take visual precedence over secondary metadata.

3. **Deterministic State Reflection:**
   - The UI honors the backend's three-layer verification model: (1) Deterministic Pre-AI validation, (2) AI Anomaly Isolation (Isolation Forest), and (3) Cryptographic Proof & Append-Only Anchoring. Every screen clearly delineates which layer generated a given observation or verdict.

4. **Zero Backend Compromise:**
   - The backend REST, WebSocket, AI inference, and database layer is strictly READ-ONLY. The frontend adapts to and elegantly presents authoritative backend contracts without altering endpoints, query parameters, payloads, or schemas.

---

## 2. Brand Identity & Visual Direction

### Brand Identity
- **Platform Name:** AquaTrustAI (IWM-BTS — Intelligent Wastewater Monitoring & Blockchain Traceability System)
- **Tagline:** Clarity for Every Drop of Data
- **Domain:** Municipal & Industrial Wastewater Treatment (STP / ETP), CPCB Standard Enforcement, Kinetic Digital Twin Modelling, Cryptographic Integrity Ledger
- **Visual Archetype:** High-Precision SCADA Control Room meets Modern Enterprise Cryptographic Audit Platform (inspired by Palantir Foundry, Honeywell Experion, Grafana Enterprise, and AWS CloudWatch).

---

## 3. Colour Palette with Exact HEX Values

The AquaTrustAI colour system is mathematically balanced for dark-mode command surfaces with WCAG AAA / AA contrast ratios.

```
┌────────────────────────────────────────────────────────────────────────┐
│ PRIMARY INDUSTRIAL SCADA CANVASES & SURFACES                           │
├────────────────────────────────────────────────────────────────────────┤
│ Canvas Deep Background    #0B0F17   Base viewport and full bleed canvas│
│ Surface Panel (Elevated)  #111827   Cards, drawers, navigation rails   │
│ Surface Accent / Float    #1E293B   Hover states, modals, floating tabs│
│ Surface Hairline Border   #1F293D   Primary subtle separation (1px)    │
│ Surface Contrast Border   #334155   Active inputs, focused cards       │
│ Surface Highlight Accent  #0284C7   Brand primary cyan blue            │
└────────────────────────────────────────────────────────────────────────┘
```

### Detailed Token Palette

| Token Name | Exact HEX | Intended Purpose |
| :--- | :--- | :--- |
| `scada-bg` | `#0B0F17` | Root background for all authenticated application routes |
| `scada-card` | `#111827` | Standard card and data panel background |
| `scada-surface` | `#161F30` | Interactive card headers, table header rails |
| `scada-elevated` | `#1E293B` | Popovers, modal dialogues, floating toolbars |
| `scada-border` | `#1F293D` | Default hairline 1px border for cards & grids |
| `scada-border-focus`| `#38BDF8` | Focus ring, active stage highlight |
| `brand-50` | `#F0F9FF` | Light mode text / invert highlights |
| `brand-400` | `#38BDF8` | Electric Cyan: primary active links, glows |
| `brand-500` | `#0EA5E9` | Primary action buttons, telemetry trend lines |
| `brand-600` | `#0284C7` | Primary brand base, focused badges |
| `status-valid` | `#10B981` | Emerald: Valid quality, Compliant CPCB, Normal AI |
| `status-valid-bg` | `#064E3B` | Translucent pill bg for valid statuses (alpha 0.25) |
| `status-suspect` | `#F59E0B` | Amber: Suspect telemetry, Rate-of-change warnings |
| `status-suspect-bg` | `#78350F` | Translucent amber pill background |
| `status-invalid` | `#EF4444` | Crimson: Invalid telemetry, Non-compliant, Tamper |
| `status-invalid-bg` | `#7F1D1D` | Translucent crimson pill background |
| `dlt-fabric` | `#10B981` | Hyperledger Fabric live anchor active emerald |
| `dlt-simulation` | `#F59E0B` | Local simulation mode warning amber |
| `crypto-violet` | `#8B5CF6` | Merkle root, cryptographic hash, digital signature |
| `pipe-main-effluent`| `#0EA5E9` | Main hydraulic process flow piping |
| `pipe-ras-recycle` | `#10B981` | Return Activated Sludge (RAS) piping |
| `pipe-was-purge` | `#F97316` | Waste Activated Sludge (WAS) piping |
| `pipe-air-header` | `#A855F7` | Aeration blower compressed air header |

---

## 4. Typography System & Font Hierarchy

AquaTrustAI uses a dual-font typographic architecture:
1. **Primary Humanist/Neo-Grotesque UI Font:** Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif.
2. **Technical Telemetry & Instrumentation Font:** 'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', Menlo, Monaco, Consolas, monospace. All telemetry values, sensor UUIDs, hash strings, and timestamps use tabular numerals (`tabular-nums`).

---

## 5. Font Sizes, Weights, and Line Heights

| Style Name | Size | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `display-lg` | 32px (2.0rem) | 700 Bold | 38px (1.2) | -0.025em | Main hero titles, Login splash |
| `display-sm` | 24px (1.5rem) | 700 Bold | 32px (1.33) | -0.02em | Page headers, Digital Twin stage titles |
| `heading-md` | 18px (1.125rem) | 600 SemiBold | 24px (1.33) | -0.015em | Card headers, Modal titles, Drawer headers |
| `heading-sm` | 14px (0.875rem) | 600 SemiBold | 20px (1.43) | -0.01em | Table subheaders, Tab labels, Form labels |
| `body-md` | 13px (0.8125rem) | 400 Regular | 18px (1.38) | normal | Standard text, Descriptions, Table body |
| `body-sm` | 12px (0.75rem) | 400 Regular | 16px (1.33) | normal | Meta captions, Tooltip text, Minor notes |
| `mono-telemetry` | 13px (0.8125rem) | 600 SemiBold | 18px (1.38) | normal | Sensor readings, BOD/COD values, Limits |
| `mono-micro` | 11px (0.6875rem) | 500 Medium | 14px (1.27) | +0.05em | Badges, UUIDs, Tx IDs, Timestamps, Tags |
| `mono-eyebrow` | 10px (0.625rem) | 700 Bold | 12px (1.2) | +0.1em | Uppercase section labels, Scada status |

---

## 6. Spacing & Layout System

All spacing strictly adheres to an 8-point baseline grid with 4-point micro-increments.

- `space-1`: 4px (Micro padding, badge vertical spacing)
- `space-2`: 8px (Inner card gaps, icon-to-label offset)
- `space-3`: 12px (Dense filter bar spacing, button horizontal padding)
- `space-4`: 16px (Standard card padding, component margins)
- `space-5`: 20px (Comfortable card padding, section gap)
- `space-6`: 24px (Grid column gaps, Page header margin)
- `space-8`: 32px (Major dashboard section separators)

---

## 7. Grid & Responsive Breakpoints

AquaTrustAI is optimized across 8 mandatory display viewports:
- `375px` / `390px`: Mobile field inspection (stacked view, collapsible drawers)
- `768px`: Tablet portrait (collapsed sidebar, fluid tables with scroll)
- `1024px`: Tablet landscape / Low-res control console (compact nav)
- `1366px` / `1440px`: Standard plant operator desktop workstation
- `1600px` / `1920px`: Dual-screen Industrial SCADA control room overview

```
Responsive Container Rules:
- Full-bleed SCADA canvas routes (/digital-twin, /simulator): 100vw, no auto centering, overflow managed by viewport canvas.
- Analytical & Record routes (/dashboard, /readings, /compliance, etc.): Fluid with max-w-[1720px] and min-w-0 to prevent horizontal blowout.
```

---

## 8. Application Shell & Navigation Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOP COMMAND BAR (H: 56px) - Facility Scope, Health, DLT Mode, User     │
├──────────┬─────────────────────────────────────────────────────────────┤
│ SIDEBAR  │ MAIN WORKSPACE VIEWPORT (Fluid min-w-0 overflow-y-auto)     │
│ (W: 64/  │ ┌─────────────────────────────────────────────────────────┐ │
│   240px) │ │ PAGE BREADCRUMB & METRIC HEADER                         │ │
│          │ ├─────────────────────────────────────────────────────────┤ │
│ Groups:  │ │ DENSE TECHNICAL FILTER / CONTROLS RAIL                  │ │
│ 1. SCADA │ ├─────────────────────────────────────────────────────────┤ │
│ 2. AI/QC │ │ KPI OVERVIEW CARDS (4 - 5 COLUMNS)                      │ │
│ 3. DLT   │ ├─────────────────────────────────────────────────────────┤ │
│ 4. AUDIT │ │ INTERACTIVE WORKSPACE (Tables, Charts, SCADA, Drawers)  │ │
│ 5. ADMIN │ └─────────────────────────────────────────────────────────┘ │
└──────────┴─────────────────────────────────────────────────────────────┘
```

---

## 9. Sidebar Design & Behaviour

- **Width:** `240px` (Expanded) / `64px` (Collapsed).
- **Background:** `#0B0F17` with `#1F293D` right border.
- **Categorized Sections:**
  1. **MONITORING & PROCESS:** Dashboard, Facilities, Digital Twin SCADA, Telemetry Observations.
  2. **QUALITY & AI ENGINE:** Pre-AI Validation, AI Anomalies, CPCB Compliance.
  3. **RECORDS & TRUST:** Treatment Records, Finalization, Certificates, Cryptographic Verification, Corrections & Lineage.
  4. **INFRASTRUCTURE & DLT:** Blockchain & DLT Ledger, Merkle Batch Proofs, Forensic Audit Trail, SCADA Simulator, System Status.
  5. **ADMINISTRATION:** (Conditional for `admin` role) User Registration, Facility Creation.
- **States:**
  - Active: Background `bg-cyan-500/15`, text `text-cyan-400`, border-l-2 `border-cyan-400`.
  - Hover: Background `bg-slate-800/60`, text `text-slate-100`.
  - Inactive: Text `text-slate-400`.

---

## 10. Header & Top Navigation (Command Bar)

- **Height:** 56px, fixed z-index 30, background `#0B0F17/95` with backdrop blur (8px).
- **Brand Cluster:** Animated droplet icon in `#0284C7` pill, version badge `v0.1.0`.
- **Facility Scope Selector:** Prominent dark select menu with monospace facility ID preview and real-time plant switching.
- **Telemetry Indicators:**
  - `API: OK` / `API: DEGRADED` badge with pulsing heartbeat indicator.
  - `FABRIC (Live DLT)` in emerald OR `SIMULATION (Local Mock)` in amber with tooltip.
- **User Identity & Role:** User display name, role chip (`OPERATOR`, `AUDITOR`, `REGULATOR`, `SYS_ADMIN`), and secure session revoke button.

---

## 11. Dashboard Design Principles

- **No Artificial Fillers:** Every chart, counter, and list item is bound to genuine REST query data (`/facilities`, `/anomaly-metrics`, `/compliance-summary`, `/validation-stats`, `/treatment-records`, `/dlt-status`).
- **Telemetry Hierarchy:**
  1. Top KPI Row: 4 key metrics with comparative status, trend indication, and backend endpoint provenance.
  2. Quick Regulatory & AI Health Alert banner.
  3. Real-Time Physical Parameters summary grid.
  4. Recent Ingested Records & Provenance Anchor stream.
  5. Fast Jump SCADA actions (Launch Twin, Run Validation, Finalize Window).

---

## 12. Cards & Metric Components

- **Container:** `bg-[#111827] border border-[#1F293D] rounded-xl p-5 shadow-lg shadow-black/40 hover:border-slate-700 transition-all duration-200`.
- **Top Accent Line:** 2px subtle top border reflecting semantic context (e.g. emerald for clean valid telemetry, amber for suspect, crimson for anomaly).
- **Typography:**
  - Header: `text-[11px] font-mono uppercase tracking-wider text-slate-400`.
  - Value: `text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight tabular-nums`.
  - Subtitle / Provenance: `text-[10px] text-slate-500 font-mono mt-1 flex items-center justify-between`.

---

## 13. Tables & Data Grids

- **Container:** `bg-[#111827] border border-[#1F293D] rounded-xl overflow-hidden`.
- **Header:** Sticky `bg-[#161F30] border-b border-[#1F293D] text-[10px] font-mono uppercase tracking-wider text-slate-300 py-3 px-4 text-left`.
- **Row Hover:** `hover:bg-slate-800/40 transition-colors border-b border-[#1F293D]/60`.
- **Cells:** `py-3 px-4 text-xs font-mono text-slate-300 align-middle`.
- **Actions Column:** Right-aligned quick action buttons with tooltips.
- **Pagination Footer:** Integrated footer with total records indicator, rows-per-page, and accessible Prev/Next controls with disable states.

---

## 14. Forms & Input Components

- **Text Inputs & Selects:**
  - `bg-[#0B0F17] border border-[#1F293D] rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all`.
- **Labels:** `text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5 flex items-center justify-between`.
- **Helper / Error Text:** `text-[11px] font-mono text-slate-400 mt-1` / `text-rose-400 font-mono text-[11px] mt-1`.
- **JSON / Code Blocks:** `bg-[#070B12] border border-[#1F293D] rounded-lg p-3 text-xs font-mono text-cyan-300 focus:border-cyan-500`.

---

## 15. Buttons & Interactive States

| Variant | Normal State | Hover State | Active / Focus | Disabled State |
| :--- | :--- | :--- | :--- | :--- |
| **Primary** | `bg-cyan-600 text-white` | `bg-cyan-500 shadow-md shadow-cyan-900/40` | `ring-2 ring-cyan-400` | `opacity-50 cursor-not-allowed` |
| **Secondary** | `bg-[#1E293B] border border-[#334155] text-slate-200` | `bg-slate-700 text-white` | `ring-1 ring-slate-400` | `opacity-50 cursor-not-allowed` |
| **Danger** | `bg-rose-950/80 border border-rose-800 text-rose-300` | `bg-rose-900 text-white` | `ring-2 ring-rose-500` | `opacity-50 cursor-not-allowed` |
| **Ghost / Icon**| `text-slate-400 hover:text-white` | `bg-slate-800/60 text-slate-200` | `bg-slate-800` | `opacity-40` |

---

## 16. Modals, Drawers & Popovers

- **Overlay:** `fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-fade-in`.
- **Drawer Placement:** Slide-over from right (`w-full max-w-xl bg-[#111827] border-l border-[#1F293D] h-full shadow-2xl z-50 flex flex-col`).
- **Modal Dialogue:** Centered, `max-w-2xl bg-[#111827] border border-[#334155] rounded-2xl p-6 shadow-2xl shadow-black`.
- **Escape Key & Backdrop Click:** Standardized dismissal on all modals and slide drawers.

---

## 17. Charts & Data Visualization

- **Theme Palette for Recharts:**
  - Background grid lines: `#1F293D` (stroke-dasharray: `3 3`)
  - Axis labels: `#64748B` with `font-family: monospace`, `font-size: 10px`
  - Tooltip: `bg-[#0B0F17] border border-[#334155] text-xs font-mono text-slate-200 rounded-lg p-2.5 shadow-xl`
  - Primary BOD Trend: `#38BDF8` (Stroke width: 2)
  - Primary COD Trend: `#818CF8` (Stroke width: 2)
  - TSS Trend: `#34D399` (Stroke width: 2)
  - DO Trend: `#F472B6` (Stroke width: 2)
  - pH Trend: `#FBBF24` (Stroke width: 2)
  - CPCB Regulatory Upper Limit: `#EF4444` (Dashed stroke: `4 4`, stroke-width: 1.5)

---

## 18. Industrial SCADA Visual Language

SCADA visual language provides immediate situational awareness for plant operators:
- **Piping Streams:** Distinct colors with directional flow dashes:
  - Raw Influent / Effluent: `#0EA5E9` (Cyan)
  - Recycled Activated Sludge (RAS): `#10B981` (Emerald)
  - Waste Activated Sludge (WAS): `#F97316` (Orange)
  - Aeration Header: `#A855F7` (Purple)
  - Disinfection / UV: `#06B6D4` (Teal)
- **Active Equipment:**
  - Aeration Blower: Rotating turbine runner with active RPM indicator and status tag (`BLW-301A/B`).
  - RAS / WAS Pumps: Rotating impeller casing with run/stop status indicator (`PMP-401A`).
  - UV Disinfection Bank: Radiant UV wave emitter animation.
  - Clarifier Scraper Bridge: Slow orbital sweep graphic.
- **Sensor Callout Pins:** Monospace tags (`LIT-101`, `AIT-201`, `AIT-302`, `AIT-401`, `AIT-501`) displaying live measurement with units.

---

## 19. Digital Twin Equipment & Process Visualization

The 5-Stage Sewage Treatment Plant (STP) model represents:
1. **Stage 1 — Raw Influent & Bar Screening:** Grit chamber, influent hydraulic flow (MLD), inlet BOD/COD/TSS/pH.
2. **Stage 2 — Primary Clarification:** Gravity sedimentation basin, settling velocity, sludge hopper level, hydraulic retention time (HRT).
3. **Stage 3 — Biological Aeration Basin (CSTR Activated Sludge):** Kinetic dissolved oxygen (DO mg/L), MLSS, temperature, aeration blowers.
4. **Stage 4 — Secondary Clarification & RAS Recycling:** Secondary settling, RAS recycle stream, WAS purge rate, sludge volume index (SVI).
5. **Stage 5 — Effluent UV Disinfection & Safe Outfall:** UV intensity, final CPCB discharge norms (BOD ≤ 10, COD ≤ 50, TSS ≤ 20, pH 6.5–8.5).

### Controls & Inspection
- Dynamic animation speed toggles: `1x Normal`, `2x Fast`, `0.5x Slow`, `0x Paused`.
- Stage Inspector: Seamless transition between Slide-Over Drawer and Docked Below Canvas.

---

## 20. Status Indicators & Severity Colours

| Status | Color | Background Pill | Semantic Definition |
| :--- | :--- | :--- | :--- |
| `VALID` | `#10B981` | `bg-emerald-950/60 border-emerald-800` | Passes deterministic physical limits & sanity checks |
| `SUSPECT` | `#F59E0B` | `bg-amber-950/60 border-amber-800` | Rate-of-change or instrument drift anomaly |
| `INVALID` | `#EF4444` | `bg-rose-950/60 border-rose-800` | Sensor freeze, unphysical bound violation, corrupted packet |
| `COMPLIANT` | `#10B981` | `bg-emerald-950/60 border-emerald-800` | Within CPCB Gazette 2021 discharge thresholds |
| `NON_COMPLIANT`| `#EF4444` | `bg-rose-950/60 border-rose-800` | Exceeds legal discharge limits |
| `NORMAL` | `#10B981` | `bg-emerald-950/60 border-emerald-800` | Isolation Forest anomaly score within safe cluster |
| `ANOMALOUS` | `#EF4444` | `bg-rose-950/60 border-rose-800` | Multi-dimensional isolation outlier detected |
| `VERIFIED` | `#10B981` | `bg-emerald-950/60 border-emerald-800` | 4-Stage cryptographic proof passed end-to-end |
| `TAMPER_DETECTED`|`#EF4444` | `bg-rose-950/60 border-rose-800` | Cryptographic digest does not match telemetry values |
| `DLT_MISMATCH` | `#EF4444` | `bg-rose-950/60 border-rose-800` | Fabric ledger transaction hash discrepancy |

---

## 21. AI Anomaly Visualization

- **Algorithm:** Isolation Forest multi-dimensional feature space.
- **Truth Invariant:** Scores are displayed strictly as raw decision function scores (e.g. `-0.457` anomalous, `0.123` normal), NEVER misrepresented as calibrated probabilities unless explicitly computed by backend.
- **Feature Attribution:** Sensor readings display feature contributions, physical bounds, and isolation trees depth where available.

---

## 22. Compliance & Regulatory Presentation

- **Normative Reference:** CPCB Gazette Standards (2021 Schedule VI).
- **Presentation Rule:** Incomplete or unfinalized time windows must NEVER display as compliant; they must be explicitly labeled `PENDING EVALUATION` or `INSUFFICIENT DATA`.
- **Threshold Visuals:** Progress bars and gauge bands clearly demarcate legal limits with red ceiling markers.

---

## 23. Blockchain & Provenance Visualization

- **Fabric vs Simulation Delineation:**
  - When backend returns `distributed_ledger: false` or `mode: "SIMULATION"`, the UI displays a clear amber `SIMULATION (Local Mock)` pill.
  - When backend returns `distributed_ledger: true` and `mode: "FABRIC"`, the UI displays an emerald `FABRIC (Live DLT)` pill with network endpoints.
- **Cryptographic Hash Presentation:** Full 64-char SHA-256 strings in monospace with one-click copy and Merkle leaf verification proofs.

---

## 24. Notifications & Alerts

- **SCADA Alarms:** Dedicated Alarm Console with critical sound/visual flash states, parameter severity, trigger timestamps, and operator acknowledgment workflows.
- **System Toasts:** Positioned top-right, dark surface with semantic left border (`#10B981`, `#F59E0B`, `#EF4444`), auto-dismiss in 4 seconds.

---

## 25. Empty, Loading, Error, and Offline States

- **Loading State:** Centered pulsing circular spinner with monospace descriptive status (`Aggregating pre-AI validation metrics...`).
- **Empty State:** Minimalist industrial container with recessed icon, title, description, and primary CTA.
- **Error State:** High-contrast alert card displaying HTTP Status, error code, human message, and Correlation Request ID for audit tracing.
- **Backend Support Required State:** Explicit informative banner when an endpoint feature is not yet exposed by the backend specification, preserving data honesty.

---

## 26. Tooltips & Contextual Help

- **Behavior:** Hover delay 150ms, dark container (`bg-[#0B0F17] border border-[#334155] text-slate-200 text-xs px-2.5 py-1.5 rounded-md shadow-xl z-50`).
- **Standard Tooltips:** Provided for all icon-only buttons, SCADA equipment tags, and abbreviated hash strings.

---

## 27. Responsive Behaviour

- **Fluid Grid Rules:** Cards reflow from 4 cols (Desktop) -> 2 cols (Tablet) -> 1 col (Mobile).
- **Tables:** Horizontal scrolling container with sticky first column where applicable.
- **SCADA Synoptic Flow:** Responsive SVG viewBox scaling with touch-friendly stage selectors and accessible scroll indicators.

---

## 28. Accessibility Requirements (WCAG 2.1 AA)

- All text meets minimum 4.5:1 contrast against `#0B0F17` / `#111827`.
- All buttons and links have visible focus rings (`ring-2 ring-cyan-400`).
- Interactive elements possess accessible `aria-label` or `title` attributes.
- Keyboard navigation supported across all tables, tabs, modals, and drawers.

---

## 29. Animation & Micro-Interaction Guidelines

- **Transitions:** `150ms cubic-bezier(0.4, 0, 0.2, 1)` for hovers, `250ms` for drawer slide-overs.
- **Pipe Flow:** CSS keyframe dashoffset animation synchronized with simulation speed multipliers.
- **Pulses:** High-priority alarms pulse at `1.5s` intervals without causing layout shifts.
- **Landing & Gateway Motion Dynamics:**
  - *Entrance Stagger:* Staggered cubic-bezier slide-in entrances (`anim-slide-top`, `anim-slide-left`, `anim-slide-right`) at 0ms, 100ms, 180ms, 200ms, 260ms, and 340ms offsets.
  - *Ambient Hydrodynamic Waves:* Dual-phase sinusoidal SVG wave paths (`anim-wave-1` at 18s and `anim-wave-2` at 24s) rendering continuous water flow dynamics.
  - *Biological Aeration Bubbles:* Micro-aeration bubble particles (`anim-bubble-1`, `anim-bubble-2`, `anim-bubble-3`) simulating dissolved oxygen kinetic activity.
  - *Synoptic Pipeline Ticker:* Real-time 4-stage treatment flow pipeline (`Influent` → `Aeration CSTR` → `Effluent CPCB` → `Blockchain Ledger`) visualizing end-to-end wastewater telemetry to cryptographic proof.
  - *SCADA Gateway Perimeter Glow:* Subtle breathing boundary glow (`anim-border-glow`) on the authentication terminal.

---

## 30. Design Consistency & Implementation Rules

1. Every screen must consume standard design tokens and reusable components.
2. Do not introduce arbitrary inline hex colors that deviate from this specification.
3. Preserve all existing API client calls, endpoints, parameters, and authentication contracts.
4. Ensure all 35 existing unit tests continue to pass 100%.

---

## Screen Inventory & Implementation Checklist

| # | Route Path | Screen Name | Key Components & Data Sources | Target Transformation Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | `/login` | Public Authentication | `LoginPage` — Role selectors, live health, hero branding | Redesigned (Dark Industrial) |
| 2 | `/dashboard` | Operational Intelligence | `DashboardPage` — 4 KPIs, compliance, validation, DLT | Redesigned (Dark SCADA) |
| 3 | `/facilities` | Facility Fleet | `FacilitiesPage` — Plant grid, MLD capacity, status | Redesigned (Dark SCADA) |
| 4 | `/facilities/:facilityId` | Facility Detail | `FacilityDetailPage` — Sensor telemetry, metadata | Redesigned (Dark SCADA) |
| 5 | `/admin/facilities/new` | Facility Registration | `FacilityCreatePage` — Plant provisioning form | Redesigned (Dark SCADA) |
| 6 | `/digital-twin` | SCADA Digital Twin | `DigitalTwinPage` — 5-stage STP, live stream, alarms | Redesigned (Dark SCADA) |
| 7 | `/facilities/:id/twin` | Plant Digital Twin | `DigitalTwinPage` — Facility-specific twin session | Redesigned (Dark SCADA) |
| 8 | `/readings` | Telemetry Workspace | `TelemetryPage` — Observation table, filter rail | Redesigned (Dark SCADA) |
| 9 | `/readings/:readingId` | Telemetry Detail | `ReadingDetailPage` — 3-layer validation & inference | Redesigned (Dark SCADA) |
| 10 | `/validation` | Pre-AI Validation | `ValidationPage` — Data quality charts, suspect flags | Redesigned (Dark SCADA) |
| 11 | `/anomalies` | AI Anomaly Detection | `AnomaliesPage` — Isolation forest metrics, chart | Redesigned (Dark SCADA) |
| 12 | `/anomalies/:readingId`| Anomaly Reading Detail | `ReadingDetailPage` — Outlier isolation analysis | Redesigned (Dark SCADA) |
| 13 | `/compliance` | CPCB Standards | `CompliancePage` — Gazette limits, rule evaluator | Redesigned (Dark SCADA) |
| 14 | `/treatment-records` | Immutable Records | `TreatmentRecordsPage` — Time windows, hashes | Redesigned (Dark SCADA) |
| 15 | `/treatment-records/:id` | Record Detail | `TreatmentRecordDetailPage` — Cryptographic profile | Redesigned (Dark SCADA) |
| 16 | `/finalization` | Window Finalization | `FinalizationPage` — Server signing & anchoring | Redesigned (Dark SCADA) |
| 17 | `/certificates` | Digital Certificates | `CertificatesPage` — CPCB compliance certificates | Redesigned (Dark SCADA) |
| 18 | `/certificates/:id` | Certificate Detail | `CertificateDetailPage` — Verified certificate view | Redesigned (Dark SCADA) |
| 19 | `/verification` | Cryptographic Trust | `VerificationPage` — 4-Stage audit verification | Redesigned (Dark SCADA) |
| 20 | `/verify/:recordId` | Public Verification | `PublicVerificationPage` — Unauthenticated audit | Redesigned (Dark SCADA) |
| 21 | `/public/verify/...` | Public Cert Audit | `PublicVerificationPage` — Certificate proof | Redesigned (Dark SCADA) |
| 22 | `/corrections` | Lineage & Provenance | `CorrectionsPage` — Immutable chain lookup | Redesigned (Dark SCADA) |
| 23 | `/corrections/:recordId`| Correction Chain | `CorrectionChainPage` — Version tree, proposals | Redesigned (Dark SCADA) |
| 24 | `/blockchain` | DLT Ledger Explorer | `BlockchainPage` — Hyperledger Fabric anchors | Redesigned (Dark SCADA) |
| 25 | `/blockchain/transactions/:id` | Transaction Detail | `TransactionDetailPage` — Immutable ledger block | Redesigned (Dark SCADA) |
| 26 | `/blockchain/merkle` | Merkle Tree Batches | `MerkleBatchPage` — RFC 6962 batch commitments | Redesigned (Dark SCADA) |
| 27 | `/audit` | Forensic Audit Log | `AuditPage` — Actor timeline, tamper-proof logs | Redesigned (Dark SCADA) |
| 28 | `/simulator` | SCADA Simulator | `SimulatorPage` — Telemetry stream, edge gateway | Redesigned (Dark SCADA) |
| 29 | `/system-status` | System Infrastructure | `SystemStatusPage` — FastAPI, Postgres, Fabric health | Redesigned (Dark SCADA) |
| 30 | `/admin` | System Admin Alias | `SystemStatusPage` — Admin console | Redesigned (Dark SCADA) |
| 31 | `/admin/users/new` | User Registration | `UserRegistrationPage` — RBAC user provisioning | Redesigned (Dark SCADA) |
| 32 | `*` (Shell 404) | Operational Route 404 | `NotFoundState` — Technical 404 resolution | Redesigned (Dark SCADA) |
