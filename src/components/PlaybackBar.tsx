import { useState } from 'react'
import { Button } from '@stella-ds/react'
import type { ShutterMode } from '../types'

interface Props {
  isPlaying: boolean
  isLoaded: boolean
  isRecording: boolean
  progress: number
  shutterMode: ShutterMode
  onPlay: () => void
  onPause: () => void
  onShutter: () => void
  onToggleRecording: () => void
  onSeek: (ratio: number) => void
  onSeekStart: () => void
  onSeekEnd: (ratio: number) => void
  onToggleShutterMode: () => void
  photoCount: number
  videoCount: number
  recordingDurationMs: number
  songTitle: string
}

export default function PlaybackBar({
  isPlaying,
  isLoaded,
  isRecording,
  progress,
  shutterMode,
  onPlay,
  onPause,
  onShutter,
  onToggleRecording,
  onSeek,
  onSeekStart,
  onSeekEnd,
  onToggleShutterMode,
  photoCount,
  videoCount,
  recordingDurationMs,
  songTitle,
}: Props) {
  // ドラッグ中は TextAlive の progress 更新と競合しないようローカル値を保持
  const [dragValue, setDragValue] = useState<number | null>(null)
  const displayValue = dragValue ?? Math.round(progress * 1000)
  const recSeconds = Math.floor(recordingDurationMs / 1000)
  const recClock = `${Math.floor(recSeconds / 60)}:${String(recSeconds % 60).padStart(2, '0')}`

  return (
    <div className="flex flex-col gap-2 px-4 py-3 bg-black/60 backdrop-blur-sm">
      {/* Song info + photo count */}
      <div className="flex items-center justify-between text-xs text-white/40 px-1">
        <span className="truncate max-w-[60%]">
          {songTitle ? songTitle : isLoaded ? '読み込み完了' : '読み込み中…'}
        </span>
        <span>{photoCount} shots / {videoCount} clips</span>
      </div>

      {/* Progress bar */}
      <input
        type="range"
        min={0}
        max={1000}
        value={displayValue}
        onPointerDown={() => {
          setDragValue(Math.round(progress * 1000))
          onSeekStart()
        }}
        onChange={e => {
          const v = Number(e.target.value)
          setDragValue(v)
          onSeek(v / 1000)
        }}
        onPointerUp={e => {
          const v = Number((e.target as HTMLInputElement).value)
          onSeekEnd(v / 1000)
          setDragValue(null)
        }}
        disabled={!isLoaded}
        className="w-full cursor-pointer disabled:opacity-30 accent-film-yellow"
      />

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <Button
          variant="ghost"
          size="sm"
          onClick={isPlaying ? onPause : onPlay}
          disabled={!isLoaded}
          className="w-10 h-10 rounded-full font-mono text-base"
          aria-label={isPlaying ? '一時停止' : '再生'}
        >
          {isPlaying ? 'II' : '▶'}
        </Button>

        {/* Shutter mode toggle */}
        <button
          onClick={onToggleShutterMode}
          className={`
            px-3 py-1.5 rounded-full text-xs font-bold tracking-wide
            transition-all active:scale-95
            ${shutterMode === 'auto'
              ? 'bg-film-yellow/80 text-black'
              : 'bg-white/10 text-white/60 hover:bg-white/20'}
          `}
        >
          {shutterMode === 'auto' ? 'AUTO' : 'MANUAL'}
        </button>

        <button
          onClick={onToggleRecording}
          disabled={!isLoaded}
          className={`
            px-3 py-1.5 rounded-full text-xs font-bold tracking-wide
            transition-all active:scale-95 disabled:opacity-30
            ${isRecording
              ? 'bg-red-600 text-white hover:bg-red-500'
              : 'bg-white/10 text-white/60 hover:bg-white/20'}
          `}
        >
          {isRecording ? `REC ${recClock}` : 'REC'}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Shutter button */}
        <button
          onClick={onShutter}
          disabled={!isLoaded}
          className="w-14 h-14 rounded-full border-4 border-white/40
                     bg-white/5 hover:bg-white/15 active:bg-white/30
                     flex items-center justify-center
                     transition-all active:scale-90 disabled:opacity-30
                     relative group"
          aria-label="シャッター"
        >
          {/* 内側の円 */}
          <div className="w-9 h-9 rounded-full bg-white/80 group-active:bg-white
                          transition-all group-active:scale-90" />
        </button>
      </div>
    </div>
  )
}
