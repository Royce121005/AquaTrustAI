import React from 'react';

/* ========================================================================= */
/* 1. SCADA CONNECTED PIPE COMPONENT WITH 3D CASING & FLOW PARTICLES         */
/* ========================================================================= */

export type PipeVariant = 'process' | 'ras' | 'uv' | 'sludge' | 'was' | 'air';

export interface ScadaPipeProps {
  id: string;
  path: string;
  variant?: PipeVariant;
  strokeColor?: string;
  flowColor?: string;
  strokeWidth?: number;
  flowSpeedSeconds?: number;
  isAnimated?: boolean;
  isReverse?: boolean;
  particleCount?: number;
  label?: string;
  labelX?: number;
  labelY?: number;
  arrowMarkerId?: string;
}

export const ScadaPipe: React.FC<ScadaPipeProps> = ({
  id,
  path,
  variant = 'process',
  strokeColor,
  flowColor,
  strokeWidth,
  flowSpeedSeconds = 1.4,
  isAnimated = true,
  isReverse = false,
  particleCount = 2,
  label,
  labelX,
  labelY,
  arrowMarkerId,
}) => {
  // Preset dimensions based on process stream variant
  const defaultStrokeWidth = variant === 'was' ? 5 : variant === 'air' ? 4 : 7;
  const actualStrokeWidth = strokeWidth !== undefined ? strokeWidth : defaultStrokeWidth;

  // Preset styles based on process stream variant
  const actualStrokeColor =
    strokeColor ||
    (variant === 'ras'
      ? '#78350f'
      : variant === 'uv'
      ? '#4c1d95'
      : variant === 'sludge'
      ? '#451a03'
      : variant === 'was'
      ? '#78350f'
      : variant === 'air'
      ? '#334155'
      : '#034a70');

  const actualFlowColor =
    flowColor ||
    (variant === 'ras'
      ? '#f59e0b'
      : variant === 'uv'
      ? '#c084fc'
      : variant === 'sludge'
      ? '#b45309'
      : variant === 'was'
      ? '#d97706'
      : variant === 'air'
      ? '#94a3b8'
      : '#38bdf8');

  const flowClass =
    isReverse
      ? 'pipe-flow-reverse'
      : variant === 'ras'
      ? 'pipe-flow-ras'
      : variant === 'uv'
      ? 'pipe-flow-uv'
      : variant === 'was'
      ? 'pipe-flow-was'
      : variant === 'air'
      ? 'pipe-flow-air'
      : 'pipe-flow';

  const dur = `${flowSpeedSeconds}s`;

  // Core stream stroke width tailored to pipe dimension
  const coreStrokeWidth =
    actualStrokeWidth <= 4
      ? 1.8
      : actualStrokeWidth <= 5
      ? 2.4
      : Math.max(2.2, actualStrokeWidth - 3.5);

  return (
    <g id={`pipe-group-${id}`} className="scada-pipe-network select-none">
      {/* 3D Drop Shadow of Pipe onto Background Floor */}
      <path
        d={path}
        fill="none"
        stroke="#020617"
        strokeWidth={actualStrokeWidth + 4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.65}
      />

      {/* Outer Structural Steel Pipe Wall / Pressure Casing */}
      <path
        d={path}
        fill="none"
        stroke={actualStrokeColor}
        strokeWidth={actualStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />

      {/* 3D Top Cylindrical Highlight Line */}
      <path
        d={path}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={Math.max(1, actualStrokeWidth * 0.25)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner Active Fluid Core Stream with Animated Dash */}
      <path
        d={path}
        fill="none"
        stroke={actualFlowColor}
        strokeWidth={coreStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isAnimated ? flowClass : undefined}
        markerEnd={arrowMarkerId ? `url(#${arrowMarkerId})` : undefined}
        opacity={0.95}
      />

      {/* Discrete Animated Fluid Droplets Travelling Along Path */}
      {isAnimated &&
        particleCount > 0 &&
        Array.from({ length: particleCount }).map((_, idx) => {
          const begin = `${(idx * (flowSpeedSeconds / particleCount)).toFixed(2)}s`;
          return (
            <circle
              key={idx}
              r={Math.max(1.8, actualStrokeWidth * 0.38)}
              fill={actualFlowColor}
              opacity={0.95}
              filter="drop-shadow(0 0 3px rgba(255,255,255,0.8))"
            >
              <animateMotion
                path={path}
                dur={dur}
                begin={begin}
                repeatCount="indefinite"
                keyPoints={isReverse ? '1;0' : '0;1'}
                keyTimes="0;1"
              />
            </circle>
          );
        })}

      {/* Optional In-line Process Pipe Tag / Label */}
      {label && labelX !== undefined && labelY !== undefined && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x="-65"
            y="-10"
            width="130"
            height="18"
            rx="4"
            fill="#090d16"
            fillOpacity="0.9"
            stroke={actualStrokeColor}
            strokeWidth="1"
          />
          <text
            x="0"
            y="2.5"
            textAnchor="middle"
            fill={actualFlowColor}
            fontSize="8"
            fontFamily="sans-serif"
            fontWeight="bold"
            letterSpacing="0.2px"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
};

/* ========================================================================= */
/* 2. 3D CENTRIFUGAL PUMP COMPONENT (PMP-401 RAS RECYCLE PUMP)               */
/* ========================================================================= */

export interface ScadaPumpProps {
  id: string;
  x: number;
  y: number;
  tag: string;
  name: string;
  isRunning?: boolean;
  isFaulted?: boolean;
  color?: string;
  onClick?: () => void;
}

export const ScadaPump: React.FC<ScadaPumpProps> = ({
  id,
  x,
  y,
  tag,
  name,
  isRunning = true,
  isFaulted = false,
  color = '#f59e0b',
  onClick,
}) => {
  const statusColor = isFaulted ? '#ef4444' : isRunning ? color : '#64748b';

  return (
    <g
      id={`pump-${id}`}
      transform={`translate(${x}, ${y})`}
      className="cursor-pointer select-none group"
      onClick={onClick}
    >
      {/* Ground Contact Shadow */}
      <ellipse cx="20" cy="38" rx="26" ry="6" fill="#020617" opacity="0.85" />

      {/* Concrete Equipment Plinth / Mounting Pad */}
      <rect x="-8" y="30" width="56" height="7" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <line x1="-8" y1="30" x2="48" y2="30" stroke="#64748b" strokeWidth="0.9" />

      {/* Electric Drive Motor Housing (Behind Volute Casing) */}
      <g id="pump-motor" transform="translate(18, 4)">
        {/* Motor Cylinder Shell */}
        <rect x="0" y="2" width="22" height="22" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
        {/* Motor Horizontal Cooling Fins */}
        <line x1="2" y1="7" x2="20" y2="7" stroke="#475569" strokeWidth="1" />
        <line x1="2" y1="12" x2="20" y2="12" stroke="#475569" strokeWidth="1" />
        <line x1="2" y1="17" x2="20" y2="17" stroke="#475569" strokeWidth="1" />
        {/* Terminal Junction Box */}
        <rect x="6" y="-3" width="10" height="5" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
      </g>

      {/* 3D Volute Spiral Casing (Industrial Body with Metallic Lighting) */}
      <circle
        cx="14"
        cy="15"
        r="17"
        fill="#071b30"
        stroke="#0284c7"
        strokeWidth="2.4"
        filter="drop-shadow(0 4px 8px rgba(0,0,0,0.65))"
        className="group-hover:stroke-sky-300 transition-colors"
      />
      <circle cx="14" cy="15" r="14" fill="#0c233c" stroke="#0369a1" strokeWidth="1" />

      {/* Top Highlight Bevel on Volute Casing */}
      <ellipse cx="14" cy="7" rx="10" ry="3.2" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />

      {/* Flanged Suction Inlet & Discharge Ports */}
      {/* Top Discharge Flange */}
      <rect x="10" y="-2" width="8" height="4" rx="1" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
      <line x1="8" y1="-2" x2="20" y2="-2" stroke="#f59e0b" strokeWidth="2.2" />

      {/* Left Suction Flange */}
      <rect x="-4" y="11" width="4" height="8" rx="1" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
      <line x1="-4" y1="9" x2="-4" y2="21" stroke="#f59e0b" strokeWidth="2.2" />

      {/* Rotating Impeller Assembly (Spins strictly in-place around 0,0) */}
      <g transform="translate(14, 15)">
        <g>
          {isRunning && !isFaulted && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to="360"
              dur="0.85s"
              repeatCount="indefinite"
            />
          )}
          <path d="M 0 0 C 4 -3, 9 -3, 9 -8" fill="none" stroke={statusColor} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 0 0 C -4 3, -9 3, -9 8" fill="none" stroke={statusColor} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 0 0 C 3 4, 3 9, 8 9" fill="none" stroke={statusColor} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 0 0 C -3 -4, -3 -9, -8 -9" fill="none" stroke={statusColor} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="0" cy="0" r="4" fill="#0f172a" stroke={statusColor} strokeWidth="1.5" />
          <circle cx="0" cy="0" r="1.8" fill={statusColor} />
        </g>
      </g>

      {/* Equipment Tag Labels (Offset clearly below plinth) */}
      <text
        x="20"
        y="49"
        textAnchor="middle"
        fill={statusColor}
        fontSize="8.5"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {tag}
      </text>
      <text
        x="20"
        y="58"
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="7"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        {name}
      </text>
    </g>
  );
};



/* ========================================================================= */
/* 3. SCADA BLOWER (ROTARY LOBE BLOWER WITH AERATION TURBINE RUNNER)         */
/* ========================================================================= */

export interface ScadaBlowerProps {
  id: string;
  x: number;
  y: number;
  tag?: string;
  name?: string;
  isRunning?: boolean;
  isFaulted?: boolean;
  color?: string;
  onClick?: () => void;
}

export const ScadaBlower: React.FC<ScadaBlowerProps> = ({
  id,
  x,
  y,
  tag = 'BLW-301',
  name = 'Air Blower',
  isRunning = true,
  isFaulted = false,
  color = '#38bdf8',
  onClick,
}) => {
  const statusColor = isFaulted ? '#ef4444' : isRunning ? color : '#64748b';

  return (
    <g
      id={`blower-${id}`}
      transform={`translate(${x}, ${y})`}
      className="scada-blower cursor-pointer select-none"
      onClick={onClick}
    >
      {/* Ground Contact Shadow */}
      <ellipse cx="24" cy="38" rx="28" ry="6" fill="#020617" opacity="0.85" />

      {/* Concrete Equipment Plinth / Mounting Pad */}
      <rect x="-6" y="30" width="60" height="7" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <line x1="-6" y1="30" x2="54" y2="30" stroke="#64748b" strokeWidth="0.9" />

      {/* Electric Drive Motor Body (Horizontal Casing with Cooling Ribs) */}
      <g id={`blower-motor-${id}`} transform="translate(20, 6)">
        <rect x="0" y="0" width="24" height="19" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="1.2" />
        <line x1="2" y1="5" x2="22" y2="5" stroke="#334155" strokeWidth="0.9" />
        <line x1="2" y1="10" x2="22" y2="10" stroke="#334155" strokeWidth="0.9" />
        <line x1="2" y1="14" x2="22" y2="14" stroke="#334155" strokeWidth="0.9" />
        <rect x="22" y="2" width="4" height="15" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
        <rect x="6" y="-4" width="10" height="4" rx="1" fill="#1e293b" stroke="#64748b" strokeWidth="0.8" />
      </g>

      {/* Air Inlet Intake Filter / Silencer Hood */}
      <g id={`blower-intake-${id}`} transform="translate(6, -6)">
        <rect x="0" y="0" width="16" height="10" rx="2" fill="#0f172a" stroke="#64748b" strokeWidth="1.1" />
        <line x1="2" y1="3" x2="14" y2="3" stroke="#94a3b8" strokeWidth="0.8" />
        <line x1="2" y1="5.5" x2="14" y2="5.5" stroke="#94a3b8" strokeWidth="0.8" />
        <line x1="2" y1="8" x2="14" y2="8" stroke="#94a3b8" strokeWidth="0.8" />
        <line x1="-1" y1="10" x2="17" y2="10" stroke="#475569" strokeWidth="1.5" />
      </g>

      {/* Cylindrical Rotary Lobe Blower Housing */}
      <circle
        cx="14"
        cy="16"
        r="16"
        fill="#071b30"
        stroke={statusColor}
        strokeWidth="2.4"
        filter="drop-shadow(0 4px 8px rgba(0,0,0,0.65))"
      />
      <circle cx="14" cy="16" r="13" fill="#0c233c" stroke="#0369a1" strokeWidth="1" />
      <ellipse cx="14" cy="9" rx="9" ry="3" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.7" />

      {/* Discharge Outlet Flange (Compressed Air Header Port) */}
      <rect x="10" y="27" width="8" height="4" rx="1" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
      <line x1="7" y1="31" x2="21" y2="31" stroke={statusColor} strokeWidth="2.2" />

      {/* Spinning Aeration Turbine Runner (dur="0.8s" strictly in-place rotation) */}
      <g transform="translate(14, 16)">
        <g className={isRunning && !isFaulted ? 'blower-spin' : undefined}>
          {isRunning && !isFaulted && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to="360"
              dur="0.8s"
              repeatCount="indefinite"
            />
          )}
          {/* 4 Curved Aerodynamic Turbine Runner Vanes */}
          <path d="M 0 0 C 3 -3, 8 -3, 8 -7" fill="none" stroke={statusColor} strokeWidth="2" strokeLinecap="round" />
          <path d="M 0 0 C -3 3, -8 3, -8 7" fill="none" stroke={statusColor} strokeWidth="2" strokeLinecap="round" />
          <path d="M 0 0 C 3 3, 3 8, 7 8" fill="none" stroke={statusColor} strokeWidth="2" strokeLinecap="round" />
          <path d="M 0 0 C -3 -3, -3 -8, -7 -8" fill="none" stroke={statusColor} strokeWidth="2" strokeLinecap="round" />
          {/* Secondary Vane Ribs */}
          <path d="M 0 0 C 5 -1, 8 -1, 8 -2" fill="none" stroke={statusColor} strokeWidth="1.2" strokeLinecap="round" opacity={0.7} />
          <path d="M 0 0 C -5 1, -8 1, -8 2" fill="none" stroke={statusColor} strokeWidth="1.2" strokeLinecap="round" opacity={0.7} />
          <path d="M 0 0 C 1 5, 1 8, 2 8" fill="none" stroke={statusColor} strokeWidth="1.2" strokeLinecap="round" opacity={0.7} />
          <path d="M 0 0 C -1 -5, -1 -8, -2 -8" fill="none" stroke={statusColor} strokeWidth="1.2" strokeLinecap="round" opacity={0.7} />
          {/* Central Rotor Hub */}
          <circle cx="0" cy="0" r="3.5" fill="#0f172a" stroke={statusColor} strokeWidth="1.4" />
          <circle cx="0" cy="0" r="1.5" fill={statusColor} />
        </g>
      </g>

      {/* Equipment Tag Labels */}
      <text
        x="24"
        y="49"
        textAnchor="middle"
        fill={statusColor}
        fontSize="8.5"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {tag}
      </text>
      <text
        x="24"
        y="58"
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="7"
        fontFamily="sans-serif"
        fontWeight="600"
      >
        {name}
      </text>
    </g>
  );
};

/* ========================================================================= */
/* 3. SCADA SENSOR CALLOUT PIN (CONCENTRIC RETICLE TARGET)                    */
/* ========================================================================= */

export interface ScadaSensorCalloutPinProps {
  x: number;
  y: number;
  pinHeight?: number;
  tag: string;
  name: string;
  value: number | string;
  unit?: string;
  status?: 'nominal' | 'warning' | 'alarm' | 'stale';
  textSide?: 'left' | 'right' | 'top';
  color?: string;
}

export const ScadaSensorCalloutPin: React.FC<ScadaSensorCalloutPinProps> = ({
  x,
  y,
  pinHeight = 36,
  tag,
  name,
  value,
  unit = '',
  status = 'nominal',
  textSide = 'right',
  color = '#38bdf8',
}) => {
  const pinColor =
    status === 'alarm'
      ? '#ef4444'
      : status === 'warning'
      ? '#f59e0b'
      : status === 'stale'
      ? '#94a3b8'
      : color;

  const displayVal =
    typeof value === 'number'
      ? Number.isInteger(value)
        ? value.toLocaleString()
        : value.toFixed(1)
      : value;

  const isLeft = textSide === 'left';
  const textX = isLeft ? -14 : 14;
  const textAnchor = isLeft ? 'end' : 'start';

  return (
    <g transform={`translate(${x}, ${y})`} className="scada-sensor-callout select-none">
      {/* Vertical Pin Connecting Line to Liquid Insertion Target */}
      <line
        x1="0"
        y1="0"
        x2="0"
        y2={pinHeight}
        stroke={pinColor}
        strokeWidth="1.4"
        strokeDasharray="2.5 2"
        opacity="0.85"
      />
      {/* Target Insertion Point Circle */}
      <circle cx="0" cy={pinHeight} r="2.8" fill={pinColor} />

      {/* Target Reticle Outer Pulse Ring */}
      <circle cx="0" cy="0" r="9" fill="none" stroke={pinColor} strokeWidth="1" opacity="0.6">
        <animate attributeName="r" values="6;12;6" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0.15;0.8" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* Target Reticle Circular Base */}
      <circle cx="0" cy="0" r="6.5" fill="#090d16" stroke={pinColor} strokeWidth="1.6" />
      <circle cx="0" cy="0" r="2.2" fill={pinColor} />

      {/* Callout Info Badge (Name, Value, Tag) */}
      <g transform={`translate(${textX}, -10)`}>
        {/* Metric Name */}
        <text
          x="0"
          y="0"
          textAnchor={textAnchor}
          fill="#94a3b8"
          fontSize="9.5"
          fontFamily="sans-serif"
          fontWeight="500"
        >
          {name}
        </text>

        {/* Metric Value + Unit */}
        <text
          x="0"
          y="11.5"
          textAnchor={textAnchor}
          fill="#f8fafc"
          fontSize="11.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          {displayVal}
          {unit && (
            <tspan fill="#94a3b8" fontSize="8.5" fontWeight="normal" dx="3">
              {unit}
            </tspan>
          )}
        </text>

        {/* Instrument Tag */}
        <text
          x="0"
          y="22"
          textAnchor={textAnchor}
          fill={pinColor}
          fontSize="8.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          {tag}
        </text>
      </g>
    </g>
  );
};

/* ========================================================================= */
/* 4. SCADA FLOATING TELEMETRY CARD (ENHANCED DIMENSIONS: NO OVERLAP)         */
/* ========================================================================= */

export interface TelemetryMetricItem {
  label: string;
  value: number | string;
  unit?: string;
  status?: 'nominal' | 'warning' | 'alarm' | 'stale';
  dotColor?: string;
}

export interface ScadaFloatingCardProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  stageNumber?: number;
  title: string;
  status?: 'nominal' | 'warning' | 'alarm' | 'stale';
  isSelected?: boolean;
  metrics: TelemetryMetricItem[];
}

