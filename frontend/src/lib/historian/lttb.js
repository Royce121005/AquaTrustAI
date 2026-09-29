/**
 * Largest-Triangle-Three-Buckets (LTTB) Downsampling Algorithm
 * Downsamples time-series data while preserving visual peaks, valleys, and trends.
 * Conforms to Sven Steinarsson's LTTB specification.
 */

export function lttbDownsample(data, threshold) {
  if (!data || data.length <= threshold || threshold <= 2) {
    return data
  }

  const sampled = []
  let sampledIndex = 0

  // Bucket size. Leave room for start and end data points
  const every = (data.length - 2) / (threshold - 2)

  let a = 0 // Initially point a is the first point in the work array
  let maxAreaPoint = null
  let maxArea = 0
  let area = 0
  let nextA = 0

  sampled[sampledIndex++] = data[a] // Always add the first point

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket (c)
    let avgX = 0
    let avgY = 0
    let avgRangeStart = Math.floor((i + 1) * every) + 1
    let avgRangeEnd = Math.floor((i + 2) * every) + 1
    avgRangeEnd = avgRangeEnd < data.length ? avgRangeEnd : data.length

    const avgRangeLength = avgRangeEnd - avgRangeStart

    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += j // Use index as x-coordinate
      avgY += (data[j].value !== null && !isNaN(data[j].value)) ? Number(data[j].value) : 0
    }
    avgX /= (avgRangeLength || 1)
    avgY /= (avgRangeLength || 1)

    // Get the range for this bucket (b)
    let rangeOffs = Math.floor(i * every) + 1
    let rangeTo = Math.floor((i + 1) * every) + 1

    // Point a
    const pointAX = a
    const pointAY = (data[a].value !== null && !isNaN(data[a].value)) ? Number(data[a].value) : 0

    maxArea = -1
    maxAreaPoint = null

    for (let j = rangeOffs; j < rangeTo; j++) {
      const val = (data[j].value !== null && !isNaN(data[j].value)) ? Number(data[j].value) : 0
      // Calculate triangle area over points a, b and avg c
      area = Math.abs(
        (pointAX - avgX) * (val - pointAY) -
        (pointAX - j) * (avgY - pointAY)
      ) * 0.5

      if (area > maxArea) {
        maxArea = area
        maxAreaPoint = data[j]
        nextA = j // Next a is this b
      }
    }

    if (maxAreaPoint) {
      sampled[sampledIndex++] = maxAreaPoint
    }
    a = nextA
  }

  // Always add the last point
  sampled[sampledIndex++] = data[data.length - 1]

  return sampled
}

/**
 * Client-side time-series bucketing: 'raw' | '15m' | '1h'
 */
export function bucketTimeSeries(points, bucketType = 'raw') {
  if (bucketType === 'raw' || !points || points.length === 0) {
    return points
  }

  const bucketMs = bucketType === '15m' ? 15 * 60 * 1000 : 60 * 60 * 1000
  const groups = new Map()

  points.forEach((pt) => {
    const t = new Date(pt.timestamp).getTime()
    const bucketTime = Math.floor(t / bucketMs) * bucketMs
    if (!groups.has(bucketTime)) {
      groups.set(bucketTime, [])
    }
    if (pt.value !== null && !isNaN(pt.value)) {
      groups.get(bucketTime).push(pt.value)
    }
  })

  const bucketed = []
  groups.forEach((values, bTime) => {
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null
    bucketed.push({
      timestamp: new Date(bTime).toISOString(),
      value: avg !== null ? Number(avg.toFixed(2)) : null,
    })
  })

  return bucketed.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}
