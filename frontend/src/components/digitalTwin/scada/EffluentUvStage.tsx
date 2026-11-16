import React from 'react';
import { ScadaFloatingCard, ScadaSensorCalloutPin } from './ScadaPrimitives';

export interface EffluentUvStageProps {
  isSelected: boolean;
  isHovered: boolean;
  status: 'nominal' | 'warning' | 'alarm' | 'stale';
  bod?: number | null;
  cod?: number | null;
  tss?: number | null;
  ph?: number | null;
  uvIntensityMilliJoules?: number | null;
  onSelect: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isAnimated?: boolean;
}

export const EffluentUvStage: React.FC<EffluentUvStageProps> = ({
  isSelected,
  isHovered,
  status,
  bod,
  cod,
  tss,
  ph,
  uvIntensityMilliJoules = 42,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  isAnimated = true,
}) => {
  const isCpcbExceeded = (bod !== null && bod !== undefined && bod > 30.0) ||
                         (tss !== null && tss !== undefined && tss > 50.0);

  const actualStatus = isCpcbExceeded && status === 'nominal' ? 'alarm' : status;

  const bodVal = bod !== null && bod !== undefined ? bod : '3.8';
  const phVal = ph !== null && ph !== undefined ? ph.toFixed(2) : '7.40';
  const uvVal = uvIntensityMilliJoules !== null ? uvIntensityMilliJoules : '42';

  const strokeColor = isSelected
    ? '#f59e0b'
    : actualStatus === 'alarm'
    ? '#ef4444'
    : actualStatus === 'warning'
    ? '#f59e0b'
    : isHovered
    ? '#c084fc'
    : '#1e293b';

  return (
    <g
      id="scada-stage-effluent-uv"
      transform="translate(975, 20)"
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
      aria-label="Stage 5: Final Effluent and UV Disinfection System UV-501"
      className="cursor-pointer outline-none focus:ring-2 focus:ring-purple-400 transition-all duration-200"
    >
      {/* 1. FLOATING TELEMETRY CARD (ENHANCED WIDTH: NO OVERLAP) */}
      <ScadaFloatingCard
        x={0}
        y={0}
        width={185}
        height={96}
        title="5. FINAL EFFLUENT & UV"
        status={actualStatus}
        isSelected={isSelected}
        metrics={[
          { label: 'Final BOD', value: bodVal, unit: typeof bodVal === 'number' ? 'mg/L' : undefined, dotColor: isCpcbExceeded ? '#ef4444' : '#10b981' },
          { label: 'pH', value: phVal },
          { label: 'UV Dose', value: uvVal, unit: typeof uvVal === 'number' ? 'mJ/cm²' : undefined },
        ]}
      />

      {/* 2. SENSOR CALLOUT PIN (AIT-501 pH) */}
      <ScadaSensorCalloutPin
        x={80}
        y={106}
        pinHeight={42}
        tag="AIT-501"
        name="pH"
        value={phVal}
        status={actualStatus}
        textSide="right"
        color="#38bdf8"
      />

      {/* 3. PHYSICAL PROCESS EQUIPMENT: 3D SERPENTINE UV CHANNEL UV-501 */}
      <g transform="translate(0, 145)">
        {/* Selection Amber Glowing Border when Selected */}
        {isSelected && (
          <rect
            x="2"
            y="2"
            width="108"
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
        <ellipse cx="58" cy="144" rx="52" ry="14" fill="#020617" opacity="0.8" />

        {/* ========================================================= */}
        {/* 3D ISOMETRIC CONCRETE SERPENTINE UV CHANNEL STRUCTURE     */}
        {/* ========================================================= */}

        {/* Outer Rear Concrete Wall */}
        <polygon
          points="20,24 95,24 105,36 30,36"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1.2"
        />
        {/* Rear Wall Coping Top Highlight */}
        <polygon
          points="20,24 95,24 97,21 22,21"
          fill="#64748b"
          stroke="#94a3b8"
          strokeWidth="0.8"
        />

        {/* Left Flume Sidewall (Connecting from Sec Clarifier) */}
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

        {/* Right Wall (Stepped Overflow Discharge Crest) */}
        <polygon
          points="95,24 105,36 105,126 95,118"
          fill="#334155"
          stroke="#1e293b"
          strokeWidth="1.2"
        />

        {/* Front Concrete Foundation Slab */}
        <polygon
          points="10,138 30,126 95,126 80,138"
          fill="#0f172a"
          stroke="#1e293b"
          strokeWidth="1"
        />
        <rect
          x="10"
          y="132"
          width="75"
          height="12"
          rx="2"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1"
        />
        <line x1="10" y1="132" x2="85" y2="132" stroke="#475569" strokeWidth="0.8" />

        {/* Channel Outer Perimeter Frame */}
        <polygon
          points="28,42 95,42 95,124 28,124"
          fill="#070e1b"
          stroke={strokeColor}
          strokeWidth={isSelected ? 2 : 1.2}
        />

        {/* ========================================================= */}
        {/* CLEAR TREATED WATER BED & GLOWING VIOLET UV LAMP BANKS     */}
        {/* ========================================================= */}

        {/* Clear Treated Effluent Stream Bed */}
        <polygon
          points="32,48 92,48 92,120 32,120"
          fill="url(#gradUvWater)"
          opacity="0.95"
        />

        {/* Animated Water Surface Waves */}
        <g className={isAnimated ? 'scada-wave' : undefined}>
          <path
            d="M 32 60 C 45 56, 65 64, 80 58 C 88 55, 90 62, 92 60 L 92 118 L 32 118 Z"
            fill="url(#gradUvWater)"
            opacity="0.8"
          />
          {/* Surface Ripples */}
          <path
            d="M 34 68 Q 60 62, 90 68"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.6"
            strokeDasharray="8 4"
            className={isAnimated ? "pipe-flow" : undefined}
            opacity="0.85"
          />
          <path
            d="M 34 92 Q 62 86, 90 90"
            fill="none"
            stroke="#c084fc"
            strokeWidth="1.4"
            strokeDasharray="6 3"
            className={isAnimated ? "pipe-flow-fast" : undefined}
            opacity="0.75"
          />
        </g>

        {/* Submerged Quartz Sleeve Horizontal UV Lamp Tubes */}
        <g id="uv-lamp-banks">
          {/* Subtle Ambient Violet Radiation Glow Field */}
          <rect
            x="34"
            y="52"
            width="58"
            height="62"
            rx="4"
            fill="rgba(147, 51, 234, 0.14)"
            className={isAnimated ? 'scada-uv-pulse' : undefined}
          />

          {[
            { y: 58, dur: '1.8s' },
            { y: 74, dur: '2.2s' },
            { y: 90, dur: '1.9s' },
            { y: 106, dur: '2.4s' },
          ].map((lamp, i) => (
            <g key={i} transform={`translate(36, ${lamp.y})`}>
              {/* Outer Glowing Quartz Sleeve */}
              <rect
                x="0"
                y="-3.5"
                width="52"
                height="7"
                rx="3.5"
                fill="none"
                stroke="#c084fc"
                strokeWidth="1.5"
                opacity="0.8"
                filter="drop-shadow(0 0 6px rgba(192, 132, 252, 0.9))"
              />
              {/* Core Fluorescent Luminous Arc */}
              <line
                x1="4"
                y1="0"
                x2="48"
                y2="0"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                opacity="0.95"
              />
              <line
                x1="4"
                y1="0"
                x2="48"
                y2="0"
                stroke="#d8b4fe"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.6"
              />

              {/* End Lamp Mounting Brackets */}
              <rect x="-3" y="-5" width="5" height="10" rx="1" fill="#334155" stroke="#64748b" strokeWidth="0.8" />
              <rect x="50" y="-5" width="5" height="10" rx="1" fill="#334155" stroke="#64748b" strokeWidth="0.8" />
            </g>
          ))}
        </g>

        {/* Right Discharge Flanged Port (Mating directly with pipe M 1080 205 L 1110 205 to OUTFALL-701) */}
        <g id="treated-effluent-discharge" transform="translate(105, 60)">
          {/* Wall Flange Collar */}
          <rect x="-2" y="-7" width="5" height="14" rx="1" fill="#475569" stroke="#64748b" strokeWidth="0.8" />
          <line x1="3" y1="-7" x2="3" y2="7" stroke="#38bdf8" strokeWidth="1.2" />
        </g>

        {/* ========================================================= */}
        {/* BOTTOM EQUIPMENT LABELS                                   */}
        {/* ========================================================= */}
        <text
          x="58"
          y="156"
          textAnchor="middle"
          fill="#f1f5f9"
          fontSize="9.5"
          fontFamily="sans-serif"
          fontWeight="bold"
          letterSpacing="0.2px"
        >
          UV Disinfection
        </text>
        <text
          x="58"
          y="167"
          textAnchor="middle"
          fill="#38bdf8"
          fontSize="8.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          UV-501
        </text>
      </g>
    </g>
  );
};
