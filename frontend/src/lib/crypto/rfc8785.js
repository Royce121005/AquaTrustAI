/**
 * RFC 8785: JSON Canonicalization Scheme (JCS) & SHA-256 Digest Implementation
 * Guarantees cryptographic determinism across distributed nodes, edge gateways,
 * and Hyperledger Fabric smart contracts.
 */

/**
 * Recursively canonicalize any JavaScript object or primitive according to RFC 8785.
 * - Object property keys are sorted lexicographically by UTF-16 code units.
 * - Whitespace is completely omitted.
 * - Number formatting strictly conforms to IEEE 754-2008 / ECMAScript JSON standards.
 * - Unicode strings are strictly serialized with required escapes.
 */
export function canonicalize(val) {
  if (val === null || val === undefined) {
    return 'null'
  }

  const type = typeof val

  if (type === 'boolean' || type === 'number') {
    return JSON.stringify(val)
  }

  if (type === 'string') {
    return JSON.stringify(val)
  }

  if (Array.isArray(val)) {
    const serializedElements = val.map((item) => {
      const res = canonicalize(item)
      return res === undefined ? 'null' : res
    })
    return `[${serializedElements.join(',')}]`
  }

  if (type === 'object') {
    // Sort keys strictly by UTF-16 code unit values
    const sortedKeys = Object.keys(val).sort()
    const entries = []

    for (const key of sortedKeys) {
      const propVal = val[key]
      if (propVal !== undefined && typeof propVal !== 'function' && typeof propVal !== 'symbol') {
        const serializedProp = canonicalize(propVal)
        if (serializedProp !== undefined) {
          entries.push(`${JSON.stringify(key)}:${serializedProp}`)
        }
      }
    }
    return `{${entries.join(',')}}`
  }

  return undefined
}

/**
 * Fast synchronous SHA-256 implementation ensuring deterministic hashes
 * in any JavaScript environment (Browser, Web Worker, Node.js, Vitest).
 */
export function sha256Sync(message) {
  const msg = typeof message === 'string' ? new TextEncoder().encode(message) : message
  
  // SHA-256 Constants
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]

  let H0 = 0x6a09e667
  let H1 = 0xbb67ae85
  let H2 = 0x3c6ef372
  let H3 = 0xa54ff53a
  let H4 = 0x510e527f
  let H5 = 0x9b05688c
  let H6 = 0x1f83d9ab
  let H7 = 0x5be0cd19

  // Pre-processing (Padding)
  const l = msg.length
  const bitLen = l * 8
  const padLen = (l % 64 < 56) ? (56 - (l % 64)) : (120 - (l % 64))
  const padded = new Uint8Array(l + padLen + 8)
  padded.set(msg)
  padded[l] = 0x80

  const view = new DataView(padded.buffer)
  // Store 64-bit integer length at the end in big-endian
  view.setUint32(padded.length - 4, bitLen >>> 0, false)
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false)

  const W = new Uint32Array(64)

  // Process message in 512-bit (64-byte) chunks
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(offset + (t * 4), false)
    }
    for (let t = 16; t < 64; t++) {
      const s0 = (rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3)) >>> 0
      const s1 = (rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10)) >>> 0
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7

    for (let t = 0; t < 64; t++) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0
      const ch = ((e & f) ^ (~e & g)) >>> 0
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0
      const temp2 = (S0 + maj) >>> 0

      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    H0 = (H0 + a) >>> 0
    H1 = (H1 + b) >>> 0
    H2 = (H2 + c) >>> 0
    H3 = (H3 + d) >>> 0
    H4 = (H4 + e) >>> 0
    H5 = (H5 + f) >>> 0
    H6 = (H6 + g) >>> 0
    H7 = (H7 + h) >>> 0
  }

  function rotr(x, n) {
    return ((x >>> n) | (x << (32 - n))) >>> 0
  }

  const hexParts = [H0, H1, H2, H3, H4, H5, H6, H7].map((num) =>
    num.toString(16).padStart(8, '0')
  )
  return hexParts.join('')
}

/**
 * Hash canonical representation of any JSON-compatible payload into a SHA-256 hex string.
 */
export function hashCanonicalPayload(data) {
  const canonicalString = canonicalize(data)
  return sha256Sync(canonicalString)
}
