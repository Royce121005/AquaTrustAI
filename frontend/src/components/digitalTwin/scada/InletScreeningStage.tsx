import React from 'react';
import { ScadaFloatingCard, ScadaSensorCalloutPin } from './ScadaPrimitives';

export interface InletScreeningStageProps {
  isSelected: boolean;
  isHovered: boolean;
  status: 'nominal' | 'warning' | 'alarm' | 'stale';
  inflowMld?: number | null;
  bod?: number | null;
  cod?: number | null;
  tss?: number | null;
  ph?: number | null;
  channelLevelM?: number | null;
  onSelect: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isAnimated?: boolean;
}

export const InletScreeningStage: React.FC<InletScreeningStageProps> = ({
  isSelected,
  isHovered,
  status,
  inflowMld = 10.0,
  bod,
  cod,
  tss,
  ph,
  channelLevelM = 2.4,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  isAnimated = true,
}) => {
  const flowVal = inflowMld !== null && inflowMld !== undefined ? inflowMld : '10.0';
  const bodVal = bod !== null && bod !== undefined ? bod : 'Unavailable';
  const phVal = ph !== null && ph !== undefined ? ph.toFixed(1) : '7.2';
  const levelVal = channelLevelM !== null && channelLevelM !== undefined ? channelLevelM : '2.4';

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
      id="scada-stage-inlet"
      transform="translate(10, 20)"
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
      aria-label="Stage 1: Raw Influent Inlet and Bar Screening"
      className="cursor-pointer outline-none focus:ring-2 focus:ring-sky-400 transition-all duration-200"
    >
      {/* 1. FLOATING TELEMETRY CARD (ENHANCED WIDTH: NO OVERLAP) */}
      <ScadaFloatingCard
        x={0}
        y={0}
        width={214}
        height={96}
        title="1. RAW INFLUENT & SCREENING"
        status={status}
        isSelected={isSelected}
        metrics={[
          { label: 'Flow', value: flowVal, unit: typeof flowVal === 'number' ? 'MLD' : undefined },
          { label: 'BOD', value: bodVal, unit: typeof bodVal === 'number' ? 'mg/L' : undefined },
          { label: 'pH', value: phVal },
        ]}
      />

      {/* 2. SENSOR CALLOUT PIN (LIT-101 LEVEL) */}
      <ScadaSensorCalloutPin
        x={130}
        y={106}
        pinHeight={42}
        tag="LIT-101"
        name="Level"
        value={levelVal}
        unit="m"
        status={status}
        textSide="right"
        color="#38bdf8"
      />

      {/* 3. PHYSICAL PROCESS EQUIPMENT: 3D BAR SCREEN & INLET FLUME CHANNEL (S-101) */}
      <g transform="translate(0, 145)">
        {/* Selection Amber Glowing Border when Selected */}
        {isSelected && (
          <rect
            x="2"
            y="2"
            width="210"
            height="156"
            rx="8"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            opacity="0.95"
            className="selection-amber-glow"
          />
        )}

        {/* Ambient Ground Contact Shadow */}
        <ellipse cx="106" cy="144" rx="98" ry="14" fill="#020617" opacity="0.8" />

        {/* ========================================================= */}
        {/* 3D ISOMETRIC CONCRETE CHANNEL AND INFLUENT HEADWORKS      */}
        {/* ========================================================= */}

        {/* Raw Sewage Inlet Pipe Entering on Left from INLET-001 Terminal Station */}
        <g id="raw-sewage-inlet-pipe" transform="translate(-2, 45)">
          <path d="M 0 0 L 32 0" stroke="#0f172a" strokeWidth="12" strokeLinecap="round" />
          <path d="M 0 0 L 32 0" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
          <path d="M 0 0 L 32 0" stroke="#0284c7" strokeWidth="4" strokeDasharray="5 3" className={isAnimated ? "pipe-flow" : undefined} />
          {/* Flanged Header Connection Collar to INLET-001 */}
          <rect x="-1" y="-7" width="5" height="14" rx="1" fill="#475569" stroke="#64748b" strokeWidth="0.8" />
          <line x1="-1" y1="-7" x2="-1" y2="7" stroke="#38bdf8" strokeWidth="1.2" />
        </g>

        {/* Outer Rear Concrete Wall (3D Isometric Perspective) */}
        <polygon
          points="20,24 196,24 206,36 30,36"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1.2"
        />
        {/* Rear Wall Coping Top Highlight */}
        <polygon
          points="20,24 196,24 198,21 22,21"
          fill="#64748b"
          stroke="#94a3b8"
          strokeWidth="0.8"
        />

        {/* Left Concrete Flume Sidewall */}
        <polygon
          points="10,48 30,36 30,126 10,138"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1.2"
        />
        <polygon
          points="10,48 18,43 38,31 30,36"
          fill="#475569"
          stroke="#64748b"
          strokeWidth="0.8"
        />

        {/* Right Concrete Flume Outflow Wall (Stepped Hydraulic Crest) */}
        <polygon
          points="196,24 206,36 206,126 196,118"
          fill="#334155"
          stroke="#1e293b"
          strokeWidth="1.2"
        />

        {/* Front Concrete Foundation Slab with Beveled Wall */}
        <polygon
          points="10,138 30,126 196,126 176,138"
          fill="#0f172a"
          stroke="#1e293b"
          strokeWidth="1"
        />
        <rect
          x="10"
          y="132"
          width="168"
          height="12"
          rx="2"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1"
        />
        <line x1="10" y1="132" x2="178" y2="132" stroke="#475569" strokeWidth="0.8" />

        {/* Inner Recessed Channel Basin Bed */}
        <polygon
          points="28,42 196,42 196,124 28,124"
          fill="#070e1b"
          stroke={strokeColor}
          strokeWidth={isSelected ? 2 : 1.2}
        />

        {/* ========================================================= */}
        {/* FLOWING WASTEWATER STREAM & HYDRAULIC WEIR CASCADE        */}
        {/* ========================================================= */}

        {/* Deep Water Volume in Channel */}
        <polygon
          points="32,48 192,48 192,120 32,120"
          fill="url(#gradInletWater)"
          opacity="0.95"
        />

        {/* Upper Incoming Turbulent Water Stream */}
        <g className={isAnimated ? 'scada-wave' : undefined}>
          <path
            d="M 32 60 C 50 56, 80 64, 110 58 C 140 54, 170 62, 192 58 L 192 118 L 32 118 Z"
            fill="url(#gradInletWater)"
            opacity="0.8"
          />
          {/* Surface Foaming Stream Lines */}
          <path
            d="M 34 68 Q 65 62, 95 69 T 155 64 T 190 68"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.8"
            strokeDasharray="8 4"
            className={isAnimated ? "pipe-flow" : undefined}
            opacity="0.85"
          />
          <path
            d="M 34 82 Q 75 76, 115 84 T 188 80"
            fill="none"
            stroke="#bae6fd"
            strokeWidth="1.4"
            strokeDasharray="6 3"
            className={isAnimated ? "pipe-flow-fast" : undefined}
            opacity="0.7"
          />
        </g>

        {/* Hydraulic Step Drop Foam / Froth Line */}
        <g transform="translate(32, 94)">
          <ellipse cx="25" cy="4" rx="18" ry="3" fill="#ffffff" opacity="0.65" />
          <ellipse cx="65" cy="5" rx="22" ry="3.5" fill="#ffffff" opacity="0.8" />
          <ellipse cx="115" cy="4" rx="26" ry="3" fill="#ffffff" opacity="0.7" />
          <ellipse cx="150" cy="5" rx="14" ry="2.5" fill="#ffffff" opacity="0.6" />
        </g>

        {/* ========================================================= */}
        {/* INCLINED MECHANICAL BAR SCREEN RACK & DRIVE UNIT (S-101)  */}
        {/* ========================================================= */}

        {/* Main Bar Screen Assembly inclined across channel at 60 deg */}
        <g id="s-101-bar-screen">
          {/* Heavy Steel Support Frame Side Members */}
          <line x1="72" y1="40" x2="114" y2="122" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
          <line x1="126" y1="40" x2="168" y2="122" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />

          {/* Individual Parallel Stainless Steel Screen Bars */}
          {[
            { x1: 76, x2: 118 },
            { x1: 82, x2: 124 },
            { x1: 88, x2: 130 },
            { x1: 94, x2: 136 },
            { x1: 100, x2: 142 },
            { x1: 106, x2: 148 },
            { x1: 112, x2: 154 },
            { x1: 118, x2: 160 },
            { x1: 124, x2: 166 },
          ].map((bar, i) => (
            <line
              key={i}
              x1={bar.x1}
              y1="42"
              x2={bar.x2}
              y2="120"
              stroke="#cbd5e1"
              strokeWidth="1.8"
              opacity="0.9"
            />
          ))}

          {/* Cross Support Stiffeners */}
          <line x1="86" y1="68" x2="138" y2="68" stroke="#475569" strokeWidth="2.4" />
          <line x1="100" y1="96" x2="152" y2="96" stroke="#475569" strokeWidth="2.4" />

          {/* Top Drive Motor & Gearhead Carriage Unit */}
          <rect x="70" y="32" width="62" height="11" rx="2" fill="#0f172a" stroke="#0284c7" strokeWidth="1.2" />
          <rect x="74" y="34" width="20" height="7" rx="1.5" fill="#f59e0b" stroke="#d97706" strokeWidth="0.8" />
          <circle cx="84" cy="37.5" r="2.2" fill="#ffffff" />
          <rect x="98" y="35" width="30" height="5" rx="1" fill="#334155" />

          {/* Mechanical Wiper Rake Arm Travelling on Screen */}
          <g className={isAnimated ? 'scada-rake' : undefined}>
            <line x1="90" y1="56" x2="142" y2="56" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
            <circle cx="116" cy="56" r="3.2" fill="#ea580c" stroke="#fef08a" strokeWidth="0.8" />
          </g>
        </g>

        {/* Ultrasonic Level Sensor Horn (Mounted on Top Beam) */}
        <g id="s-101-level-transducer" transform="translate(130, 28)">
          <rect x="-4" y="0" width="8" height="6" rx="1" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
          <polygon points="-6,6 6,6 3,12 -3,12" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
          <circle cx="0" cy="3" r="1.5" fill="#38bdf8" />
        </g>

        {/* ========================================================= */}
        {/* BOTTOM EQUIPMENT LABELS                                   */}
        {/* ========================================================= */}
        <text
          x="106"
          y="156"
          textAnchor="middle"
          fill="#f1f5f9"
          fontSize="9.5"
          fontFamily="sans-serif"
          fontWeight="bold"
          letterSpacing="0.2px"
        >
          Bar Screen & Grit Chamber
        </text>
        <text
          x="106"
          y="167"
          textAnchor="middle"
          fill="#38bdf8"
          fontSize="8.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          S-101
        </text>
      </g>
    </g>
  );
};