export const ScadaFloatingCard: React.FC<ScadaFloatingCardProps> = ({
  x,
  y,
  width = 214,
  height = 96,
  title,
  status = 'nominal',
  isSelected = false,
  metrics,
}) => {
  const badgeColor =
    status === 'alarm'
      ? '#ef4444'
      : status === 'warning'
      ? '#f59e0b'
      : status === 'stale'
      ? '#94a3b8'
      : '#10b981';

  const badgeBg =
    status === 'alarm'
      ? 'rgba(239, 68, 68, 0.22)'
      : status === 'warning'
      ? 'rgba(245, 158, 11, 0.22)'
      : status === 'stale'
      ? 'rgba(148, 163, 184, 0.18)'
      : 'rgba(16, 185, 129, 0.18)';

  const cardStroke = isSelected
    ? '#f59e0b'
    : status === 'alarm'
    ? '#ef4444'
    : status === 'warning'
    ? '#f59e0b'
    : '#1e293b';

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={`scada-floating-card select-none ${isSelected ? 'selection-amber-glow' : ''}`}
    >
      {/* Background Container matching dark glassmorphism */}
      <rect
        width={width}
        height={height}
        rx="8"
        fill="#070e1b"
        fillOpacity="0.96"
        stroke={cardStroke}
        strokeWidth={isSelected ? 2.2 : 1.2}
        filter="drop-shadow(0 4px 14px rgba(0,0,0,0.65))"
      />

      {/* Top Header Row: Stage Title (Crisp, ample clearance from status pill) */}
      <text
        x="10"
        y="19"
        fill={isSelected ? '#fbbf24' : '#f1f5f9'}
        fontSize="8.8"
        fontFamily="sans-serif"
        fontWeight="bold"
        letterSpacing="0.2px"
      >
        {title}
      </text>

      {/* Status Pill Badge (Top Right - Guaranteed zero overlap) */}
      <g transform={`translate(${width - 48}, 8)`}>
        <rect
          width="40"
          height="14"
          rx="3.5"
          fill={badgeBg}
          stroke={badgeColor}
          strokeWidth="0.8"
        />
        <circle cx="6.5" cy="7" r="2.2" fill={badgeColor} />
        <text
          x="23"
          y="10.5"
          textAnchor="middle"
          fill={badgeColor}
          fontSize="7"
          fontFamily="monospace"
          fontWeight="bold"
        >
          {status === 'nominal' ? 'NORMAL' : status.toUpperCase()}
        </text>
      </g>

      {/* Separator Line */}
      <line x1="10" y1="28" x2={width - 10} y2="28" stroke="#1e293b" strokeWidth="0.8" opacity="0.8" />

      {/* Metric Rows */}
      {metrics.map((m, idx) => {
        const rowY = 46 + idx * 17;
        const dotCol =
          m.dotColor ||
          (m.status === 'alarm'
            ? '#ef4444'
            : m.status === 'warning'
            ? '#f59e0b'
            : m.status === 'stale'
            ? '#94a3b8'
            : '#10b981');

        const formattedVal =
          typeof m.value === 'number'
            ? Number.isInteger(m.value)
              ? m.value.toLocaleString()
              : m.value.toFixed(1)
            : m.value;

        return (
          <g key={idx} transform={`translate(12, ${rowY})`}>
            {/* Status Indicator Dot */}
            <circle cx="3" cy="-3" r="2.5" fill={dotCol} />

            {/* Label */}
            <text
              x="12"
              y="0"
              fill="#94a3b8"
              fontSize="9"
              fontFamily="sans-serif"
              fontWeight="500"
            >
              {m.label}
            </text>

            {/* Right-aligned Value + Unit (Ample breathing room) */}
            <text
              x={width - 24}
              y="0"
              textAnchor="end"
              fill="#f8fafc"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {formattedVal}
              {m.unit && (
                <tspan fill="#94a3b8" fontSize="8" fontWeight="normal" dx="3">
                  {m.unit}
                </tspan>
              )}
            </text>
          </g>
        );
      })}
    </g>
  );
};

