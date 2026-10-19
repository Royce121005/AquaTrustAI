# AquaTrustAI Digital Twin — Root-Cause Audit and Engineering Verdict

**Author:** Senior Frontend Architect & Digital Twin Systems Auditor  
**Date:** October 18, 2026  
**Target System:** AquaTrustAI Wastewater Treatment Plant (STP) Digital Twin & Real-Time SCADA Control Room  
**Branch / Commit:** `royce` / `a2370da`  
**Document Status:** Authoritative Architectural Audit & Forensic Verdict  
**Target Path:** `docs/backend/DIGITAL_TWIN_UI_ROOT_CAUSE_VERDICT.md`

---

## 1. Executive Verdict: Demonstration vs. Production Readiness

### Verdict: NOT PRODUCTION READY (Critical System & UI Deficiencies)
The current AquaTrustAI STP Digital Twin implementation is **incapable of production operation** and fails basic industrial SCADA visualization standards. While the underlying kinetic simulation engine and theoretical state management models exist in code, the runtime delivery pipeline is **completely broken** at both the transport and visualization layers.

```
+----------------------------------------------------------------------------------------------------+
|                                    CURRENT RUNTIME REALITY                                         |
|                                                                                                    |
|  [ Simulator / Readings DB ]                                                                       |
|               |                                                                                    |
|               v                                                                                    |
|  [ SQLite twin_states Table ]  ---> CRITICAL ROW 13954 (state_id = float('inf'))                  |
|               |                                                                                    |
|      +--------+----------------------------+                                                       |
|      |                                     |                                                       |
|      v                                     v                                                       |
|  [ REST API GET /twin ]              [ WebSocket Stream /twin/stream ]                             |
|      |                                     |                                                       |
|   HTTP 500 CRASH                     HTTP 404 / 403 LOCKOUT                                        |
|   AttributeError: 'float'            1. Uvicorn lacks websockets/wsproto library                   |
|   has no attribute 'replace'         2. Operator scoped to 'FAC-CPCB-001' != '085a9719...'         |
|      |                                     |                                                       |
|      +----------------+--------------------+                                                       |
|                       |                                                                            |
|                       v                                                                            |
|          [ Frontend React State: null ]                                                            |
|                       |                                                                            |
|       +---------------+-----------------------+                                                    |
|       |                                       |                                                    |
|       v                                       v                                                    |
|  [ Flat 2D SVG Diagrams ]             [ Static Fallback Hardcoding ]                               |
|  - Zero isometric depth               - All stages show 3.8 mg/L BOD                               |
|  - Flat rectangular boxes             - Trend line is static SVG cubic bezier                      |
|  - Missing hydraulic volumes          - Events manufactured locally in JS                          |
+----------------------------------------------------------------------------------------------------+
```

### Key Failure Summary:
1. **Total Real-Time Telemetry Blackout (P0):** The backend REST endpoint `GET /facilities/{id}/twin` crashes with **HTTP 500 (`AttributeError: 'float' object has no attribute 'replace'`)** due to database corruption at row 13954. Concurrently, the WebSocket stream fails with **HTTP 404** because Uvicorn is running without WebSocket protocol handlers (`websockets`/`wsproto`).
2. **Operator Access Lockout (P0):** The `operator` demo account is assigned `facility_id: "FAC-CPCB-001"`, which immediately triggers **HTTP 403 Forbidden** against the seeded Lucknow facility (`085a9719-c9d0-4562-b4d7-bc389dec12b3`).
3. **Hardcoded Fallbacks & Identical Metrics (P1):** Because live state is null, the frontend falls back to static default constants (`3.8 mg/L BOD`, `21.7 mg/L BOD`, `2,580 mg/L MLSS`). Clicking across stages displays identical dummy values.
4. **Fictitious Trend Visualizations (P1):** The 24-hour stage inspection sparkline is an inline, hardcoded SVG `<path d="M 0 35 Q 35 27, 65 33 T 130 29..."/>` completely detached from actual historical data.
5. **Absence of 3D Industrial Equipment (P2):** The process canvas uses flat 2D SVG shapes with rudimentary CSS linear gradients rather than high-fidelity 2.5D/3D isometric vessels with wall thickness, elliptical curvature, concrete coping, mechanical drives, and fluid depth.

