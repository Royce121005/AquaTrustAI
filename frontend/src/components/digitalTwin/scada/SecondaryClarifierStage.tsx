import React from 'react';
import { ScadaFloatingCard, ScadaSensorCalloutPin } from './ScadaPrimitives';

export interface SecondaryClarifierStageProps {
  isSelected: boolean;
  isHovered: boolean;
  status: 'nominal' | 'warning' | 'alarm' | 'stale';
  bod?: number | null;
  cod?: number | null;
  tss?: number | null;
  sviMlG?: number | null;
  rasFlowMld?: number | null;
  onSelect: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isAnimated?: boolean;
}

export const SecondaryClarifierStage: React.FC<SecondaryClarifierStageProps> = ({
  isSelected,
  isHovered,
  status,
  bod,
  cod,
  tss,
  sviMlG = 110,
  rasFlowMld = 0.85,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  isAnimated = true,
}) => {
  const isSviElevated = sviMlG !== null && sviMlG !== undefined && sviMlG > 150;
  const actualStatus = isSviElevated && status === 'nominal' ? 'warning' : status;

  const bodVal = bod !== null && bod !== undefined ? bod : '3.8';
  const sviVal = sviMlG !== null && sviMlG !== undefined ? sviMlG : '110';
  const rasVal = rasFlowMld !== null && rasFlowMld !== undefined ? rasFlowMld : '0.85';

  const strokeColor = isSelected
    ? '#f59e0b'
    : actualStatus === 'alarm'
    ? '#ef4444'
    : actualStatus === 'warning'
    ? '#f59e0b'
    : isHovered
    ? '#38bdf8'
    : '#1e293b';

  return (
    <g
      id="scada-stage-secondary-clarifier"
      transform="translate(735, 20)"
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label="Stage 4: Secondary Clarifier Decanter SC-401"
      className="cursor-pointer outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-200"
    >
      {/* 1. FLOATING TELEMETRY CARD (ENHANCED WIDTH: NO OVERLAP) */}
      <ScadaFloatingCard
        x={0}
        y={0}
        width={214}
        height={96}
        title="4. SECONDARY CLARIFIER"
        status={actualStatus}
        isSelected={isSelected}
        metrics={[
          { label: 'Effluent BOD', value: bodVal, unit: typeof bodVal === 'number' ? 'mg/L' : undefined },
          { label: 'SVI', value: sviVal, unit: typeof sviVal === 'number' ? 'mL/g' : undefined, dotColor: isSviElevated ? '#f59e0b' : '#10b981' },
          { label: 'RAS', value: rasVal, unit: typeof rasVal === 'number' ? 'MLD' : undefined },
        ]}
      />

      {/* 2. SENSOR CALLOUT PIN (AIT-401 SVI) */}
      <ScadaSensorCalloutPin
        x={130}
        y={106}
        pinHeight={42}
        tag="AIT-401"
        name="SVI"
        value={sviVal}
        unit="mL/g"
        status={actualStatus}
        textSide="right"
        color="#38bdf8"
      />

      {/* 3. PHYSICAL PROCESS EQUIPMENT: 3D CIRCULAR CLARIFIER SC-401 */}
      <g transform="translate(0, 145)">
        {/* Selection Amber Glowing Border when Selected */}
        {isSelected && (
          <ellipse
            cx="107"
            cy="70"
            rx="105"
            ry="55"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            opacity="0.95"
            className="selection-amber-glow"
          />
        )}

        {/* Ambient Ground Contact Shadow */}
        <ellipse cx="107" cy="136" rx="100" ry="16" fill="#020617" opacity="0.8" />

        {/* ========================================================= */}
        {/* 3D CYLINDRICAL TANK BODY (METALLIC CONCRETE GRADIENT)     */}
        {/* ========================================================= */}

        {/* Lower Cylindrical Tank Body with 3D Directional Lighting */}
        <path
          d="M 12 56 C 12 98, 202 98, 202 56 L 202 98 C 202 140, 12 140, 12 98 Z"
          fill="url(#gradClarifierBody)"
          stroke="#1e293b"
          strokeWidth="1.2"
        />

        {/* Circumferential Steel Stiffener Reinforcement Ring */}
        <path
          d="M 12 78 C 12 118, 202 118, 202 78"
          fill="none"
          stroke="#334155"
          strokeWidth="2"
          opacity="0.85"
        />
        <path
          d="M 12 78 C 12 118, 202 118, 202 78"
          fill="none"
          stroke="#475569"
          strokeWidth="0.8"
          strokeDasharray="16 4"
          opacity="0.6"
        />

        {/* ========================================================= */}
        {/* TOP CONCRETE / STEEL RIM & PERIPHERAL WEIR TROUGH         */}
        {/* ========================================================= */}

        {/* Outer Coping Rim Ellipse (Top Face Thickness) */}
        <ellipse
          cx="107"
          cy="56"
          rx="95"
          ry="40"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.5"
        />

        {/* Top Rim Bevel Highlight */}
        <ellipse
          cx="107"
          cy="55"
          rx="93"
          ry="38"
          fill="none"
          stroke="#64748b"
          strokeWidth="1"
          opacity="0.85"
        />

        {/* Peripheral V-Notch Overflow Weir Trough */}
        <ellipse
          cx="107"
          cy="56"
          rx="87"
          ry="35"
          fill="#0c1726"
          stroke={strokeColor}
          strokeWidth={isSelected ? 2 : 1.4}
        />

        {/* ========================================================= */}
        {/* CLARIFIED SUPERNATANT WATER SURFACE (CRYSTAL CYAN-BLUE)   */}
        {/* ========================================================= */}

        {/* Lower Clarified Water Depth (Deep Navy Blue, NO BROWN) */}
        <ellipse
          cx="107"
          cy="68"
          rx="77"
          ry="27"
          fill="#082f49"
          opacity="0.85"
        />

        {/* Upper Clarified Supernatant Water Zone (Crystal Clear Cyan-Blue) */}
        <ellipse
          cx="107"
          cy="57"
          rx="83"
          ry="33"
          fill="url(#gradSecondaryClarifierWater)"
          opacity="0.95"
        />

        {/* Calm Water Surface Ripples in Cyan */}
        <g className={isAnimated ? 'scada-ripple' : undefined}>
          <ellipse
            cx="107"
            cy="57"
            rx="56"
            ry="22"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="0.9"
            opacity="0.7"
          />
          <ellipse
            cx="107"
            cy="57"
            rx="34"
            ry="14"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="0.6"
            opacity="0.45"
          />
        </g>

        {/* ========================================================= */}
        {/* CENTRAL DRIVE COLUMN & ROTATING SCRAPER TRUSS BRIDGE      */}
        {/* ========================================================= */}

        {/* 1. Submerged Rotating Sludge Scraper Rake (Strictly bounded to 3D water ellipse) */}
        <g id="sc-submerged-scraper" transform="translate(107, 58)">
          <g transform="scale(1, 0.38)">
            <g>
              {isAnimated && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0"
                  to="360"
                  dur="32s"
                  repeatCount="indefinite"
                />
              )}
              {/* Submerged Scraper Truss Arm */}
              <line x1="-72" y1="0" x2="72" y2="0" stroke="#0c2d48" strokeWidth="3.5" opacity="0.85" />
              <line x1="-72" y1="0" x2="72" y2="0" stroke="#0369a1" strokeWidth="2" opacity="0.9" />
              {/* Submerged Scraper Rake Blades */}
              {[-58, -42, -26, -10, 10, 26, 42, 58].map((bx) => (
                <line key={bx} x1={bx} y1="-4" x2={bx} y2="4" stroke="#38bdf8" strokeWidth="2" opacity="0.85" />
              ))}
              {/* Submerged Center Pivot Hub */}
              <circle cx="0" cy="0" r="5" fill="#0f172a" stroke="#0284c7" strokeWidth="1.2" />
            </g>
          </g>
        </g>

        {/* 2. Stationary Diametral Access Walkway Bridge (Seated stably across top tank coping rim) */}
        <g id="sc-access-walkway" transform="translate(107, 56)">
          {/* Shadow of Bridge cast onto water */}
          <line x1="-83" y1="5" x2="83" y2="5" stroke="#040812" strokeWidth="3.5" opacity="0.45" />

          {/* Structural Steel Walkway Girder */}
          <line x1="-85" y1="0" x2="85" y2="0" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
          <line x1="-85" y1="0" x2="85" y2="0" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
          <line x1="-85" y1="0" x2="85" y2="0" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />

          {/* Center Walkway Service Platform around center well */}
          <rect x="-18" y="-6" width="36" height="12" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="1" />

          {/* Bridge Top Safety Handrails */}
          <line x1="-83" y1="-7" x2="83" y2="-7" stroke="#cbd5e1" strokeWidth="1.2" opacity="0.9" />
          <line x1="-83" y1="-3.5" x2="83" y2="-3.5" stroke="#94a3b8" strokeWidth="0.8" opacity="0.7" />

          {/* Handrail Vertical Stanchions */}
          {[-75, -55, -35, -15, 15, 35, 55, 75].map((px) => (
            <line key={px} x1={px} y1="-7" x2={px} y2="0" stroke="#94a3b8" strokeWidth="0.9" />
          ))}

          {/* Center Pivot Hub Ring on Bridge Platform */}
          <circle cx="0" cy="0" r="7" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="3" fill="#38bdf8" />
        </g>

        {/* 3. Center Feed Well Column & Drive Motor */}
        <g id="sc-center-well">
          {/* Drop shadow of center well onto water */}
          <ellipse cx="109" cy="62" rx="16" ry="8" fill="#040914" opacity="0.6" />
          {/* Center Well Cylinder */}
          <rect x="95" y="44" width="24" height="22" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          {/* Motor / Gearbox Top Housing */}
          <ellipse cx="107" cy="44" rx="14" ry="6" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
          <ellipse cx="107" cy="38" rx="10" ry="4.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />

          {/* Rotating Motor Drive Shaft Indicator (In-place rotation on center well) */}
          <g id="sc-drive-indicator" transform="translate(107, 38)">
            <g>
              {isAnimated && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0"
                  to="360"
                  dur="4s"
                  repeatCount="indefinite"
                />
              )}
              <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="0" y1="-2" x2="0" y2="2" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
            </g>
            <circle cx="0" cy="0" r="1.8" fill="#ffffff" />
          </g>
        </g>

        {/* ========================================================= */}
        {/* BOTTOM SLUDGE CONE & WITHDRAWAL PIPE TO FLOOR SPLITTER    */}
        {/* ========================================================= */}
        <g id="sc-bottom-sludge-cone" transform="translate(107, 80)">
          {/* Sludge Collection Hopper Cone */}
          <polygon points="-12,0 12,0 6,18 -6,18" fill="#07223b" stroke="#0284c7" strokeWidth="1" />

          {/* Vertical Sludge Withdrawal Pipe */}
          <rect x="-4" y="16" width="8" height="42" rx="1" fill="#034a70" stroke="#0284c7" strokeWidth="1" />
          <line
            x1="0"
            y1="16"
            x2="0"
            y2="58"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeDasharray="4 3"
            className={isAnimated ? 'pipe-flow-ras' : undefined}
          />
          {/* Top Flange Connection to Tank Cone */}
          <rect x="-7" y="16" width="14" height="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.8" />

          {/* Sludge Flow Isolation Valve Handwheel */}
          <circle cx="8" cy="30" r="4.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
          <line x1="0" y1="30" x2="8" y2="30" stroke="#0369a1" strokeWidth="1.6" />

          {/* Lower Flange Joint at floor transition to Splitter */}
          <rect x="-6" y="52" width="12" height="3" rx="1" fill="#1e293b" stroke="#f59e0b" strokeWidth="0.8" />
        </g>

        {/* ========================================================= */}
        {/* BOTTOM EQUIPMENT LABELS                                   */}
        {/* ========================================================= */}
        <text
          x="107"
          y="156"
          textAnchor="middle"
          fill="#f1f5f9"
          fontSize="9.5"
          fontFamily="sans-serif"
          fontWeight="bold"
          letterSpacing="0.2px"
        >
          Secondary Clarifier
        </text>
        <text
          x="107"
          y="167"
          textAnchor="middle"
          fill="#38bdf8"
          fontSize="8.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          SC-401
        </text>
      </g>
    </g>
  );
};