/* ========================================================================= */
/* ========================================================================= */
/* 5. SCADA LEGEND COMPONENT (EXPANDED TO 490PX FOR ALL 5 PROCESS STREAMS)   */
/* ========================================================================= */

export interface ScadaLegendProps {
  x: number;
  y: number;
}

export const ScadaLegend: React.FC<ScadaLegendProps> = ({ x, y }) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="scada-legend select-none">
      {/* Legend Container */}
      <rect
        x="0"
        y="0"
        width="490"
        height="22"
        rx="4"
        fill="#090d16"
        fillOpacity="0.88"
        stroke="#1e293b"
        strokeWidth="1"
      />

      {/* 1. Main Process Flow (Cyan) */}
      <g transform="translate(10, 11)">
        <line x1="0" y1="0" x2="16" y2="0" stroke="#38bdf8" strokeWidth="3" />
        <text x="22" y="3" fill="#cbd5e1" fontSize="7.5" fontFamily="sans-serif" fontWeight="500">
          Main Process Flow
        </text>
      </g>

      {/* 2. RAS Recycle (Amber) */}
      <g transform="translate(122, 11)">
        <line x1="0" y1="0" x2="16" y2="0" stroke="#f59e0b" strokeWidth="3" />
        <text x="22" y="3" fill="#cbd5e1" fontSize="7.5" fontFamily="sans-serif" fontWeight="500">
          RAS Recycle
        </text>
      </g>

      {/* 3. WAS Purge (Brown) */}
      <g transform="translate(202, 11)">
        <line x1="0" y1="0" x2="16" y2="0" stroke="#d97706" strokeWidth="3" />
        <text x="22" y="3" fill="#cbd5e1" fontSize="7.5" fontFamily="sans-serif" fontWeight="500">
          WAS Purge
        </text>
      </g>

      {/* 4. UV Disinfection (Purple) */}
      <g transform="translate(282, 11)">
        <line x1="0" y1="0" x2="16" y2="0" stroke="#c084fc" strokeWidth="3" />
        <text x="22" y="3" fill="#cbd5e1" fontSize="7.5" fontFamily="sans-serif" fontWeight="500">
          UV Disinfection
        </text>
      </g>

      {/* 5. Air Header (Light Grey) */}
      <g transform="translate(382, 11)">
        <line x1="0" y1="0" x2="16" y2="0" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="3 2" />
        <text x="22" y="3" fill="#cbd5e1" fontSize="7.5" fontFamily="sans-serif" fontWeight="500">
          Air Header
        </text>
      </g>
    </g>
  );
};

