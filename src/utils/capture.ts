import type { FilterType, LookSettings } from '../types'

const W = 1280
const H = 720
const VIDEO_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

interface StartVideoCaptureOptions {
  videoEl: HTMLVideoElement | null
  audioEl?: HTMLAudioElement | null
  getPhrase: () => string
  getLook: () => LookSettings
  fps?: number
}

interface RecordedVideo {
  dataUrl: string
  posterUrl: string
  durationMs: number
  mimeType: string
}

export interface VideoCaptureSession {
  stop: () => Promise<RecordedVideo>
  dispose: () => void
}

/** カメラ映像 or 仮想背景 + フィルタ + 歌詞をキャプチャして dataURL を返す */
export function captureFrame(
  videoEl: HTMLVideoElement | null,
  phrase: string,
  look: LookSettings,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  renderCaptureFrame(ctx, videoEl, phrase, look)

  return canvas.toDataURL('image/jpeg', 0.88)
}

export function startVideoCapture({
  videoEl,
  audioEl = null,
  getPhrase,
  getLook,
  fps = 30,
}: StartVideoCaptureOptions): VideoCaptureSession {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('このブラウザは動画録画に対応していません')
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('録画キャンバスを初期化できませんでした')
  }

  let rafId = 0
  let cleanedUp = false
  let stopPromise: Promise<RecordedVideo> | null = null

  const draw = () => {
    renderCaptureFrame(ctx, videoEl, getPhrase(), getLook())
    rafId = window.requestAnimationFrame(draw)
  }

  draw()

  const canvasStream = canvas.captureStream(fps)
  const mixedStream = new MediaStream()

  canvasStream.getVideoTracks().forEach(track => mixedStream.addTrack(track))
  getAudioTracks(audioEl).forEach(track => mixedStream.addTrack(track))

  const mimeType = pickVideoMimeType()
  const recorder = mimeType
    ? new MediaRecorder(mixedStream, {
        mimeType,
        videoBitsPerSecond: 6_000_000,
      })
    : new MediaRecorder(mixedStream, {
        videoBitsPerSecond: 6_000_000,
      })

  const chunks: BlobPart[] = []
  const startedAt = performance.now()

  recorder.addEventListener('dataavailable', event => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  })

  recorder.start(200)

  const cleanup = () => {
    if (cleanedUp) return
    cleanedUp = true
    if (rafId) window.cancelAnimationFrame(rafId)
    mixedStream.getTracks().forEach(track => track.stop())
    canvasStream.getTracks().forEach(track => track.stop())
  }

  return {
    stop: () => {
      if (stopPromise) return stopPromise

      stopPromise = new Promise<RecordedVideo>((resolve, reject) => {
        recorder.addEventListener(
          'stop',
          () => {
            cleanup()
            const blob = new Blob(chunks, {
              type: recorder.mimeType || mimeType || 'video/webm',
            })
            resolve({
              dataUrl: URL.createObjectURL(blob),
              posterUrl: captureFrame(videoEl, getPhrase(), getLook()),
              durationMs: performance.now() - startedAt,
              mimeType: blob.type || recorder.mimeType || mimeType || 'video/webm',
            })
          },
          { once: true },
        )

        recorder.addEventListener(
          'error',
          () => {
            cleanup()
            reject(new Error('動画の保存に失敗しました'))
          },
          { once: true },
        )

        if (recorder.state === 'inactive') {
          cleanup()
          reject(new Error('録画はすでに停止しています'))
          return
        }

        recorder.stop()
      })

      return stopPromise
    },
    dispose: () => {
      if (recorder.state !== 'inactive') {
        recorder.stop()
      }
      cleanup()
    },
  }
}

export function renderCaptureFrame(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement | null,
  phrase: string,
  look: LookSettings,
) {
  ctx.clearRect(0, 0, W, H)

  // ① 背景描画
  if (videoEl && videoEl.videoWidth > 0) {
    ctx.drawImage(videoEl, 0, 0, W, H)
  } else {
    drawVirtualBg(ctx, look.atmosphere)
  }

  // ② ピクセルフィルタ
  applyPixelFilter(ctx, look.atmosphere)

  // ③ 歌詞テキスト
  if (phrase) drawLyrics(ctx, phrase, look.textStyle)

  // ④ フレーム装飾
  drawFrame(ctx, look.atmosphere)
}

// ──────────────────────────────────────────────

function drawVirtualBg(ctx: CanvasRenderingContext2D, filter: FilterType) {
  if (filter === 'vintage') {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7)
    g.addColorStop(0, '#2e2418')
    g.addColorStop(1, '#0a0806')
    ctx.fillStyle = g
  } else if (filter === 'record') {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6)
    g.addColorStop(0, '#1a0a2a')
    g.addColorStop(1, '#050510')
    ctx.fillStyle = g
  } else if (filter === 'exposure') {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7)
    g.addColorStop(0, '#1a1a2a')
    g.addColorStop(1, '#060608')
    ctx.fillStyle = g
  } else if (filter === 'street') {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#171717')
    g.addColorStop(0.45, '#101010')
    g.addColorStop(1, '#050505')
    ctx.fillStyle = g
  } else {
    // film
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.65)
    g.addColorStop(0, '#2a2a1e')
    g.addColorStop(1, '#080808')
    ctx.fillStyle = g
  }
  ctx.fillRect(0, 0, W, H)
}

