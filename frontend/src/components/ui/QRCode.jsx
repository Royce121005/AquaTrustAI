import { useMemo } from 'react'
import { generateQRCodeMatrix } from '../../utils/qrCodeGenerator.js'

/**
 * Pure SVG QR Code Component
 * Renders an exact SVG vector graphic without any external images or networks.
 */
export default function QRCode({ value, size = 128, className = '' }) {
  const matrix = useMemo(() => {
    if (!value) return null
    try {
      return generateQRCodeMatrix(value)
    } catch (err) {
      console.error('Failed to generate QR matrix:', err)
      return null
    }
  }, [value])

  if (!matrix) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-slate-100 text-[10px] text-slate-400 font-mono border border-slate-200 rounded ${className}`}
      >
        QR Unavailable
      </div>
    )
  }

  const dimension = matrix.length
  // Add a quiet zone border of 2 modules
  const margin = 2
  const viewBoxSize = dimension + margin * 2

  // Build SVG path data for dark modules for crisp vector rendering
  let path = ''
  for (let r = 0; r < dimension; r++) {
    for (let c = 0; c < dimension; c++) {
      if (matrix[r][c]) {
        const x = c + margin
        const y = r + margin
        path += `M${x},${y}h1v1h-1z `
      }
    }
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      className={`shape-rendering-crispEdges ${className}`}
      aria-label={`QR Code for ${value}`}
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
      <path d={path} fill="#0f172a" />
    </svg>
  )
}
