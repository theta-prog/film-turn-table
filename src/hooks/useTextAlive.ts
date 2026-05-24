import { useEffect, useRef, useState, useCallback } from 'react'
import type { Player as PlayerClass, IVideo, IPlayerApp } from 'textalive-app-api'

const SONGLE_DEV_PROXY_PREFIX = '/__songle_proxy'

let songleProxyInstalled = false

function rewriteSongleUrlForDev(url: string) {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return url
  }

  try {
    const resolved = new URL(url, window.location.origin)
    if (!resolved.hostname.endsWith('songle.jp')) {
      return url
    }

    return `${SONGLE_DEV_PROXY_PREFIX}/${resolved.hostname}${resolved.pathname}${resolved.search}`
  } catch {
    return url
  }
}

function installSongleDevProxy() {
  if (!import.meta.env.DEV || songleProxyInstalled || typeof window === 'undefined') {
    return
  }

  const originalOpen = XMLHttpRequest.prototype.open

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    const nextUrl =
      typeof url === 'string'
        ? rewriteSongleUrlForDev(url)
        : rewriteSongleUrlForDev(url.toString())

    return originalOpen.call(this, method, nextUrl, async ?? true, username ?? undefined, password ?? undefined)
  }

  songleProxyInstalled = true
}

export interface TextAliveState {
  isLoaded: boolean
  isPlaying: boolean
  currentPhrase: string
  currentWord: string
  progress: number
  duration: number
  songTitle: string
  bpm: number
  error: string | null
}

type PhraseChangeCb = (newPhrase: string, prevPhrase: string) => void

export function useTextAlive(
  audioRef: React.RefObject<HTMLAudioElement>,
  token: string,
  songUrl: string,
  onPhraseChange?: PhraseChangeCb,
) {
  const playerRef = useRef<PlayerClass | null>(null)
  const onPhraseChangeRef = useRef<PhraseChangeCb | undefined>(onPhraseChange)
  const prevPhraseRef = useRef('')
  const prevWordRef = useRef('')

  const [state, setState] = useState<TextAliveState>({
    isLoaded: false,
    isPlaying: false,
    currentPhrase: '',
    currentWord: '',
    progress: 0,
    duration: 0,
    songTitle: '',
    bpm: 0,
    error: null,
  })

  // Keep callback ref up to date without re-running the main effect
  onPhraseChangeRef.current = onPhraseChange

  useEffect(() => {
    if (!token || !songUrl) return
    const audio = audioRef.current
    if (!audio) return

    installSongleDevProxy()

    let disposed = false

    ;(async () => {
      try {
        const { Player } = await import('textalive-app-api')
        if (disposed) return

        const player = new Player({
          app: { token },
          mediaElement: audio,
        })
        playerRef.current = player

        player.addListener({
          onAppReady(app: IPlayerApp) {
            if (!app.songUrl) {
              void player.createFromSongUrl(songUrl).catch(() => {
                if (!disposed) {
                  setState(s => ({
                    ...s,
                    error: 'Songle から楽曲データを取得できませんでした。開発中は Vite を再起動してください。',
                  }))
                }
              })
            }
          },
          onVideoReady(v: IVideo) {
            setState(s => ({
              ...s,
              isLoaded: true,
              songTitle: (v as any).song?.title ?? '',
              duration: (v as any).duration ?? 0,
              error: null,
            }))
          },
          onTimerReady() {
            // Beat analysis is complete by the time onTimerReady fires
            const video = (player as any).video
            const firstBeat = video?.firstBeat ?? video?.findBeat?.(0)
            const bpm = firstBeat?.duration ? Math.round(60000 / firstBeat.duration) : 0
            setState(s => ({ ...s, isLoaded: true, bpm }))
          },
          onPlay() {
            setState(s => ({ ...s, isPlaying: true }))
          },
          onPause() {
            setState(s => ({ ...s, isPlaying: false }))
          },
          onStop() {
            setState(s => ({ ...s, isPlaying: false, currentPhrase: '', currentWord: '' }))
            prevPhraseRef.current = ''
            prevWordRef.current = ''
          },
          onTimeUpdate(pos: number) {
            const video = (player as any).video
            const dur: number = video?.duration ?? 1
            setState(s => ({ ...s, progress: pos / dur, duration: dur }))
            // phrase
            const phrase = video?.findPhrase?.(pos) ?? null
            const text: string = phrase?.text ?? ''
            if (text !== prevPhraseRef.current) {
              const prev = prevPhraseRef.current
              prevPhraseRef.current = text
              setState(s => ({ ...s, currentPhrase: text }))
              onPhraseChangeRef.current?.(text, prev)
            }
            // word (street mode 用)
            const word = video?.findWord?.(pos) ?? null
            const wordText: string = word?.text ?? ''
            if (wordText !== prevWordRef.current) {
              prevWordRef.current = wordText
              setState(s => ({ ...s, currentWord: wordText }))
            }
          },
        })
      } catch (e) {
        if (!disposed) {
          setState(s => ({
            ...s,
            error: 'TextAlive の初期化に失敗しました。トークンと曲URLを確認してください。',
          }))
        }
      }
    })()

    return () => {
      disposed = true
      playerRef.current?.dispose()
      playerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, songUrl])

  const play  = useCallback(() => playerRef.current?.requestPlay(), [])
  const pause = useCallback(() => playerRef.current?.requestPause(), [])
  const stop  = useCallback(() => playerRef.current?.requestStop?.(), [])

  const seekStart = useCallback(() => {
    playerRef.current?.startVideoSeek?.()
  }, [])

  const seekEnd = useCallback((ratio: number) => {
    const player = playerRef.current
    if (!player) return
    const dur: number = (player as any).video?.duration ?? 0
    if (!dur) return
    player.requestMediaSeek(ratio * dur)
    player.endVideoSeek?.()
  }, [])

  // live seek while dragging (updates position without ending seek mode)
  const seek = useCallback((ratio: number) => {
    const player = playerRef.current
    if (!player) return
    const dur: number = (player as any).video?.duration ?? 0
    if (!dur) return
    player.requestMediaSeek(ratio * dur)
  }, [])

  return { ...state, play, pause, stop, seek, seekStart, seekEnd }
}