/* ========================================================================= */
/* 6. SCADA TERMINAL STATION (DEWATERING, INLET, OUTFALL TERMINALS)          */
/* ========================================================================= */

export interface ScadaTerminalStationProps {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  tag: string;
  title?: string;
  name?: string;
  subtitle?: string;
  subtext?: string;
  variant: 'solids' | 'outfall' | 'inlet' | 'sludge';
  status?: 'nominal' | 'warning' | 'alarm' | 'stale';
  isAnimated?: boolean;
  onClick?: () => void;
}

export const ScadaTerminalStation: React.FC<ScadaTerminalStationProps> = ({
  id,
  x,
  y,
  width = 108,
  height = 52,
  tag,
  title,
  name,
  subtitle,
  subtext,
  variant,
  status = 'nominal',
  isAnimated = true,
  onClick,
}) => {
  const stationTitle = title || name || tag;
  const stationSubtitle = subtitle || subtext || '';
  const actualVariant = variant === 'sludge' ? 'solids' : variant;

  const variantStroke =
    actualVariant === 'solids'
      ? '#b45309'
      : actualVariant === 'outfall'
      ? '#06b6d4'
      : '#0284c7';

  const isAlarm = status === 'alarm';
  const isWarning = status === 'warning';

  const badgeText = isAlarm
    ? 'ALARM'
    : isWarning
    ? 'WARN'
    : actualVariant === 'outfall'
    ? 'COMPLIANT'
    : 'ONLINE';

  const badgeColor = isAlarm
    ? '#ef4444'
    : isWarning
    ? '#f59e0b'
    : actualVariant === 'outfall'
    ? '#06b6d4'
    : '#10b981';

  const badgeBg = isAlarm
    ? 'rgba(239, 68, 68, 0.22)'
    : isWarning
    ? 'rgba(245, 158, 11, 0.22)'
    : actualVariant === 'outfall'
    ? 'rgba(6, 182, 212, 0.18)'
    : 'rgba(16, 185, 129, 0.18)';

  const pillWidth = badgeText.length > 7 ? 50 : badgeText.length > 5 ? 44 : 36;
  const bevel = 5;
  const beveledPath = `M 0 ${bevel} L ${bevel} 0 L ${width - bevel} 0 L ${width} ${bevel} L ${width} ${height - bevel} L ${width - bevel} ${height} L ${bevel} ${height} L 0 ${height - bevel} Z`;

  // Terminal connection flange / pipe port location
  // Inlet: discharged to right; Outfall: received from left; Solids: received from right
  const isRightPort = actualVariant === 'inlet' || actualVariant === 'solids';
  const portX = isRightPort ? width : 0;
  const portY = height / 2;
  const flangeX = isRightPort ? width - 2 : -4;

  const titleFontSize = stationTitle.length > 22 ? 7.2 : stationTitle.length > 17 ? 7.8 : 8.5;

  return (
    <g
      id={`terminal-${id}`}
      transform={`translate(${x}, ${y})`}
      className="scada-terminal-station cursor-pointer select-none transition-[filter] duration-200 hover:brightness-110"
      onClick={onClick}
    >
      {/* Ground Contact Shadow */}
      <ellipse cx={width / 2} cy={height + 2} rx={width / 2 - 6} ry={3} fill="#020617" opacity="0.6" />

      {/* Dark Technical Beveled Enclosure */}
      <path
        d={beveledPath}
        fill="#070e1b"
        fillOpacity={0.96}
        stroke={variantStroke}
        strokeWidth={1.5}
        filter="drop-shadow(0 4px 10px rgba(0,0,0,0.65))"
      />

      {/* Top Bevel Highlight Line */}
      <line
        x1={bevel + 2}
        y1={2}
        x2={width - bevel - 2}
        y2={2}
        stroke={variantStroke}
        strokeWidth={0.8}
        opacity={0.4}
      />

      {/* Engineering Tag (Bold Monospace) */}
      <text
        x="8"
        y="13.5"
        fill={variantStroke}
        fontSize="8"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {tag}
      </text>

      {/* Status Badge Pill (Zero overlap with tag or title) */}
      <g transform={`translate(${width - pillWidth - 6}, 5)`}>
        <rect
          width={pillWidth}
          height={11}
          rx={3}
          fill={badgeBg}
          stroke={badgeColor}
          strokeWidth={0.7}
        />
        <circle cx={4.5} cy={5.5} r={1.8} fill={badgeColor} />
        <text
          x={pillWidth / 2 + 2}
          y={8}
          textAnchor="middle"
          fill={badgeColor}
          fontSize="6.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          {badgeText}
        </text>
      </g>

      {/* Horizontal Divider Line */}
      <line x1={6} y1={19} x2={width - 6} y2={19} stroke="#1e293b" strokeWidth={0.8} opacity={0.8} />

      {/* Title (Clean typography with zero clipping) */}
      <text
        x="8"
        y="31"
        fill="#f8fafc"
        fontSize={titleFontSize}
        fontFamily="sans-serif"
        fontWeight="bold"
        letterSpacing="0.1px"
      >
        {stationTitle}
      </text>

      {/* Subtitle */}
      <text
        x="8"
        y="42.5"
        fill="#94a3b8"
        fontSize="7"
        fontFamily="sans-serif"
        fontWeight="500"
      >
        {stationSubtitle}
      </text>

      {/* Terminal Connection Flange & Pipe Port with Animated Subtle Pulse */}
      <g id={`terminal-port-${id}`}>
        <rect
          x={flangeX}
          y={portY - 6}
          width={6}
          height={12}
          rx={1}
          fill="#1e293b"
          stroke={variantStroke}
          strokeWidth={1}
        />
        <line
          x1={isRightPort ? width + 4 : -4}
          y1={portY - 6}
          x2={isRightPort ? width + 4 : -4}
          y2={portY + 6}
          stroke={variantStroke}
          strokeWidth={1.6}
        />
        {isAnimated && (
          <circle cx={portX} cy={portY} r={3} fill="none" stroke={variantStroke} strokeWidth={1} opacity={0.8}>
            <animate attributeName="r" values="3;8;3" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.85;0.15;0.85" dur="2.2s" repeatCount="indefinite" />
          </circle>
        )}
        <circle cx={portX} cy={portY} r={2.4} fill={variantStroke} />
      </g>
    </g>
  );
};