---

## 2. Actual State of the Application

### 2.1 Repository & Environment Diagnostics
- **Git Branch:** `royce`
- **Git HEAD Commit:** `a2370da` (`fix: resolve test regressions in digital twin and dlt gateway suites`)
- **Working Tree:** Contains unstaged modifications in `backend/app/digital_twin/engine_manager.py` and `frontend/src/pages/DigitalTwinPage.tsx`.
- **Backend Stack:** Python 3.13.0, FastAPI 0.115.8, SQLAlchemy 2.0.38, SQLite (`aquatrust_dev.db`), Pydantic v2.
- **Frontend Stack:** React 18.3.1, Vite 6.1.0, TailwindCSS 3.4.17, Recharts 2.15.1, Lucide React 0.475.0.
- **3D / Animation Libraries:** **NONE INSTALLED.** Zero WebGL/Three.js dependencies. All current motion is driven by pure SVG stroke-dashoffset and CSS `@keyframes` in `frontend/src/components/digitalTwin/animations.css`.

### 2.2 Live Running Services Status
- **Backend Service:** Running on `http://localhost:8000` via Uvicorn.
  - Log verification: Running single-process standard Uvicorn without `websockets` package. Emits `WARNING: No supported WebSocket library detected`.
- **Frontend Dev Server:** Running on `http://localhost:5174` via Vite.
  - Compiles cleanly, Hot Module Replacement (HMR) active.

---

## 3. Layout & Clipping Root-Cause Diagnosis

### 3.1 Viewport Analysis & Constraints
- **Master SVG Coordinates:** Defined in `frontend/src/components/digitalTwin/SynopticProcessFlow.tsx` as `viewBox="0 0 1200 440"`.
- **Horizontal Aspect Ratio:** 1200:440 (2.727:1).
- **Observed Viewport Clipping Modes:**
  1. **Narrow Viewports (< 1440px):** When the `IntegratedStageInspector` is docked in default side-drawer mode (`w-screen max-w-md sm:max-w-lg`, 512px wide), it covers **42.6% of a 1200px viewport**, obscuring the Biological Aeration Basin and Secondary Clarifier.
  2. **Fixed Bottom Grid Overflow:** In `frontend/src/pages/DigitalTwinPage.tsx#L577`, the layout defines:
     ```tsx
     <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 w-full min-w-0 items-stretch">
       <div className="xl:col-span-8 min-w-0"><KeyPlantParameters .../></div>
       <div className="xl:col-span-4 min-w-0 flex flex-col"><LiveEventsConsole .../></div>
     </div>
     ```
     At viewports between 1024px and 1279px, this stacks vertically, pushing the `LiveEventsConsole` below the fold and requiring extensive vertical scrolling (page height exceeds 1650px).
  3. **Canvas Auto-Shrinking Failure:** If the container width is forced smaller than 960px, the SVG text labels (`text-[10px]` and `text-[9px]`) scale proportionally down to 5-6px physical height, becoming unreadable on standard displays.

---

## 4. 3D Appearance and Equipment Fidelity Audit

The reference visual mandates a **realistic industrial digital twin** with technical depth, metallic concrete textures, cylindrical shading, and physical water volumes. The existing implementation fails across all five stages:

| Stage | Reference Specification | Existing Implementation | Architectural Defect |
|---|---|---|---|
| **1. Raw Influent & Screening** | Parshall flume channel, angled mechanical bar screen racks, hydraulic headloss step, turbid wastewater depth | Flat blue box (`#1e293b`), 3 static angled lines, single linear gradient | Lacks concrete flume sidewalls, hydraulic drop, and realistic wastewater turbidity |
| **2. Primary Clarifier** | Circular radial-flow sedimentation basin, rotating scraper half-bridge with drive head, conical sludge hopper, V-notch peripheral effluent weir | Ellipse with flat polygon hopper (`points="35,50 95,110 155,50"`), horizontal line scraper | Zero cylindrical curvature shading, zero rim coping depth, flat 2D lines |
| **3. Aeration Basin** | Volumetric concrete tank, surface mechanical aerators / fine bubble diffused aeration grid, churning foam mixed liquor, hydraulic baffles | Rectangular box with CSS `feGaussianBlur` amber glow filter, 4 rotating line diffusers | Flat 2D plane; bubbles drift straight up without turbulent convection cells |
| **4. Secondary Clarifier** | Deep circular clarifier, center feed well, quiescent settling zone, peripheral effluent launder, bottom RAS suction manifold | Identical flat ellipse geometry to Primary Clarifier | No visible biomass blanket separation, no center feed well cylinder |
| **5. UV Disinfection** | Submerged concrete serpentine channels, horizontal UV lamp modules with quartz sleeves, violet radiation glow, weir outfall | 4 purple rectangular rounded strips with CSS pulse | Lacks channel structure, lamp rack banks, and hydraulic weir overflow |

