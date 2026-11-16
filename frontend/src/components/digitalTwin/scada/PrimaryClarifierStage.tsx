import React from 'react';
import { ScadaFloatingCard, ScadaSensorCalloutPin } from './ScadaPrimitives';

export interface PrimaryClarifierStageProps {
  isSelected: boolean;
  isHovered: boolean;
  status: 'nominal' | 'warning' | 'alarm' | 'stale';
  tss?: number | null;
  bod?: number | null;
  sludgeFlowMld?: number | null;
  removalEffPercent?: number | null;
  onSelect: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isAnimated?: boolean;
}

export const PrimaryClarifierStage: React.FC<PrimaryClarifierStageProps> = ({
  isSelected,
  isHovered,
  status,
  tss,
  bod,
  sludgeFlowMld = 0.85,
  removalEffPercent = 60.0,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  isAnimated = true,
}) => {
  const tssVal = tss !== null && tss !== undefined ? tss : '7.7';
  const removalVal = removalEffPercent !== null && removalEffPercent !== undefined ? `${removalEffPercent}%` : '60%';
  const sludgeVal = sludgeFlowMld !== null && sludgeFlowMld !== undefined ? sludgeFlowMld : '0.85';

  const strokeColor = isSelected
    ? '#f59e0b'
    : status === 'alarm'
    ? '#ef4444'
    : status === 'warning'
    ? '#f59e0b'
    : isHovered
    ? '#38bdf8'
    : '#1e293b';

  return (
    <g
      id="scada-stage-primary-clarifier"
      transform="translate(250, 20)"
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
      aria-label="Stage 2: Primary Clarifier Sedimentation Tank PC-201"
      className="cursor-pointer outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-200"
    >
      {/* 1. FLOATING TELEMETRY CARD (ENHANCED WIDTH: NO OVERLAP) */}
      <ScadaFloatingCard
        x={0}
        y={0}
        width={214}
        height={96}
        title="2. PRIMARY CLARIFIER"
        status={status}
        isSelected={isSelected}
        metrics={[
          { label: 'TSS', value: tssVal, unit: typeof tssVal === 'number' ? 'mg/L' : undefined },
          { label: 'Removal', value: removalVal },
          { label: 'Sludge', value: sludgeVal, unit: typeof sludgeVal === 'number' ? 'MLD' : undefined },
        ]}
      />

      {/* 2. SENSOR CALLOUT PIN (AIT-201 TSS) */}
      <ScadaSensorCalloutPin
        x={130}
        y={106}
        pinHeight={42}
        tag="AIT-201"
        name="TSS"
        value={tssVal}
        unit="mg/L"
        status={status}
        textSide="right"
        color="#38bdf8"
      />

      {/* 3. PHYSICAL PROCESS EQUIPMENT: 3D CIRCULAR CLARIFIER PC-201 */}
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
        {/* 3D CYLINDRICAL TANK BODY (LOWER SHELL WITH GRADIENT)      */}
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

        {/* Peripheral V-Notch Weir Channel Trough */}
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
        {/* SUNKEN WATER SURFACE & EARTHY BROWN PRIMARY SLUDGE        */}
        {/* ========================================================= */}

        {/* Lower Settled Organic Sludge Blanket Layer (Dense Earthy Brown) */}
        <ellipse
          cx="107"
          cy="66"
          rx="77"
          ry="27"
          fill="#3b1d08"
          opacity="0.9"
        />

        {/* Inner Water Surface Ellipse with Primary Clarifier Brown Gradient */}
        <ellipse
          cx="107"
          cy="57"
          rx="83"
          ry="33"
          fill="url(#gradPrimaryClarifierWater)"
          opacity="0.95"
        />

        {/* Concentric Subtle Radial Water Ripple Highlights in Warm Amber/Brown */}
        <g className={isAnimated ? 'scada-ripple' : undefined}>
          <ellipse
            cx="107"
            cy="57"
            rx="56"
            ry="22"
            fill="none"
            stroke="#d97706"
            strokeWidth="0.9"
            opacity="0.7"
          />
          <ellipse
            cx="107"
            cy="57"
            rx="34"
            ry="14"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="0.6"
            opacity="0.5"
          />
        </g>

        {/* ========================================================= */}
        {/* CENTRAL DRIVE COLUMN & ROTATING SCRAPER TRUSS BRIDGE      */}
        {/* ========================================================= */}

        {/* ========================================================= */}
        {/* CENTRAL DRIVE COLUMN & SCADA CLARIFIER MECHANISM          */}
        {/* ========================================================= */}

        {/* 1. Submerged Rotating Sludge Scraper Rake (Strictly bounded to 3D water ellipse) */}
        <g id="pc-submerged-scraper" transform="translate(107, 58)">
          <g transform="scale(1, 0.38)">
            <g>
              {isAnimated && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0"
                  to="360"
                  dur="30s"
                  repeatCount="indefinite"
                />
              )}
              {/* Submerged Scraper Truss Arm */}
              <line x1="-72" y1="0" x2="72" y2="0" stroke="#451a03" strokeWidth="3.5" opacity="0.85" />
              <line x1="-72" y1="0" x2="72" y2="0" stroke="#78350f" strokeWidth="2" opacity="0.9" />
              {/* Submerged Scraper Rake Blades */}
              {[-58, -42, -26, -10, 10, 26, 42, 58].map((bx) => (
                <line key={bx} x1={bx} y1="-4" x2={bx} y2="4" stroke="#b45309" strokeWidth="2.2" opacity="0.85" />
              ))}
              {/* Submerged Center Pivot Hub */}
              <circle cx="0" cy="0" r="5" fill="#1e0b02" stroke="#78350f" strokeWidth="1.2" />
            </g>
          </g>
        </g>

        {/* 2. Stationary Diametral Access Walkway Bridge (Seated stably across top tank coping rim) */}
        <g id="pc-access-walkway" transform="translate(107, 56)">
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
          <circle cx="0" cy="0" r="7" fill="#0f172a" stroke="#d97706" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="3" fill="#f59e0b" />
        </g>

        {/* 3. Center Feed Well Column & Drive Motor */}
        <g id="pc-center-well">
          {/* Drop shadow of center well onto water */}
          <ellipse cx="109" cy="62" rx="16" ry="8" fill="#040914" opacity="0.6" />
          {/* Lower Column */}
          <rect x="95" y="44" width="24" height="22" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          {/* Motor / Gearbox Top Housing */}
          <ellipse cx="107" cy="44" rx="14" ry="6" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
          <ellipse cx="107" cy="38" rx="10" ry="4.5" fill="#d97706" stroke="#f59e0b" strokeWidth="1" />

          {/* Rotating Motor Drive Shaft Indicator (In-place rotation on center well) */}
          <g id="pc-drive-indicator" transform="translate(107, 38)">
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
        {/* BOTTOM PRIMARY SLUDGE WITHDRAWAL PIPE & FLANGED CONE      */}
        {/* ========================================================= */}
        {/* Drops to floor level and bends into Solids Manifold (SLD-601) - NO open arrows */}
        <g id="pc-primary-sludge-withdrawal" transform="translate(107, 80)">
          {/* Bottom Sludge Collection Hopper Cone */}
          <polygon points="-12,0 12,0 6,18 -6,18" fill="#451a03" stroke="#78350f" strokeWidth="1" />
          
          {/* Vertical Sludge Withdrawal Pipe */}
          <rect x="-4" y="16" width="8" height="42" rx="1" fill="#78350f" stroke="#92400e" strokeWidth="1" />
          <line
            x1="0"
            y1="16"
            x2="0"
            y2="58"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeDasharray="4 3"
            className={isAnimated ? 'pipe-flow' : undefined}
          />
          {/* Top Flange Connection to Tank */}
          <rect x="-7" y="16" width="14" height="3" fill="#b45309" stroke="#f59e0b" strokeWidth="0.8" />
          
          {/* Sludge Isolation Valve Handwheel */}
          <circle cx="8" cy="30" r="4.5" fill="#92400e" stroke="#f59e0b" strokeWidth="1" />
          <line x1="0" y1="30" x2="8" y2="30" stroke="#b45309" strokeWidth="1.6" />
          
          {/* Lower Flange Joint at floor transition */}
          <rect x="-6" y="52" width="12" height="3" rx="1" fill="#b45309" stroke="#f59e0b" strokeWidth="0.8" />
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
          Primary Clarifier
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
          PC-201
        </text>
      </g>
    </g>
  );
};
