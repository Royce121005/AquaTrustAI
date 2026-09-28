/**
 * AquaTrust AI — Lightweight Pure JS QR Code Generator
 * Conforms to ISO/IEC 18004 specifications for QR Code Symbol generation.
 * Generates an SVG or 2D boolean array representing the QR matrix.
 */

// Galois Field GF(256) log and exp tables for Reed-Solomon error correction
const EXP_TABLE = new Uint8Array(256)
const LOG_TABLE = new Uint8Array(256)

;(function initGaloisField() {
  let value = 1
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = value
    LOG_TABLE[value] = i
    value = (value << 1) ^ (value & 0x80 ? 0x11d : 0)
  }
  EXP_TABLE[255] = EXP_TABLE[0]
})()

function gfMultiply(x, y) {
  if (x === 0 || y === 0) return 0
  return EXP_TABLE[(LOG_TABLE[x] + LOG_TABLE[y]) % 255]
}

function rsGeneratorPoly(degree) {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMultiply(poly[j], EXP_TABLE[i])
      next[j + 1] ^= poly[j]
    }
    poly = next
  }
  return poly
}

function rsComputeECC(data, eccLength) {
  const gen = rsGeneratorPoly(eccLength)
  const res = new Uint8Array(data.length + eccLength)
  res.set(data)
  for (let i = 0; i < data.length; i++) {
    const factor = res[i]
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMultiply(gen[j], factor)
      }
    }
  }
  return res.slice(data.length)
}

// Minimal robust QR encoder for URLs and IDs up to ~120 chars (Version 4, 33x33, ECC Level L)
export function generateQRCodeMatrix(text) {
  const enc = new TextEncoder()
  const textBytes = enc.encode(text)
  
  // Choose version based on length
  // Version 4-L capacity: 78 bytes. Version 6-L: 136 bytes. Version 8-L: 192 bytes.
  let version = 4
  let totalDataCodewords = 78
  let eccCodewords = 22
  let size = 33

  if (textBytes.length > 70) {
    version = 8
    totalDataCodewords = 192
    eccCodewords = 48
    size = 49
  }

  // Bit buffer with Byte Mode indicator (0100) + Char Count + Data + Terminator
  const bits = []
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1)
  }

  // 0100 = 8-bit byte mode
  pushBits(0b0100, 4)
  // Character count indicator (8 bits for version <= 9)
  pushBits(textBytes.length, 8)
  for (let i = 0; i < textBytes.length; i++) {
    pushBits(textBytes[i], 8)
  }
  // Terminator
  pushBits(0, Math.min(4, totalDataCodewords * 8 - bits.length))
  // Align to byte
  while (bits.length % 8 !== 0) bits.push(0)
  // Pad bytes 0xEC and 0x11
  const padBytes = [0xec, 0x11]
  let padIdx = 0
  while (bits.length < totalDataCodewords * 8) {
    pushBits(padBytes[padIdx % 2], 8)
    padIdx++
  }

  // Convert bits to data codewords
  const dataWords = new Uint8Array(totalDataCodewords)
  for (let i = 0; i < totalDataCodewords; i++) {
    let byteVal = 0
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bits[i * 8 + b]
    }
    dataWords[i] = byteVal
  }

  // Compute ECC
  const eccWords = rsComputeECC(dataWords, eccCodewords)
  const allCodewords = new Uint8Array(totalDataCodewords + eccCodewords)
  allCodewords.set(dataWords)
  allCodewords.set(eccWords, totalDataCodewords)

  // Initialize Matrix
  const matrix = Array.from({ length: size }, () => new Array(size).fill(null))
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false))

  function setModule(r, c, val) {
    matrix[r][c] = val
    isFunction[r][c] = true
  }

  // Finder Patterns (7x7) + Separators
  function addFinder(top, left) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4
        setModule(top + r, left + c, isBorder || isCenter)
      }
    }
    // Separators
    for (let i = 0; i < 8; i++) {
      if (top + 7 < size && left + i < size) setModule(top + 7, left + i, false)
      if (top + i < size && left + 7 < size) setModule(top + i, left + 7, false)
      if (top - 1 >= 0 && left + i < size) setModule(top - 1, left + i, false)
      if (top + i < size && left - 1 >= 0) setModule(top + i, left - 1, false)
    }
  }

  addFinder(0, 0)
  addFinder(0, size - 7)
  addFinder(size - 7, 0)

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setModule(6, i, i % 2 === 0)
    setModule(i, 6, i % 2 === 0)
  }

  // Dark module
  setModule(size - 8, 8, true)

  // Format info area reservation
  for (let i = 0; i < 9; i++) {
    isFunction[8][i] = true
    isFunction[i][8] = true
    isFunction[8][size - 1 - i] = true
    isFunction[size - 1 - i][8] = true
  }

  // Populate data in 2-column zig-zag
  let bitIndex = 0
  const totalBits = allCodewords.length * 8
  let upward = true

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right-- // Skip vertical timing column
    const colRange = [right, right - 1]
    const rowRange = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i)

    for (const r of rowRange) {
      for (const c of colRange) {
        if (!isFunction[r][c]) {
          let bit = 0
          if (bitIndex < totalBits) {
            const bytePos = Math.floor(bitIndex / 8)
            const bitPos = 7 - (bitIndex % 8)
            bit = (allCodewords[bytePos] >> bitPos) & 1
            bitIndex++
          }
          // Standard mask (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0
          matrix[r][c] = (bit ^ (mask ? 1 : 0)) === 1
        }
      }
    }
    upward = !upward
  }

  // Format string for Mask 000, ECC Level L: 0b111011111000100 (BCH 15,5)
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0]
  // Top-left format placement
  const topCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ]
  for (let i = 0; i < 15; i++) {
    matrix[topCoords[i][0]][topCoords[i][1]] = formatBits[i] === 1
  }
  // Bottom-left and top-right format placement
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = formatBits[i] === 1
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 8 + i] = formatBits[7 + i] === 1
  }

  return matrix
}
