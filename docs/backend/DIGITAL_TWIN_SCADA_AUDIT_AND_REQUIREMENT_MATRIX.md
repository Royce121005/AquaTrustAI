# AquaTrustAI Digital Twin & SCADA Telemetry Implementation Matrix
## Repository Audit & Requirement-to-Code Mapping

| Section / Requirement | Status | Existing Location | Implementation / Modification Plan |
| :--- | :--- | :--- | :--- |
| **1. Repository & Baseline Integrity** | **KEEP** | `backend/`, `frontend/`, `alembic/` | Preserve all existing database migrations, models, user accounts, and test suites. |
| **2. Global Operations Header** | **MODIFY** | `frontend/src/pages/DigitalTwinPage.tsx` | Upgrade header with mode badge (`LIVE`, `LIVE SIMULATION`, `HISTORICAL REPLAY`, `SCENARIO`), WebSocket link indicator, Start/Pause/Stop controls, and monotonic state version display. |
| **3. Main Animated STP Process Canvas** | **ADD** | `frontend/src/components/digitalTwin/` | Build high-fidelity industrial SVG SCADA canvas with 5 verified treatment stages (Inlet, Primary Clarifier, Aeration Basin, Secondary Clarifier, Final Effluent), animated fluid flow pipes, bubble diffusion, settling sludge, and RAS recycle loop. |
| **4. Real-Time Telemetry Instrumentation** | **MODIFY** | `frontend/src/pages/DigitalTwinPage.tsx` | Add real-time rolling sparkline trends, engineering units, quality badges, and distinct data-origin pills (Observed vs Simulated vs Projected). |
| **5. Stage Inspection Panel** | **ADD** | `frontend/src/components/digitalTwin/StageInspectionPanel.tsx` | Contextual drawer/card opening upon stage click with parameters, equipment states, CPCB threshold limits, and model kinetics. |
| **6. Live Alarm & Event Console** | **ADD** | `backend/app/digital_twin/alarms.py` & `frontend/src/components/digitalTwin/AlarmConsole.tsx` | Server-side alarm lifecycle engine with deduplication, severity ranking (Critical, Warning, Info), and interactive operator acknowledgement. |
| **7. Real-Time Transport (WebSocket)** | **ADD** | `backend/app/api/v1/digital_twin.py` | Add facility-scoped authenticated WebSocket route `/facilities/{id}/twin/stream` with snapshot delivery, incremental deltas, heartbeat, and reconnection recovery. |
| **8. Authoritative Engine Lifecycle Manager** | **ADD** | `backend/app/digital_twin/engine_manager.py` | Singleton server-side worker managing lifecycle states (`STOPPED`, `STARTING`, `RUNNING`, `PAUSED`, `ERROR`), 1Hz cadence, state version increments, and real-time event broadcasting. |
| **9. Process Model Kinetics Integration** | **KEEP** | `backend/app/digital_twin/process_model.py` | Reuse validated 5-stage Monod/CSTR biological kinetics and mass-balance equations. |
| **10. Simulator & Anomaly Engine Binding** | **MODIFY** | `backend/app/services/simulator_service.py` | Bind simulator steps to digital twin engine so both views share identical synchronized telemetry and anomaly perturbation effects. |
| **11. RBAC & Multi-Tenant Facility Scoping** | **KEEP** | `backend/app/api/v1/digital_twin.py` | Enforce server-side `verify_facility_scope` and JWT authentication on both REST and WebSocket subscriptions. |
| **12. Historical Replay Mode** | **ADD** | `backend/app/digital_twin/service.py` & `frontend` | Replay persisted event log in timestamp sequence without mutating authoritative live state. |
| **13. What-If Scenario Isolation** | **KEEP** | `backend/app/digital_twin/scenario_engine.py` | Ensure scenario runs remain isolated sandboxes without corrupting accepted state or raising live plant alarms. |
| **14. Testing Suite (Backend & Frontend)** | **ADD** | `backend/tests/test_twin_realtime_scada.py` & `frontend/src/test/scada.test.tsx` | Add comprehensive unit and integration tests verifying engine lifecycle, WebSocket contracts, alarm deduplication, and non-mutation guarantees. |