---

## 5. Telemetry & Data Lineage Audit

```
+----------------------------------------------------------------------------------------------------+
|                                    DATA LINEAGE TRACE & BREAKS                                     |
|                                                                                                    |
| 1. SIMULATOR GENERATION:                                                                           |
|    backend/app/simulator/engine.py: step() generates synthetic basin telemetry                     |
|    STATUS: OPERATIONAL                                                                             |
|                                                                                                    |
| 2. OBSERVATION INGESTION:                                                                          |
|    backend/app/digital_twin/engine_manager.py: reading_repo.create() -> Reading row persisted      |
|    STATUS: OPERATIONAL                                                                             |
|                                                                                                    |
| 3. TWIN STATE PERSISTENCE:                                                                         |
|    backend/app/digital_twin/state_updater.py: apply_observation() -> TwinState row saved           |
|    STATUS: FATAL CORRUPTION at Row 13954: state_id stored as float('inf')                          |
|                                                                                                    |
| 4. DATABASE RETRIEVAL:                                                                             |
|    backend/app/digital_twin/repository.py: get_latest_state() -> query.first()                     |
|    CRASH: sqlalchemy/sql/sqltypes.py: value = _python_UUID(value)                                  |
|           uuid.py: hex = hex.replace('urn:', '') -> AttributeError: 'float' has no 'replace'       |
|                                                                                                    |
| 5. REST & WEBSOCKET DELIVERY:                                                                      |
|    GET /facilities/{id}/twin -> HTTP 500                                                           |
|    WS /facilities/{id}/twin/stream -> HTTP 404 (No websockets library installed in Uvicorn)        |
|    Operator access -> HTTP 403 (Cross-facility scope mismatch: FAC-CPCB-001)                       |
|                                                                                                    |
| 6. FRONTEND STATE BINDING:                                                                         |
|    frontend/src/hooks/useTwinStream.ts: twinState is NULL                                          |
|    frontend/src/components/digitalTwin/scada/*.tsx: falls back to hardcoded 3.8 mg/L               |
+----------------------------------------------------------------------------------------------------+
```

### Empirical Database Audit Evidence
A direct SQL inspection of `backend/aquatrust_dev.db` revealed:
- Total rows in `twin_states`: **13,954**
- Row 13953: `state_id = '453bbfb6-d99d-4b37-abba-e557af683f08'` (Valid UUID text)
- **Row 13954 (Latest):**
  - `state_id`: `inf` (Type: `real` / `float`)
  - `state_version`: `13954`
  - `observed_at`: `2026-10-18 06:42:13.110004`
  - `last_processed_reading_id`: `'53583954ac164b4e905dcb626440db01'`

Because SQLite is dynamically typed and does not strictly enforce column types, the float `inf` was committed to disk. When SQLAlchemy deserializes the row using `UUID(as_uuid=True)`, Python's `uuid.UUID` parser crashes on `hex.replace(...)`.

---

## 6. Graph & Trend Visualizations Audit

