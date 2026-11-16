import React from 'react';
import { ScadaFloatingCard, ScadaSensorCalloutPin } from './ScadaPrimitives';

export interface AerationBasinStageProps {
  isSelected: boolean;
  isHovered: boolean;
  status: 'nominal' | 'warning' | 'alarm' | 'stale';
  bod?: number | null;
  doMgL?: number | null;
  mlssMgL?: number | null;
  tempC?: number | null;
  hrtHours?: number | null;
  onSelect: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isAnimated?: boolean;
}

export const AerationBasinStage: React.FC<AerationBasinStageProps> = ({
  isSelected,
  isHovered,
  status,
  bod,
  doMgL,
  mlssMgL = 2580,
  tempC = 22.4,
  hrtHours = 8.0,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  isAnimated = true,
}) => {
  const isDoLow = doMgL !== null && doMgL !== undefined && doMgL < 2.0;
  const actualStatus = isDoLow && status === 'nominal' ? 'warning' : status;

  const doVal = doMgL !== null && doMgL !== undefined ? doMgL : '2.0';
  const mlssVal = mlssMgL !== null && mlssMgL !== undefined ? mlssMgL : '2,580';
  const tempVal = tempC !== null && tempC !== undefined ? tempC : '22.4';

  return (
    <g
      id="scada-stage-aeration"
      transform="translate(490, 20)"
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
      aria-label="Stage 3: Biological Aeration Basin CSTR AB-301"
      className="cursor-pointer outline-none focus:ring-2 focus:ring-amber-400 transition-all duration-200"
    >
      {/* 1. FLOATING TELEMETRY CARD (AMBER GLOWING BORDER WHEN SELECTED, NO OVERLAP) */}
      <ScadaFloatingCard
        x={0}
        y={0}
        width={214}
        height={96}
        title="3. BIOLOGICAL AERATION (CSTR)"
        status={actualStatus}
        isSelected={isSelected}
        metrics={[
          { label: 'DO', value: doVal, unit: typeof doVal === 'number' ? 'mg/L' : undefined, dotColor: isDoLow ? '#f59e0b' : '#10b981' },
          { label: 'MLSS', value: mlssVal, unit: typeof mlssVal === 'number' ? 'mg/L' : undefined },
          { label: 'Temp', value: tempVal, unit: typeof tempVal === 'number' ? '°C' : undefined },
        ]}
      />

      {/* 2. SENSOR CALLOUT PIN (AIT-302 MLSS) */}
      <ScadaSensorCalloutPin
        x={130}
        y={106}
        pinHeight={42}
        tag="AIT-302"
        name="MLSS"
        value={mlssVal}
        unit="mg/L"
        status={actualStatus}
        textSide="right"
        color="#38bdf8"
      />

      {/* 3. PHYSICAL PROCESS EQUIPMENT: 3D ISOMETRIC CONCRETE AERATION BASIN AB-301 */}
      <g transform="translate(0, 145)">
        {/* Amber Glowing Selection Halo around Basin */}
        {isSelected && (
          <rect
            x="2"
            y="2"
            width="210"
            height="146"
            rx="8"
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
        {/* 3D ISOMETRIC CONCRETE BASIN GEOMETRY                      */}
        {/* ========================================================= */}

        {/* Isometric Rear Wall Coping */}
        <polygon
          points="20,24 194,24 204,36 30,36"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1.2"
        />

        {/* Exterior Front Concrete Wall Face */}
        <rect
          x="10"
          y="36"
          width="194"
          height="88"
          rx="3"
          fill="#0c1726"
          stroke="#1e293b"
          strokeWidth="1.5"
        />

        {/* Vertical Structural Buttress Reinforcement Ribs (Concrete Columns) */}
        {[34, 62, 90, 118, 146, 174].map((colX) => (
          <g key={colX}>
            <rect x={colX} y="36" width="6" height="88" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
            <line x1={colX + 2} y1="36" x2={colX + 2} y2="124" stroke="#475569" strokeWidth="0.8" />
          </g>
        ))}

        {/* Horizontal Concrete Tie Beam */}
        <rect x="10" y="118" width="194" height="6" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />

        {/* Inner Fluid Window (Cutaway into Churning Mixed Liquor) */}
        <polygon
          points="18,40 196,40 196,116 18,116"
          fill="url(#gradAerationWater)"
          stroke="#0284c7"
          strokeWidth="1.2"
        />

        {/* ========================================================= */}
        {/* SAFETY YELLOW PERIMETER WALKWAY HANDRAILS (ALL AROUND RIM) */}
        {/* ========================================================= */}
        <g id="ab-safety-handrails">
          {/* Top Yellow Handrail Bar */}
          <line x1="8" y1="16" x2="206" y2="16" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
          {/* Mid Knee Rail Bar */}
          <line x1="8" y1="26" x2="206" y2="26" stroke="#d97706" strokeWidth="1.2" strokeLinecap="round" />
          {/* Vertical Stanchion Posts */}
          {[12, 36, 62, 90, 118, 146, 174, 202].map((sx) => (
            <line key={sx} x1={sx} y1="16" x2={sx} y2="36" stroke="#f59e0b" strokeWidth="1.8" />
          ))}
          {/* Toe Board Kickplate */}
          <rect x="8" y="33" width="198" height="3" fill="#b45309" opacity="0.9" />
        </g>

        {/* ========================================================= */}
        {/* SUBMERGED FINE-BUBBLE DIFFUSER HEADERS (AT FLOOR)        */}
        {/* ========================================================= */}
        <g id="ab-diffuser-grid" transform="translate(18, 108)">
          {/* Air Inlet Connection Port (Receiving compressed oxygen from BLW-301) */}
          <g id="ab-air-inlet-port" transform="translate(0, 0)">
            {/* Wall penetration nozzle casing */}
            <rect x="-10" y="-5" width="16" height="10" rx="1.5" fill="#0f172a" stroke="#0284c7" strokeWidth="1.2" />
            {/* Flanged connection collar to BLW-301 air pipe */}
            <rect x="-12" y="-7" width="4" height="14" rx="1" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
            <line x1="-12" y1="-7" x2="-12" y2="7" stroke="#38bdf8" strokeWidth="1.6" />
            {/* Air isolation valve */}
            <circle cx="-2" cy="-9" r="3.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
            <line x1="-2" y1="-5" x2="-2" y2="-9" stroke="#38bdf8" strokeWidth="1.4" />
          </g>

          <line x1="6" y1="0" x2="172" y2="0" stroke="#f59e0b" strokeWidth="2.5" />
          {[12, 32, 52, 72, 92, 112, 132, 152, 166].map((dx) => (
            <g key={dx} transform={`translate(${dx}, 0)`}>
              <rect x="-6" y="-3" width="12" height="6" rx="2" fill="#d97706" stroke="#fbbf24" strokeWidth="0.8" />
              {/* Vertical Air Supply Drop Pipe */}
              <line x1="0" y1="-70" x2="0" y2="-3" stroke="#64748b" strokeWidth="1.2" strokeOpacity="0.6" />
            </g>
          ))}
        </g>

        {/* ========================================================= */}
        {/* EFFERVESCENT MICRO-BUBBLES & CHURNING FOAM (ANIMATED)    */}
        {/* ========================================================= */}
        {isAnimated && (
          <g id="ab-effervescent-bubbles">
            {/* Stream 1: Rising Fine Micro-bubbles from Floor */}
            <circle cx="36" cy="100" r="1.8" fill="#ffffff" opacity="0.9" className="scada-bubble-1" />
            <circle cx="44" cy="94" r="2.2" fill="#e0f2fe" opacity="0.8" className="scada-bubble-2" />
            <circle cx="58" cy="98" r="2.5" fill="#ffffff" opacity="0.95" className="scada-bubble-3" />
            <circle cx="68" cy="92" r="1.7" fill="#fef08a" opacity="0.8" className="scada-bubble-1" />
            <circle cx="78" cy="102" r="2.8" fill="#ffffff" opacity="0.9" className="scada-bubble-2" />
            <circle cx="92" cy="95" r="2.2" fill="#e0f2fe" opacity="0.85" className="scada-bubble-3" />
            <circle cx="104" cy="100" r="2.6" fill="#ffffff" opacity="0.95" className="scada-bubble-1" />
            <circle cx="116" cy="92" r="1.8" fill="#ffffff" opacity="0.85" className="scada-bubble-2" />
            <circle cx="128" cy="98" r="2.7" fill="#ffffff" opacity="0.9" className="scada-bubble-3" />
            <circle cx="140" cy="94" r="2.2" fill="#fef08a" opacity="0.8" className="scada-bubble-1" />
            <circle cx="152" cy="100" r="2.5" fill="#ffffff" opacity="0.95" className="scada-bubble-2" />
            <circle cx="166" cy="95" r="2.0" fill="#e0f2fe" opacity="0.85" className="scada-bubble-3" />
            <circle cx="178" cy="98" r="2.4" fill="#ffffff" opacity="0.9" className="scada-bubble-1" />

            {/* Stream 2: Mid-water turbulent flurries */}
            <circle cx="48" cy="68" r="2.2" fill="#ffffff" opacity="0.9" className="scada-bubble-2" />
            <circle cx="72" cy="62" r="2.6" fill="#e0f2fe" opacity="0.85" className="scada-bubble-1" />
            <circle cx="96" cy="70" r="2.0" fill="#ffffff" opacity="0.9" className="scada-bubble-3" />
            <circle cx="122" cy="64" r="2.8" fill="#ffffff" opacity="0.95" className="scada-bubble-2" />
            <circle cx="148" cy="68" r="2.2" fill="#e0f2fe" opacity="0.8" className="scada-bubble-1" />
            <circle cx="172" cy="62" r="2.5" fill="#ffffff" opacity="0.9" className="scada-bubble-3" />
          </g>
        )}

        {/* Churning Surface Froth & Foam Islands */}
        <g transform="translate(18, 40)" className={isAnimated ? 'scada-churn' : undefined}>
          <path
            d="M 0 5 Q 18 0 36 5 T 72 5 T 108 5 T 144 5 T 176 5"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.2"
            opacity="0.95"
          />
          <path
            d="M 6 8 Q 26 3 46 8 T 86 8 T 126 8 T 170 8"
            fill="none"
            stroke="#bae6fd"
            strokeWidth="1.6"
            opacity="0.8"
          />
          {/* Froth Foam Islands on Surface */}
          <ellipse cx="38" cy="5" rx="16" ry="3.5" fill="#ffffff" opacity="0.85" />
          <ellipse cx="88" cy="4" rx="22" ry="4" fill="#ffffff" opacity="0.9" />
          <ellipse cx="140" cy="5" rx="18" ry="3.5" fill="#ffffff" opacity="0.85" />
        </g>

        {/* ========================================================= */}
        {/* BOTTOM EQUIPMENT LABELS (CLEANLY ELEVATED ABOVE PUMP)     */}
        {/* ========================================================= */}
        <text
          x="107"
          y="134"
          textAnchor="middle"
          fill="#f1f5f9"
          fontSize="9.5"
          fontFamily="sans-serif"
          fontWeight="bold"
          letterSpacing="0.2px"
        >
          Aeration Basin (CSTR)
        </text>
        <text
          x="107"
          y="144"
          textAnchor="middle"
          fill="#38bdf8"
          fontSize="8.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          AB-301
        </text>
      </g>
    </g>
  );
};
