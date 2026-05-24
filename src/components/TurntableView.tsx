import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@stella-ds/react'
import { useTextAlive } from '../hooks/useTextAlive'
import type { CaptureItem, Photo } from '../types'
import { lookPreset } from '../types'

interface Props {
  captures: CaptureItem[]
  token: string
  songUrl: string
  onBack: () => void
}

type Tab = 'gallery' | 'replay'

function clipDurationLabel(durationMs: number) {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000))
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`
}

function captureExtension(capture: CaptureItem) {
  if (capture.kind === 'photo') return 'jpg'
  if (capture.mimeType.includes('mp4')) return 'mp4'
  return 'webm'
}

// ─── 個別メディアカード（ギャラリー） ───────────────────────
function MediaCard({
  capture,
  index,
  onDownload,
}: {
  capture: CaptureItem
  index: number
  onDownload: (capture: CaptureItem, index: number) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="relative rounded overflow-hidden bg-white/5 border border-white/10"
    >
      {capture.kind === 'photo' ? (
        <img
          src={capture.dataUrl}
          alt={`shot ${index + 1}`}
          className="w-full aspect-video object-cover"
        />
      ) : (
        <video
          src={capture.dataUrl}
          poster={capture.posterUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full aspect-video object-cover bg-black"
        />
      )}
      {capture.phrase && (
        <div className="absolute bottom-0 inset-x-0 bg-black/70 px-2 py-1">
          <p className="text-xs text-white/70 line-clamp-1">{capture.phrase}</p>
        </div>
      )}
      <button
        onClick={() => onDownload(capture, index)}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70
                   flex items-center justify-center text-white/70 hover:text-white
                   hover:bg-black/90 transition-colors text-xs"
        title={capture.kind === 'photo' ? 'この1枚を保存' : 'このクリップを保存'}
      >
        ↓
      </button>
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5">
        <span className="px-1.5 py-0.5 rounded-full bg-black/70 text-[9px] font-mono tracking-widest text-white/50">
          {capture.kind === 'photo' ? 'PHOTO' : 'VIDEO'}
        </span>
        <span className="text-[10px] text-white/30 font-mono">
          {String(index + 1).padStart(2, '0')}
        </span>
        {capture.kind === 'video' && (
          <span className="text-[10px] text-white/30 font-mono">
            {clipDurationLabel(capture.durationMs)}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ─── フィルム穿孔（スプロケット） ────────────────────────────
function FilmEdge() {
  return (
    <div className="h-5 bg-zinc-950 flex-shrink-0 flex items-center px-1.5 gap-[6px] overflow-hidden pointer-events-none select-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-3 h-[11px] rounded-[2px] bg-zinc-900 border border-white/10" />
      ))}
    </div>
  )
}

// ─── Replay タブ（TextAlive 再生 + フォト同期） ───────────────
function ReplayTab({ photos, token, songUrl }: { photos: Photo[]; token: string; songUrl: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [dragValue, setDragValue] = useState<number | null>(null)

  const { isLoaded, isPlaying, currentPhrase, progress, duration, songTitle, play, pause, seek, seekStart, seekEnd } =
    useTextAlive(audioRef, token, songUrl)

  const displayProgress = dragValue != null ? dragValue / 1000 : progress
  const currentPos = displayProgress * duration
  const realPos = progress * duration

  // songPosition が未設定の写真には曲全体に均等分散した仮位置を付与
  const sortedPhotos = useMemo(() => {
    const dur = duration || 1
    return [...photos]
      .map((p, i) => ({
        ...p,
        _pos: p.songPosition != null ? p.songPosition : (i / Math.max(photos.length, 1)) * dur,
      }))
      .sort((a, b) => a._pos - b._pos)
  }, [photos, duration])

  // 再生位置に対応するフォトインデックスを特定
  // 最初の写真より前は -1 を返してブラックフレームを維持
  const currentIdx = useMemo(() => {
    if (sortedPhotos.length === 0) return -1
    if (currentPos < sortedPhotos[0]._pos) return -1
    let best = 0
    for (let i = 0; i < sortedPhotos.length; i++) {
      if (sortedPhotos[i]._pos <= currentPos) best = i
    }
    return best
  }, [sortedPhotos, currentPos])

  const currentPhoto = currentIdx >= 0 ? sortedPhotos[currentIdx] : null

  // END OF ROLL：最後の写真から4秒後に自動停止（ドラッグ中は発動しない）
  const lastPhotoPos = sortedPhotos.at(-1)?._pos ?? 0
  const isEndOfRoll =
    sortedPhotos.length > 0 && isLoaded && dragValue == null && realPos > lastPhotoPos + 4000

  useEffect(() => {
    if (isEndOfRoll && isPlaying) pause()
  }, [isEndOfRoll, isPlaying, pause])

  // REWIND：最初のフォト位置にシーク
  const handleRewind = useCallback(() => {
    if (!sortedPhotos.length || !duration) return
    seek(sortedPhotos[0]._pos / duration)
  }, [sortedPhotos, duration, seek])

  // サムネイル帯のスクロール同期
  const thumbListRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!thumbListRef.current || currentIdx < 0) return
    const el = thumbListRef.current.children[currentIdx] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [currentIdx])

  // 時間フォーマット (ms → M:SS)
  const fmt = (ms: number) => {
    const s = Math.floor(Math.max(ms, 0) / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  if (photos.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
        ギャラリータブで写真を追加してください
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* ── 上フィルム穿孔 ── */}
      <FilmEdge />

      {/* ── メインフォト ── */}
      <div className="flex-1 relative overflow-hidden bg-zinc-900">
        <AnimatePresence mode="wait">
          {currentPhoto ? (
            <motion.img
              key={`frame-${currentIdx}`}
              src={currentPhoto.dataUrl}
              alt={`frame ${currentIdx + 1}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.06 }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950">
              {!isLoaded ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full"
                />
              ) : (
                <>
                  <span className="text-white/20 font-mono text-xs tracking-widest">REEL READY</span>
                  <span className="text-white/10 font-mono text-[10px] tracking-widest">▶ PRESS PLAY</span>
                </>
              )}
            </div>
          )}
        </AnimatePresence>

        {/* フィルムグレイン */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />

        {/* フレーム番号 + 曲名 */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between
                        px-3 pt-2 pb-8 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <span className="text-[11px] font-mono text-film-yellow/70 tracking-wider">
            {currentIdx >= 0
              ? `◼ ${String(currentIdx + 1).padStart(3, '0')} / ${String(sortedPhotos.length).padStart(3, '0')}`
              : '◻ --- / ---'}
          </span>
          {songTitle && (
            <span className="text-[10px] font-mono text-white/25 truncate max-w-[55%] text-right">
              {songTitle.toUpperCase()}
            </span>
          )}
        </div>

        {/* 歌詞 */}
        <AnimatePresence mode="wait">
          {currentPhrase && currentPhoto && !isEndOfRoll && (
            <motion.div
              key={currentPhrase}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent
                         px-6 pt-12 pb-4 pointer-events-none"
            >
              <p
                className="text-white text-center font-special"
                style={{ fontSize: 'clamp(14px, 3.5vw, 26px)', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
              >
                {currentPhrase}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* END OF ROLL オーバーレイ */}
        <AnimatePresence>
          {isEndOfRoll && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/85 z-20"
            >
              <div className="border border-film-yellow/40 px-10 py-5 text-center space-y-1.5">
                <p className="text-film-yellow font-mono text-[11px] tracking-[0.4em]">END OF ROLL</p>
                <p className="text-white/30 font-mono text-[10px] tracking-widest">
                  {String(sortedPhotos.length).padStart(3, '0')} FRAMES EXPOSED
                </p>
              </div>
              <button
                onClick={handleRewind}
                className="font-mono text-[11px] text-white/40 hover:text-film-yellow
                           tracking-widest transition-colors active:opacity-60"
              >
                ◂◂ REWIND
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 下フィルム穿孔 ── */}
      <FilmEdge />

      {/* ── フィルムストリップ（サムネイル帯） ── */}
      <div className="bg-zinc-950 py-2 border-t border-white/5">
        <div
          ref={thumbListRef}
          className="flex gap-[4px] px-2 overflow-x-auto scrollbar-none"
          style={{ minHeight: 44 }}
        >
          {sortedPhotos.map((photo, i) => (
            <button
              key={i}
              onClick={() => seek(photo._pos / (duration || 1))}
              className={`
                flex-shrink-0 relative overflow-hidden transition-all duration-150
                ${i === currentIdx
                  ? 'border-[1.5px] border-film-yellow scale-110 z-10 opacity-100'
                  : 'border border-zinc-700 opacity-40 hover:opacity-70'}
              `}
              style={{ width: 56, height: 38 }}
            >
              <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 text-[7px] text-center font-mono
                               bg-black/70 text-white/40 leading-tight py-px">
                {String(i + 1).padStart(2, '0')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── コントロール ── */}
      <div className="flex items-center gap-3 px-3 py-2 bg-black border-t border-white/5">
        {/* 時間表示 */}
        <span className="text-[10px] font-mono text-white/35 flex-shrink-0 w-[88px]">
          {fmt(realPos)} / {fmt(duration)}
        </span>

        {/* シークバー */}
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(displayProgress * 1000)}
          onPointerDown={() => { setDragValue(Math.round(progress * 1000)); seekStart() }}
          onChange={e => { const v = Number(e.target.value); setDragValue(v); seek(v / 1000) }}
          onPointerUp={e => { const v = Number((e.target as HTMLInputElement).value); seekEnd(v / 1000); setDragValue(null) }}
          disabled={!isLoaded}
          className="flex-1 cursor-pointer disabled:opacity-30 accent-film-yellow"
        />

        {/* 再生/停止ボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={isPlaying ? pause : play}
          disabled={!isLoaded}
          className="flex-shrink-0 w-8 h-8 font-mono text-sm"
          aria-label={isPlaying ? '一時停止' : '再生'}
        >
          {isPlaying ? 'II' : '▶'}
        </Button>
      </div>
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────────────
export default function TurntableView({ captures: initialCaptures, token, songUrl, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('gallery')
  const [allCaptures, setAllCaptures] = useState<CaptureItem[]>(initialCaptures)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replayPhotos = useMemo(
    () => allCaptures.filter((capture): capture is Photo => capture.kind === 'photo'),
    [allCaptures],
  )
  const photoCount = replayPhotos.length
  const videoCount = allCaptures.length - photoCount

  const handleDownload = useCallback((capture: CaptureItem, index: number) => {
    const a = document.createElement('a')
    a.href = capture.dataUrl
    a.download = `filmbeat_${String(index + 1).padStart(2, '0')}_${capture.timestamp}.${captureExtension(capture)}`
    a.click()
  }, [])

  const handleDownloadAll = useCallback(() => {
    allCaptures.forEach((capture, i) => {
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = capture.dataUrl
        a.download = `filmbeat_${String(i + 1).padStart(2, '0')}_${capture.timestamp}.${captureExtension(capture)}`
        a.click()
      }, i * 200)
    })
  }, [allCaptures])

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const readers = files.map(file => new Promise<Photo>(resolve => {
      const reader = new FileReader()
      reader.onload = ev => {
        resolve({
          kind: 'photo',
          dataUrl: ev.target?.result as string,
          phrase: '',
          timestamp: Date.now(),
          look: lookPreset('film'),
        })
      }
      reader.readAsDataURL(file)
    }))
    Promise.all(readers).then(imported => {
      setAllCaptures(prev => [...prev, ...imported])
    })
    e.target.value = ''
  }, [])

  return (
    <div className="flex-1 flex flex-col bg-film-dark overflow-hidden">
      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/50 border-b border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
        >
          ← 撮影に戻る
        </Button>

        {/* タブ切替 */}
        <div className="flex rounded-full border border-white/15 overflow-hidden text-xs font-bold">
          {(['gallery', 'replay'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 transition-colors text-xs font-bold ${
                tab === t ? 'bg-film-yellow text-black' : 'text-white/50 hover:text-white'
              }`}
            >
              {t === 'gallery' ? 'ギャラリー' : '▶ リプレイ'}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownloadAll}
        >
          ↓ 全保存
        </Button>
      </div>

      {/* ── ギャラリータブ ── */}
      {tab === 'gallery' && (
        <div className="flex-1 overflow-y-auto">
          {/* インポートバー */}
          <div className="sticky top-0 z-10 flex items-center justify-between
                          px-4 py-2 bg-black/70 backdrop-blur-sm border-b border-white/5">
            <span className="text-xs text-white/40">
              {photoCount} shots / {videoCount} clips
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="font-bold"
            >
              + 写真を追加
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImport}
            />
          </div>

          {allCaptures.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-white/30">
              <p className="text-sm">シャッターが切られませんでした</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-3">
              {allCaptures.map((capture, i) => (
                <MediaCard key={`${capture.timestamp}-${i}`} capture={capture} index={i} onDownload={handleDownload} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── リプレイタブ ── */}
      {tab === 'replay' && (
        <ReplayTab photos={replayPhotos} token={token} songUrl={songUrl} />
      )}
    </div>
  )
}