function applyPixelFilter(ctx: CanvasRenderingContext2D, filter: FilterType) {
  if (filter === 'record') return // record はピクセル操作なし

  const imageData = ctx.getImageData(0, 0, W, H)
  const d = imageData.data

  if (filter === 'film') {
    for (let i = 0; i < d.length; i += 4) {
      const grain = (Math.random() - 0.5) * 22
      d[i] = clamp(d[i] + grain + 10)
      d[i + 1] = clamp(d[i + 1] + grain + 5)
      d[i + 2] = clamp(d[i + 2] + grain - 5)
    }
  } else if (filter === 'vintage') {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2]
      d[i] = clamp(r * 0.393 + g * 0.769 + b * 0.189)
      d[i + 1] = clamp(r * 0.349 + g * 0.686 + b * 0.168)
      d[i + 2] = clamp(r * 0.272 + g * 0.534 + b * 0.131)
    }
  } else if (filter === 'exposure') {
    for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i] > 128 ? clamp(d[i] * 1.5) : Math.floor(d[i] * 0.5)
      d[i + 1] = d[i + 1] > 128 ? clamp(d[i + 1] * 1.5) : Math.floor(d[i + 1] * 0.5)
      d[i + 2] = d[i + 2] > 128 ? clamp(d[i + 2] * 1.5) : Math.floor(d[i + 2] * 0.5)
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

function drawLyrics(ctx: CanvasRenderingContext2D, phrase: string, textStyle: FilterType) {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  switch (textStyle) {
    case 'film': {
      const fs = Math.floor(W * 0.046)
      ctx.font = `bold ${fs}px "Special Elite", "Courier New", monospace`
      ctx.fillStyle = '#f0e0a0'
      ctx.shadowColor = '#f0e0a066'
      ctx.shadowBlur = 12
      // テキスト枠
      ctx.fillText(phrase, W / 2, H * 0.8, W * 0.88)
      break
    }
    case 'record': {
      const chars = Array.from(phrase)
      const radius = H * 0.26
      const fs = Math.floor(W * 0.028)
      ctx.font = `bold ${fs}px "Noto Sans JP", sans-serif`
      ctx.fillStyle = '#ffffff'
      chars.forEach((char, i) => {
        const angle = (i / chars.length) * Math.PI * 2 - Math.PI / 2
        const x = W / 2 + Math.cos(angle) * radius
        const y = H / 2 + Math.sin(angle) * radius
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angle + Math.PI / 2)
        ctx.fillText(char, 0, 0)
        ctx.restore()
      })
      break
    }
    case 'exposure': {
      const fs = Math.floor(W * 0.06)
      ctx.font = `bold ${fs}px "Noto Sans JP", sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = '#ffffff'
      ctx.shadowBlur = 50
      ctx.fillText(phrase, W / 2, H / 2, W * 0.88)
      ctx.shadowBlur = 20
      ctx.fillText(phrase, W / 2, H / 2, W * 0.88)
      break
    }
    case 'vintage': {
      const fs = Math.floor(W * 0.044)
      ctx.font = `italic ${fs}px "Noto Serif JP", Georgia, serif`
      ctx.fillStyle = '#c4a882'
      ctx.shadowColor = '#8a6040'
      ctx.shadowBlur = 6
      ctx.fillText(phrase, W / 2, H * 0.78, W * 0.88)
      break
    }
    case 'street': {
      const fs = Math.floor(W * 0.05)
      ctx.font = `900 ${fs}px "Noto Sans JP", sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = '#000000'
      ctx.shadowBlur = 16
      ctx.fillText(phrase, W / 2, H * 0.74, W * 0.86)
      break
    }
  }

  ctx.restore()
}

function drawFrame(ctx: CanvasRenderingContext2D, atmosphere: FilterType) {
  ctx.save()
  const pad = Math.floor(W * 0.022)

  // 外枠
  ctx.strokeStyle = atmosphere === 'vintage' ? '#a08060' : 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 2
  ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2)

  // スプロケット穴 (film / vintage)
  if (atmosphere === 'film' || atmosphere === 'vintage') {
    const hw = Math.floor(W * 0.013)
    const hh = Math.floor(H * 0.038)
    const count = 8
    ctx.fillStyle = atmosphere === 'vintage' ? '#0a0806' : '#000'
    for (let i = 0; i < count; i++) {
      const y = (i + 0.5) * (H / count)
      ctx.fillRect(pad + 4, y - hh / 2, hw, hh)
      ctx.fillRect(W - pad - hw - 4, y - hh / 2, hw, hh)
    }
  }

  // レコードの円 (record)
  if (atmosphere === 'record') {
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, H * 0.38, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, H * 0.04, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fill()
  }

  ctx.restore()
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

function pickVideoMimeType() {
  return VIDEO_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type)) ?? ''
}

function getAudioTracks(audioEl: HTMLAudioElement | null) {
  if (!audioEl) return []

  const captureSource = audioEl as HTMLAudioElement & {
    captureStream?: () => MediaStream
    mozCaptureStream?: () => MediaStream
  }

  try {
    const stream = captureSource.captureStream?.() ?? captureSource.mozCaptureStream?.()
    return stream?.getAudioTracks() ?? []
  } catch {
    return []
  }
}