### 6.1 Hardcoded Static SVG Paths in Inspector
In `frontend/src/components/digitalTwin/IntegratedStageInspector.tsx#L431-L442` and `#L523-L533`, the 24-hour trend sparkline and detail graphs are completely fabricated:
```tsx
// Lines 431-442 in IntegratedStageInspector.tsx
<path
  d="M 0 35 Q 35 27, 65 33 T 130 29 T 195 34 T 250 28 L 250 65 L 0 65 Z"
  fill="rgba(56, 189, 248, 0.12)"
/>
<path
  d="M 0 35 Q 35 27, 65 33 T 130 29 T 195 34 T 250 28"
  fill="none"
  stroke="#38bdf8"
  strokeWidth="1.8"
/>
```
- **Finding:** The bezier control points (`Q 35 27...`) are hardcoded string literals. Regardless of whether the stage is Inlet, Clarifier, Aeration, or Effluent, and regardless of real telemetry values, the graph geometry **never changes**.
- **Root Cause:** The component lacks an in-memory rolling buffer or integration with `GET /facilities/{id}/twin/history`.

### 6.2 Hardcoded Fallback Values in Stage Components
In `AerationBasinStage.tsx#L25-L38` and `KeyPlantParameters.tsx#L76-L84`:
```tsx
// AerationBasinStage.tsx
const doVal = doMgL !== null && doMgL !== undefined ? doMgL : '2.0';
const mlssVal = mlssMgL !== null && mlssMgL !== undefined ? mlssMgL : '2,580';
const tempVal = tempC !== null && tempC !== undefined ? tempC : '22.4';

// KeyPlantParameters.tsx
influentBod: influentBod ?? 21.7,
tssPrimary: tssPrimary ?? 7.7,
aerationDo: aerationDo ?? 2.0,
mlssAeration: mlssAeration ?? 2580,
effluentBod: effluentBod ?? 3.8,
effluentPh: effluentPh ?? 7.4,
```
- **Finding:** When `twinState` is null, every component displays these identical constants, giving the illusion of a frozen, broken interface.

---

## 7. Simulator & Event Stream Audit

### 7.1 WebSocket Transport Failure
- **Log Evidence:**
  ```text
  WARNING:  Unsupported upgrade request.
  WARNING:  No supported WebSocket library detected. Please use "pip install 'uvicorn[standard]'", or install 'websockets' or 'wsproto' manually.
  INFO:     127.0.0.1:61230 - "GET /api/v1/facilities/.../twin/stream?token=... HTTP/1.1" 404 Not Found
  ```
- **Root Cause:** The virtual environment (`backend/.venv`) installed base `uvicorn` without standard extras. FastAPI routes WebSocket endpoints, but Starlette cannot upgrade HTTP connections without `websockets` or `wsproto`.

### 7.2 Synthetic Frontend Event Manufacturing
In `frontend/src/components/digitalTwin/LiveEventsConsole.tsx#L55-L100`, events displayed in the console are generated inside a `useEffect` using client-side JavaScript templates:
```tsx
newItems.push({
  id: `tel-do-${twinState.state_version}`,
  event: 'Telemetry accepted',
  source: 'AIT-301',
  value: `${Number(doVal).toFixed(1)} mg/L`,
  category: 'telemetry',
});
```
- **Finding:** These are not real audit events from the backend `twin_state_events` table or CPCB anomaly engine. When `twinState` is null, the array is empty, and the UI displays "Awaiting live event stream".

---

## 8. Process Topology & Hydraulic Correctness Audit

```
+---------------------------------------------------------------------------------------------------------+
|                                        PROCESS HYDRAULIC AUDIT                                          |
|                                                                                                         |
|  [ Stage 1: Influent ]                                                                                  |
|         |                                                                                               |
|         +---> Pipe 1 (Main Process Flow, Cyan) -------------------> [ Stage 2: Primary Clarifier ]      |
|                                                                                    |                    |
|         +--------------------------------------------------------------------------+                    |
|         |                                                                                               |
|         v                                                                                               |
|  [ Stage 3: Biological Aeration ] <---+ RAS Recycle Loop (Amber, PMP-401) <---+                         |
|         |                                                                     |                         |
|         +---> Pipe 3 (Mixed Liquor Suspended Solids) -------------------+     |                         |
|                                                                         |     |                         |
|                                                                         v     |                         |
|                                                          [ Stage 4: Secondary Clarifier ]               |
|                                                                         |                               |
|         +---------------------------------------------------------------+                               |
|         |                                                                                               |
|         v                                                                                               |
|  [ Stage 5: UV Disinfection & Reuse ] ---> Outfall Discharge Arrow                                      |
+---------------------------------------------------------------------------------------------------------+
```