/* ========================================================================= */
/* 6. BACKWARD COMPATIBLE EXPORTS                                            */
/* ========================================================================= */

export interface ScadaInstrumentCardProps {
  x: number;
  y: number;
  width?: number;
  tag: string;
  label: string;
  value: number | string;
  unit: string;
  status?: 'nominal' | 'warning' | 'alarm' | 'stale';
  provenance?: 'OBSERVED' | 'SIMULATED' | 'DERIVED';
  sparklinePoints?: number[];
  normNote?: string;
}

export const ScadaInstrumentCard: React.FC<ScadaInstrumentCardProps> = ({
  x,
  y,
  width = 142,
  tag,
  label,
  value,
  unit,
  status = 'nominal',
  sparklinePoints = [30, 32, 28, 35, 33, 38, 34, 37],
}) => {
  const statusColor =
    status === 'alarm'
      ? '#ef4444'
      : status === 'warning'
      ? '#f59e0b'
      : status === 'stale'
      ? '#94a3b8'
      : '#34d399';

  const statusBg =
    status === 'alarm'
      ? 'rgba(239, 68, 68, 0.15)'
      : status === 'warning'
      ? 'rgba(245, 158, 11, 0.15)'
      : 'rgba(52, 211, 153, 0.12)';

  const sparkHeight = 12;
  const sparkWidth = 40;
  const minVal = Math.min(...sparklinePoints);
  const maxVal = Math.max(...sparklinePoints);
  const range = maxVal - minVal || 1;
  const pathD = sparklinePoints
    .map((pt, idx) => {
      const px = (idx / (sparklinePoints.length - 1)) * sparkWidth;
      const py = sparkHeight - ((pt - minVal) / range) * sparkHeight;
      return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(' ');

  return (
    <g transform={`translate(${x}, ${y})`} className="scada-instrument-card select-none">
      <rect
        width={width}
        height="56"
        rx="5"
        fill="#020617"
        fillOpacity="0.88"
        stroke="#1e293b"
        strokeWidth="1.2"
      />
      <line x1="0" y1="18" x2={width} y2="18" stroke="#1e293b" strokeWidth="1" />
      <text x="8" y="13" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">
        {tag}
      </text>
      <rect x={width - 48} y="4" width="40" height="11" rx="2" fill={statusBg} stroke={statusColor} strokeWidth="0.6" />
      <text
        x={width - 28}
        y="12"
        textAnchor="middle"
        fill={statusColor}
        fontSize="6.5"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {status.toUpperCase()}
      </text>
      <text x="8" y="32" fill="#cbd5e1" fontSize="8" fontFamily="sans-serif">
        {label}
      </text>
      <text x="8" y="47" fill="#f8fafc" fontSize="13" fontFamily="monospace" fontWeight="bold">
        {typeof value === 'number' ? value.toFixed(1) : value}
        <tspan fill="#94a3b8" fontSize="8.5" fontWeight="normal" dx="3">
          {unit}
        </tspan>
      </text>
      <g transform={`translate(${width - 48}, 30)`}>
        <path d={pathD} fill="none" stroke={statusColor} strokeWidth="1.2" strokeLinecap="round" opacity={0.8} />
      </g>
    </g>
  );
};

export interface ScadaSensorTapProps {
  x: number;
  y: number;
  tag: string;
  isActive?: boolean;
  color?: string;
}

export const ScadaSensorTap: React.FC<ScadaSensorTapProps> = ({
  x,
  y,
  tag,
  isActive = true,
  color = '#38bdf8',
}) => {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {isActive && (
        <circle cx="0" cy="0" r="9" fill="none" stroke={color} strokeWidth="1" opacity="0.6">
          <animate attributeName="r" values="4;12" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx="0" cy="0" r="4.5" fill="#0f172a" stroke={color} strokeWidth="1.5" />
      <circle cx="0" cy="0" r="2" fill={color} />
      <text x="0" y="12" textAnchor="middle" fill={color} fontSize="6.5" fontFamily="monospace" fontWeight="bold">
        {tag}
      </text>
    </g>
  );
};
