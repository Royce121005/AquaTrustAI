import { useEffect, useState } from 'react'

export default function useAsyncData(fetcher) {
  const [status, setStatus] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true

    fetcher()
      .then((result) => {
        if (!active) return
        setData(result)
        setStatus('success')
      })
      .catch((err) => {
        if (!active) return
        setError(err)
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [fetcher, tick])

  const reload = () => {
    setStatus('loading')
    setError(null)
    setTick((value) => value + 1)
  }

  return { status, data, error, reload }
}