### Hydraulic Audit Findings:
1. **Flow Continuity:** The 5-stage topological order conforms to Central Public Health and Environmental Engineering Organisation (CPHEEO) STP standards.
2. **RAS Return Loop:** The RAS piping path correctly routes from Secondary Clarifier underflow back to the inlet zone of the Biological Aeration Basin via `PMP-401`.
3. **Piping Rendering Bug:** In `SynopticProcessFlow.tsx#L418-L430`, the RAS pipe geometry is drawn at `y: 365`, which clips slightly through the lower equipment border on viewports narrower than 1200px.
4. **Missing WAS Loop:** While RAS (Return Activated Sludge) is represented, Waste Activated Sludge (WAS) bleed to sludge digestion/dewatering is absent from the diagram.

---

## 9. Technology Options Evaluation for 3D SCADA Equipment

| Criteria | Option A: Enhanced 2.5D Isometric SVG | Option B: Three.js / React Three Fiber (R3F) |
|---|---|---|
| **Visual Depth & Realism** | High: Isometric axonometric projection (30° angle), multi-stop cylindrical gradients, concrete coping bevels, radial depth shadowing, layered water planes. | Ultra-High: True 3D meshes, directional specular lighting, PBR materials, orbit controls, volumetric particle systems. |
| **Bundle Size Impact** | **0 KB** (Zero new dependencies; uses native browser SVG renderer). | **+650 KB to +1.2 MB** (`three`, `@react-three/fiber`, `@react-three/drei`). |
| **Vitest / JSDOM Compatibility** | **100% Pass** (Standard React DOM nodes, zero test mocking required). | **High Friction** (Requires WebGL canvas polyfills, `HTMLCanvasElement.getContext('webgl')` mocks; breaks headless test suites). |
| **Telemetry Tag Positioning** | Exact SVG coordinate anchoring; tags scale and zoom synchronously with tanks. | Requires `Html` / `CSS2DRenderer` projection matrix updates; prone to jitter and z-buffer clipping. |
| **Hardware / GPU Overhead** | Negligible; runs smoothly at 60 FPS on low-power industrial operator displays. | High GPU consumption; potential context loss crashes on older SCADA touchscreens. |
| **Recommendation** | **RECOMMENDED FOR AQUATRUSTAI SCADA** | Not recommended for core operational view (acceptable as optional 3D digital-twin sandbox). |

---

## 10. Prioritized Root-Cause Matrix

| Severity | Component | Failure Mode | Technical Root Cause | Code Location | Remediation |
|---|---|---|---|---|---|
| **P0** | Database & Persistence | Backend 500 error on state retrieval | Row 13954 has `state_id = inf` (float); SQLAlchemy UUID parser crashes on `hex.replace()` | `backend/aquatrust_dev.db`<br>`backend/app/digital_twin/repository.py#L75` | 1. Clean row 13954 in SQLite.<br>2. Add custom TypeDecorator with UUID coercion and exception handling. |
| **P0** | Real-Time Transport | WebSocket connects fail with 404 | Uvicorn running in `.venv` without `websockets` or `wsproto` package | `backend/task-1649.log`<br>`backend/pyproject.toml` | Install `websockets` in backend environment (`pip install websockets`). |
| **P0** | RBAC Authorization | Operator lockout (403 Forbidden) | `DEMO_USERS["operator"]["facility_id"]` hardcoded to `"FAC-CPCB-001"` instead of seeded UUID | `backend/app/api/v1/auth.py#L47`<br>`backend/app/api/v1/digital_twin.py#L49` | Align demo user facility scope with seeded facility `085a9719-c9d0-4562-b4d7-bc389dec12b3`. |
| **P1** | Trend Visualizations | Static identical graphs across stages | Sparkline and detail trend paths are hardcoded SVG bezier curves | `IntegratedStageInspector.tsx#L431-L442`<br>`#L523-L533` | Bind sparklines to dynamic time-series array from state history or in-memory ring buffer. |
| **P1** | Stage Telemetry | Identical parameters (e.g. 3.8 mg/L) | Hardcoded default fallback constants evaluated when `twinState` is null | `AerationBasinStage.tsx#L25-L38`<br>`KeyPlantParameters.tsx#L76-L84` | Display `"—"` or `"Awaiting Data"` instead of fabricated numbers; ensure backend delivers real state. |
| **P1** | Layout & Inspector | Viewport clipping and canvas squishing | Side-drawer mode obscures 42% of canvas; below-dock mode lacks responsive breakpoints | `DigitalTwinPage.tsx#L551-L574`<br>`SynopticProcessFlow.tsx#L365` | Implement responsive docking drawer with non-obstructive collapsible layout. |
| **P2** | Equipment Fidelity | Flat 2D appearance lacking industrial SCADA realism | Tanks rendered with simple 2D rectangles/ellipses without isometric projection or cylindrical depth | `scada/AerationBasinStage.tsx`<br>`scada/PrimaryClarifierStage.tsx` | Redesign with enhanced 2.5D isometric SVG geometry, wall thickness, concrete coping, and water volumes. |
| **P2** | Event Stream | Artificial client-side events | Events manufactured via client-side string interpolation rather than authoritative DB log | `LiveEventsConsole.tsx#L55-L100` | Stream real audit records from `TwinStateEvent` and `AlarmManager`. |
| **P3** | SCADA Animations | Animations stop or flicker | CSS animation speed toggle tied to fragile `isRunning` boolean with missing fallback | `SynopticProcessFlow.tsx#L67-L72`<br>`animations.css` | Stabilize keyframe animation triggers with GPU-accelerated transforms. |

