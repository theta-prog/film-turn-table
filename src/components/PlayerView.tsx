import { useRef, useEffect, useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import FilterBar from './FilterBar'
import LyricOverlay from './LyricOverlay'
import PlaybackBar from './PlaybackBar'
import { useTextAlive } from '../hooks/useTextAlive'
import { useCamera } from '../hooks/useCamera'
import { captureFrame, startVideoCapture } from '../utils/capture'
import type { VideoCaptureSession } from '../utils/capture'
import type { CaptureItem, LookSettings, FilterType, ShutterMode } from '../types'
import { lookPreset } from '../types'

interface Props {
  token: string
  songUrl: string
  onFinish: (captures: CaptureItem[]) => void
}

export default function PlayerView({ token, songUrl, onFinish }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [look, setLook] = useState<LookSettings>(lookPreset('film'))
  const [shutterMode, setShutterMode] = useState<ShutterMode>('manual')
  const [captures, setCaptures] = useState<CaptureItem[]>([])
  const [showFlash, setShowFlash] = useState(false)
  const [shutterCount, setShutterCount] = useState(0) // animation key
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDurationMs, setRecordingDurationMs] = useState(0)
  const [recordingError, setRecordingError] = useState<string | null>(null)

  const camera = useCamera()

  // ─── 参照キャッシュ ──────────────────────────────────────
  const lookRef = useRef(look)
  const currentPhraseRef = useRef('')
  const shutterModeRef = useRef(shutterMode)
  const songPositionRef = useRef(0)
  const capturesRef = useRef<CaptureItem[]>([])
  const recorderRef = useRef<VideoCaptureSession | null>(null)
  const recordingBusyRef = useRef(false)
  const recordingStartedAtRef = useRef(0)
  const recordingTimerRef = useRef<number | null>(null)

  lookRef.current = look
  shutterModeRef.current = shutterMode
  capturesRef.current = captures

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current != null) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }, [])

  const appendCapture = useCallback((item: CaptureItem) => {
    const next = [...capturesRef.current, item]
    capturesRef.current = next
    setCaptures(next)
    return next
  }, [])

  // ─── シャッター処理 ──────────────────────────────────────
  const handleShutter = useCallback(
    (phraseOverride?: string) => {
      const dataUrl = captureFrame(
        camera.enabled && videoRef.current ? videoRef.current : null,
        phraseOverride ?? currentPhraseRef.current,
        lookRef.current,
      )
      appendCapture({
        kind: 'photo',
        dataUrl,
        phrase: phraseOverride ?? currentPhraseRef.current,
        timestamp: Date.now(),
        look: lookRef.current,
        songPosition: songPositionRef.current,
      })
      setShowFlash(true)
      setShutterCount(c => c + 1)
      setTimeout(() => setShowFlash(false), 350)
    },
    [appendCapture, camera.enabled], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const stopRecording = useCallback(
    async (finishAfterStop = false) => {
      if (recordingBusyRef.current) return

      const session = recorderRef.current
      if (!session) {
        if (finishAfterStop) {
          onFinish(capturesRef.current)
        }
        return
      }

      recordingBusyRef.current = true

      try {
        const clip = await session.stop()
        recorderRef.current = null
        clearRecordingTimer()
        setIsRecording(false)
        setRecordingDurationMs(0)

        const next = appendCapture({
          kind: 'video',
          dataUrl: clip.dataUrl,
          posterUrl: clip.posterUrl,
          durationMs: clip.durationMs,
          mimeType: clip.mimeType,
          phrase: currentPhraseRef.current,
          timestamp: Date.now(),
          look: lookRef.current,
          songPosition: songPositionRef.current,
        })

        if (finishAfterStop) {
          onFinish(next)
        }
      } catch {
        recorderRef.current = null
        clearRecordingTimer()
        setIsRecording(false)
        setRecordingDurationMs(0)
        setRecordingError('動画の保存に失敗しました')

        if (finishAfterStop) {
          onFinish(capturesRef.current)
        }
      } finally {
        recordingBusyRef.current = false
      }
    },
    [appendCapture, clearRecordingTimer, onFinish],
  )

  const startRecording = useCallback(() => {
    if (recorderRef.current || recordingBusyRef.current) return

    setRecordingError(null)

    try {
      recorderRef.current = startVideoCapture({
        videoEl: camera.enabled && videoRef.current ? videoRef.current : null,
        audioEl: audioRef.current,
        getPhrase: () => currentPhraseRef.current,
        getLook: () => lookRef.current,
      })

      recordingStartedAtRef.current = performance.now()
      clearRecordingTimer()
      setRecordingDurationMs(0)
      setIsRecording(true)
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDurationMs(performance.now() - recordingStartedAtRef.current)
      }, 200)
    } catch (error) {
      recorderRef.current = null
      clearRecordingTimer()
      setIsRecording(false)
      setRecordingError(
        error instanceof Error ? error.message : '動画録画を開始できませんでした',
      )
    }
  }, [camera.enabled, clearRecordingTimer])

  const handleRecordingToggle = useCallback(() => {
    if (recordingBusyRef.current) return

    if (recorderRef.current) {
      void stopRecording()
      return
    }

    startRecording()
  }, [startRecording, stopRecording])

  const onPhraseChange = useCallback(
    (newPhrase: string, prevPhrase: string) => {
      currentPhraseRef.current = newPhrase
      // 前フレーズが終わった = autoシャッター
      if (prevPhrase && !newPhrase && shutterModeRef.current === 'auto') {
        handleShutter(prevPhrase)
      }
    },
    [handleShutter],
  )

  // ─── TextAlive ──────────────────────────────────────────
  const { isLoaded, isPlaying, currentPhrase, currentWord, progress, duration, songTitle, bpm, error, play, pause, seek, seekStart, seekEnd } =
    useTextAlive(audioRef, token, songUrl, onPhraseChange)

  // BPM からビート時間（秒）を計算。BPM が未取得の場合は 120 BPM をデフォルト値に使用
  const beatDuration = bpm > 0 ? 60 / bpm : 0.5
  // film 雰囲気かつ再生中のみアニメーションを走らせる
  const filmAnimActive = look.atmosphere === 'film' && isPlaying
  // record コーナー円の歌詞テキスト（円周分繰り返し）
  const loopText = (text: string, minLen = 80) => {
    if (!text) return ''
    const unit = text + '  '
    return unit.repeat(Math.ceil(minLen / unit.length) + 1)
  }
  const recordCircleText = loopText(currentPhrase)

  currentPhraseRef.current = currentPhrase
  songPositionRef.current = progress * duration

  // ─── カメラ映像を video 要素に流す ───────────────────────
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    if (camera.stream) {
      vid.srcObject = camera.stream
      vid.play().catch(() => {})
    } else {
      vid.srcObject = null
    }
  }, [camera.stream])

  // ─── 曲終了検知 ─────────────────────────────────────────
  // onStop は自動終了 or 手動停止どちらでも発火するため、
  // 進行度が 99% を超えたら終了とみなす
  const finishedRef = useRef(false)
  useEffect(() => {
    if (!finishedRef.current && progress > 0.99 && isLoaded) {
      finishedRef.current = true
      if (recorderRef.current) {
        void stopRecording(true)
      } else {
        onFinish(capturesRef.current)
      }
    }
  }, [progress, isLoaded, onFinish, stopRecording])

  useEffect(() => {
    return () => {
      clearRecordingTimer()
      recorderRef.current?.dispose()
      recorderRef.current = null
    }
  }, [clearRecordingTimer])

  const photoCount = captures.filter(capture => capture.kind === 'photo').length
  const videoCount = captures.length - photoCount

  // ─── レンダー ────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-film-dark overflow-hidden">
      {/* オーディオ要素 */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* フィルタバー */}
      <FilterBar active={look} onChange={setLook} />

      {/* メインビュー */}
      <div className="flex-1 relative overflow-hidden vignette film-grain">
        {/* カメラ映像 or 仮想背景 */}
        {camera.enabled ? (
          <video
            ref={videoRef}
            muted
            playsInline
            className={`w-full h-full object-cover ${
              look.atmosphere === 'vintage' ? 'sepia-[0.6]' : ''
            } ${look.atmosphere === 'exposure' ? 'contrast-150' : ''}`}
          />
        ) : (
          <VirtualBackground atmosphere={look.atmosphere} />
        )}

        {/* フィルムセルオーバーレイ（film 雰囲気のみ） */}
        {look.atmosphere === 'film' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              // 水平線（80px おき）が下に向かって流れるフィルムセル境界線
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1.5px, transparent 1.5px, transparent 80px)',
              backgroundSize: '100% 80px',
              animationName: filmAnimActive ? 'filmCellScroll' : 'none',
              animationDuration: `${beatDuration * 1}s`,  // 1ビートで 1セル（倍率ここで変える）
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              zIndex: 6,
            }}
          />
        )}

        {/* CRT ノイズオーバーレイ（vintage 雰囲気のみ） */}
        {look.atmosphere === 'vintage' && (
          <>
            {/* スキャンライン：2px おきの暗い横線 */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 3px)',
                backgroundSize: '100% 3px',
                zIndex: 6,
              }}
            />
            {/* ノイズグレイン：SVG feTurbulence をコマ送りでアニメーション */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'repeat',
                backgroundSize: '80px 80px',
                opacity: 0.15,
                animation: 'crtGrain 0.06s steps(1) infinite',
                zIndex: 7,
              }}
            />
            {/* フリッカー：不定期な輝度の揺らぎ */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'rgba(255,240,180,0.06)',
                animation: 'crtFlicker 0.12s steps(1) infinite',
                zIndex: 7,
              }}
            />
            {/* ローリングバー：走査線の帯 */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                height: '4px',
                background:
                  'linear-gradient(to bottom, transparent, rgba(255,255,200,0.04), transparent)',
                animation: 'crtRoll 3.5s linear infinite',
                zIndex: 8,
              }}
            />
          </>
        )}

        {/* フィルムフレーム装飾 */}
        {(look.atmosphere === 'film' || look.atmosphere === 'vintage') && (
          <>
            <div
              className="absolute left-0 top-0 bottom-0 w-6 film-sprocket bg-black/70 z-10"
              style={filmAnimActive ? {
                animationName: 'filmSprocketScroll',
                animationDuration: `${beatDuration * 0.5}s`,  // 0.5ビートで 1スプロケット穴（倍率ここで変える）
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
              } : undefined}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-6 film-sprocket bg-black/70 z-10"
              style={filmAnimActive ? {
                animationName: 'filmSprocketScroll',
                animationDuration: `${beatDuration * 0.5}s`,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
              } : undefined}
            />
          </>
        )}

        {/* レコード円形オーバーレイ */}
        {look.atmosphere === 'record' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div
              className="rounded-full border border-white/10"
              style={{ width: 260, height: 260, borderWidth: 1 }}
            />
            <div className="absolute rounded-full border border-white/5" style={{ width: 320, height: 320 }} />
          </div>
        )}

        {/* レコード コーナーテキスト円（カメラON/OFF両対応） */}
        {look.atmosphere === 'record' && (
          <>
            {/* 左上 テキスト円 */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              className="absolute pointer-events-none"
              style={{ width: 600, height: 600, top: 0, left: 0, transform: 'translate(-50%, -50%)', opacity: 0.45, zIndex: 11 }}
            >
              <svg width="600" height="600" viewBox="0 0 600 600">
                <defs>
                  <path id="tl-outer" d="M 300,300 m -248,0 a 248,248 0 1,1 496,0 a 248,248 0 1,1 -496,0" />
                  <path id="tl-inner" d="M 300,300 m -185,0 a 185,185 0 1,1 370,0 a 185,185 0 1,1 -370,0" />
                </defs>
                <text fill="rgba(216,180,254,0.75)" fontSize="60" letterSpacing="7" fontFamily="sans-serif">
                  <textPath href="#tl-outer">{recordCircleText}</textPath>
                </text>
                <text fill="rgba(167,139,250,0.55)" fontSize="20" letterSpacing="12" fontFamily="sans-serif">
                  <textPath href="#tl-inner">{recordCircleText}</textPath>
                </text>
              </svg>
            </motion.div>

            {/* 右下 テキスト円 */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
              className="absolute pointer-events-none"
              style={{ width: 600, height: 600, bottom: 0, right: 0, transform: 'translate(50%, 50%)', opacity: 0.45, zIndex: 11 }}
            >
              <svg width="600" height="600" viewBox="0 0 600 600">
                <defs>
                  <path id="br-outer" d="M 300,300 m -248,0 a 248,248 0 1,1 496,0 a 248,248 0 1,1 -496,0" />
                  <path id="br-inner" d="M 300,300 m -185,0 a 185,185 0 1,1 370,0 a 185,185 0 1,1 -370,0" />
                </defs>
                <text fill="rgba(165,180,252,0.75)" fontSize="60" letterSpacing="7" fontFamily="sans-serif">
                  <textPath href="#br-outer">{recordCircleText}</textPath>
                </text>
                <text fill="rgba(129,140,248,0.55)" fontSize="20" letterSpacing="12" fontFamily="sans-serif">
                  <textPath href="#br-inner">{recordCircleText}</textPath>
                </text>
              </svg>
            </motion.div>
          </>
        )}

        {/* 歌詞オーバーレイ */}
        <div className="absolute inset-0 z-20">
          <LyricOverlay phrase={currentPhrase} currentWord={currentWord} textStyle={look.textStyle} />
        </div>

        {/* シャッターフラッシュ */}
        <AnimatePresence>
          {showFlash && (
            <motion.div
              key={shutterCount}
              className="absolute inset-0 bg-white z-30 pointer-events-none"
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            />
          )}
        </AnimatePresence>

        {/* エラー表示 */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/60">
            <div className="bg-red-900/80 border border-red-500/50 rounded p-4 max-w-sm text-sm text-red-200 text-center">
              {error}
            </div>
          </div>
        )}

        {/* ローディング */}
        {!isLoaded && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/70">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 mb-3 rounded-full border-2 border-white/20 border-t-film-yellow"
            />
            <p className="text-white/50 text-sm">楽曲を読み込んでいます…</p>
          </div>
        )}

        {/* カメラトグル & エラー */}
        <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-1.5">
          <button
            onClick={camera.toggle}
            disabled={isRecording}
            className={`
              px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 disabled:opacity-30
              ${camera.enabled
                ? 'bg-film-yellow text-black'
                : 'bg-white/10 text-white/50 hover:bg-white/20'}
            `}
          >
            CAM {camera.enabled ? 'ON' : 'OFF'}
          </button>
          {camera.error && (
            <span className="text-xs text-red-400 bg-black/60 px-2 py-0.5 rounded">
              {camera.error}
            </span>
          )}
          {recordingError && (
            <span className="text-xs text-red-300 bg-black/70 px-2 py-0.5 rounded border border-red-500/30">
              {recordingError}
            </span>
          )}
        </div>
      </div>

      {/* 再生バー */}
      <PlaybackBar
        isPlaying={isPlaying}
        isLoaded={isLoaded}
        isRecording={isRecording}
        progress={progress}
        shutterMode={shutterMode}
        onPlay={play}
        onPause={pause}
        onShutter={() => handleShutter()}
        onToggleRecording={handleRecordingToggle}
        onSeek={seek}
        onSeekStart={seekStart}
        onSeekEnd={seekEnd}
        onToggleShutterMode={() =>
          setShutterMode(m => (m === 'manual' ? 'auto' : 'manual'))
        }
        photoCount={photoCount}
        videoCount={videoCount}
        recordingDurationMs={recordingDurationMs}
        songTitle={songTitle}
      />

      {/* 曲終了ボタン（手動でフィルム鑑賞へ） */}
      {captures.length > 0 && (
        <button
          onClick={() => {
            if (recorderRef.current) {
              void stopRecording(true)
              return
            }

            onFinish(capturesRef.current)
          }}
          className="py-2 bg-film-yellow/10 hover:bg-film-yellow/20
                     text-film-yellow text-xs tracking-widest font-bold
                     transition-colors"
        >
          フィルムを現像する →
        </button>
      )}
    </div>
  )
}

// ─── 仮想背景 ──────────────────────────────────────────────
function VirtualBackground({ atmosphere }: { atmosphere: FilterType }) {
  const bg: Record<FilterType, string> = {
    film: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-black',
    record: 'bg-gradient-to-br from-indigo-950 via-purple-950 to-black',
    exposure: 'bg-gradient-to-br from-slate-900 via-zinc-900 to-black',
    vintage: 'bg-gradient-to-br from-amber-950 via-stone-900 to-black',
    street: 'bg-gradient-to-b from-neutral-900 via-zinc-900 to-black',
  }

  return (
    <div className={`w-full h-full ${bg[atmosphere]} relative overflow-hidden`}>
      {atmosphere === 'film' && (
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
          }}
        />
      )}
      {atmosphere === 'record' && (
        <>
          {/* 中央メイン円 */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: 400, height: 400 }}
          >
            {[400, 340, 280, 220, 160, 100].map(d => (
              <div
                key={d}
                className="absolute rounded-full border border-white/5"
                style={{ width: d, height: d, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
              />
            ))}
          </motion.div>
        </>
      )}
    </div>
  )
}
