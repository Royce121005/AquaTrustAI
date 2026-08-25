// PROVISIONAL — pending backend contract

export const DEFAULT_DELAY_MS = 400

export function delay(ms = DEFAULT_DELAY_MS) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function respondWith(data, ms = DEFAULT_DELAY_MS) {
  await delay(ms)
  return structuredClone(data)
}