---

## 11. Engineering Action Plan & Verification Gates

### Phase 1: Core System & Data Integrity (P0 / P1)
1. **Database Repair:** Execute data migration/cleanup on `backend/aquatrust_dev.db` to repair row 13954 `state_id`, and wrap SQLAlchemy UUID loading in `app/models/types.py` with sanitizing type decorator.
2. **WebSocket Infrastructure:** Install `websockets` in `backend/.venv` and verify that Uvicorn accepts `GET /facilities/{id}/twin/stream` upgrades without 404 warnings.
3. **RBAC Scope Alignment:** Update `DEMO_USERS` in `backend/app/api/v1/auth.py` so `operator` has access to the primary seeded facility.
4. **Dynamic Trend Binding:** Replace hardcoded SVG paths in `IntegratedStageInspector.tsx` with dynamic polyline/path generator bound to rolling 60-point telemetry history.
5. **Eliminate Fabricated Numbers:** Remove hardcoded fallback constants (`3.8`, `21.7`, `2,580`) across stage components, substituting explicit industrial status states (`"OFFLINE"`, `"STALE"`, `"AWAITING_STREAM"`).

### Phase 2: Isometric 3D SCADA Visual Redesign (P2)
1. **Isometric Coordinate Grid:** Build standardized 2.5D axonometric base templates for circular clarifiers and rectangular basins.
2. **Cylindrical & Concrete Depth:** Add radial and multi-stop linear gradients simulating concrete exterior walls, top coping thickness, and internal fluid levels.
3. **Equipment Mechanics:** Render structural details:
   - Clarifiers: Center feed well, drive head motor, radial scraper bridge, peripheral effluent V-notch weir launder.
   - Aeration Basin: Surface aerator / fine bubble grid diffusers, hydraulic baffle partition.
   - UV Channel: Concrete contact chamber, modular lamp banks with quartz sleeve violet glow.
4. **Hydraulic Interconnections:** Render 3D-shaded process pipes with directional flow particles, RAS return loop, and PMP-401 pump casing.

### Phase 3: Layout & Responsive Polish (P1 / P3)
1. **Responsive Viewport Fitting:** Constrain SVG viewBox to prevent horizontal overflow; ensure text labels remain legible down to 1024px width.
2. **Flexible Inspector Docking:** Perfect both "Slide Drawer" and "Dock Below" modes so the process canvas is never shrunk or covered when inspecting stages.
3. **End-to-End Test Suite:** Add automated integration tests verifying:
   - Stage parameter divergence (Inlet != Primary != Aeration != Secondary != Effluent).
   - Trend line path geometry changes dynamically as new state versions arrive.
   - Zero console errors or uncaught exceptions during engine start/pause/stop cycles.
