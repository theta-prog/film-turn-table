import { useState, useEffect, useCallback } from 'react'

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enable = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      setStream(s)
      setEnabled(true)
      setError(null)
    } catch {
      setError('カメラへのアクセスが許可されていません')
      setEnabled(false)
    }
  }, [])

  const disable = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setEnabled(false)
  }, [stream])

  const toggle = useCallback(async () => {
    if (enabled) {
      disable()
    } else {
      await enable()
    }
  }, [enabled, enable, disable])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [stream])

  return { stream, enabled, error, toggle }
}
