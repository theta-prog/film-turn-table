import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { FilterType } from '../types'

interface Props {
  phrase: string
  currentWord: string
  textStyle: FilterType
}

// ─── Film variants ───────────────────────────────────────
const filmVariants = {
  initial: { opacity: 0, y: 24, filter: 'blur(4px)', letterSpacing: '0.3em' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    letterSpacing: '0.05em',
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -18,
    filter: 'blur(2px)',
    transition: { duration: 0.25 },
  },
}

// ─── Record variants ─────────────────────────────────────
const recordVariants = {
  initial: { opacity: 0, scale: 0.6, rotate: -15 },
  animate: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 200, damping: 18 },
  },
  exit: { opacity: 0, scale: 0.7, rotate: 15, transition: { duration: 0.2 } },
}

// ─── Exposure variants ───────────────────────────────────
const exposureVariants = {
  initial: { opacity: 0, scale: 1.15 },
  animate: {
    opacity: [0, 1, 0.85, 1],
    scale: [1.15, 1, 1, 1],
    transition: { duration: 0.28, times: [0, 0.15, 0.5, 1] },
  },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.12 } },
}

// ─── Vintage (char-by-char) ──────────────────────────────
function VintageText({ phrase }: { phrase: string }) {
  return (
    <motion.div
      key={phrase}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="font-noto-serif italic text-sepia text-center px-8"
      style={{ fontSize: 'clamp(14px, 3.8vw, 40px)', textShadow: '1px 1px 4px #8a6040', width: '100%', wordBreak: 'break-all', overflowWrap: 'break-word' }}
    >
      {Array.from(phrase).map((char, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, y: 4 },
            visible: {
              opacity: 1,
              y: Math.sin(i * 1.4) * 3, // slight waviness
              transition: { delay: i * 0.055, type: 'spring', stiffness: 300, damping: 20 },
            },
          }}
          style={{ display: 'inline-block' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.div>
  )
}

// ─── Record circular text ────────────────────────────────
function RecordText({ phrase }: { phrase: string }) {
  const chars = Array.from(phrase)
  // 文字数に応じて半径を動的調整（長いほど大きく）
  const radius = Math.max(90, Math.min(160, chars.length * 9))

  return (
    <motion.div
      key={phrase}
      variants={recordVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ position: 'relative', width: radius * 2 + 60, height: radius * 2 + 60 }}
    >
      {chars.map((char, i) => {
        const angle = (i / chars.length) * 360 - 90
        const rad = (angle * Math.PI) / 180
        const x = (radius + 30) + Math.cos(rad) * radius
        const y = (radius + 30) + Math.sin(rad) * radius
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: i * 0.04 } }}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`,
              color: '#ffffff',
              fontSize: 'clamp(12px, 2vw, 20px)',
              fontWeight: 'bold',
              textShadow: '0 0 8px rgba(255,255,255,0.4)',
            }}
          >
            {char}
          </motion.span>
        )
      })}
    </motion.div>
  )
}

// ─── Street (文字ばらばらバースト / 右寄せ積み上げ) ──────────
type StreetLine = {
  id: number
  text: string
  rands: Array<{ dx: number; dy: number; rot: number }>
}

function StreetMode({ phrase }: { phrase: string }) {
  const [lines, setLines] = useState<StreetLine[]>([])
  const counterRef = useRef(0)

  useEffect(() => {
    if (!phrase) return
    setLines(prev => {
      if (prev.length > 0 && prev[prev.length - 1].text === phrase) return prev
      const newLine: StreetLine = {
        id: counterRef.current++,
        text: phrase,
        // 文字ごとのランダム初期値を生成して安定保持
        rands: Array.from(phrase).map(() => ({
          dx:  Math.random() * 65 + 22,      // 22-87px 右から飛び出す
          dy:  (Math.random() - 0.5) * 36,   // ±18px 縦ばらけ
          rot: (Math.random() - 0.5) * 26,   // ±13° 回転ばらけ
        })),
      }
      return [...prev, newLine].slice(-4)
    })
  }, [phrase])

  return (
    <div
      className="absolute inset-y-0 right-0 flex flex-col justify-center items-end pr-6 pointer-events-none gap-3"
      style={{ left: '28%' }}
    >
      <AnimatePresence initial={false}>
        {lines.map((line, lineIdx) => {
          const age = lines.length - 1 - lineIdx
          const lineOpacity = Math.max(0.12, 1 - age * 0.27)
          const lineScale  = Math.max(0.55, 1 - age * 0.14)

          return (
            <motion.div
              key={line.id}
              animate={{ opacity: lineOpacity, scale: lineScale }}
              exit={{ opacity: 0, x: -24, transition: { duration: 0.18, ease: 'easeIn' } }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                transformOrigin: 'right center',
              }}
            >
              {/* 白いワイプバー（最新行のみ・右→左にスラッシュ） */}
              {age === 0 && (
                <div
                  style={{
                    position: 'absolute',
                    inset: '-3px 0',
                    overflow: 'hidden',
                    zIndex: 20,
                    pointerEvents: 'none',
                  }}
                >
                  <motion.div
                    initial={{ x: '102%' }}
                    animate={{ x: '-102%' }}
                    transition={{ duration: 0.48, ease: [0.25, 0.46, 0.45, 0.94] }}
                    style={{ position: 'absolute', inset: 0, background: 'white' }}
                  />
                </div>
              )}
              {Array.from(line.text).map((char, i) => {
                const r = line.rands[i] ?? { dx: 40, dy: 0, rot: 0 }
                return (
                  <motion.span
                    key={i}
                    initial={{ x: r.dx, y: r.dy, opacity: 0, rotate: r.rot, scale: 0.35 }}
                    animate={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                    transition={{
                      delay: i * 0.042,
                      type: 'tween',
                      duration: 0.45,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{
                      display: 'inline-block',
                      fontFamily: '"Noto Sans JP", sans-serif',
                      fontWeight: 900,
                      fontSize: 'clamp(15px, 3vw, 36px)',
                      color: '#ffffff',
                      lineHeight: 1.25,
                      letterSpacing: '0.08em',
                      textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 32px rgba(0,0,0,0.6)',
                    }}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </motion.span>
                )
              })}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────
export default function LyricOverlay({ phrase, currentWord, textStyle }: Props) {
  if (textStyle === 'street') {
    return <StreetMode phrase={phrase} />
  }

  if (textStyle === 'vintage') {
    return (
      <div className="absolute inset-0 flex items-end justify-center pb-16 pointer-events-none">
        <AnimatePresence mode="wait">
          {phrase && <VintageText key={phrase} phrase={phrase} />}
        </AnimatePresence>
      </div>
    )
  }

  if (textStyle === 'record') {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {phrase && <RecordText key={phrase} phrase={phrase} />}
        </AnimatePresence>
      </div>
    )
  }

  if (textStyle === 'exposure') {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {phrase && (
            <motion.div
              key={phrase}
              variants={exposureVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-white font-bold text-center px-8"
              style={{
                fontSize: 'clamp(18px, 4.5vw, 52px)',
                textShadow:
                  '0 0 20px rgba(255,255,255,0.9), 0 0 60px rgba(255,255,255,0.4)',
                width: '100%',
                wordBreak: 'break-all',
                overflowWrap: 'break-word',
              }}
            >
              {phrase}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // film (default)
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center pb-14 pointer-events-none">
      <AnimatePresence mode="wait">
        {phrase && (
          <motion.div
            key={phrase}
            variants={filmVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="font-special text-film-yellow text-center px-8"
            style={{
              fontSize: 'clamp(15px, 3.8vw, 42px)',
              textShadow: '0 0 12px rgba(240,224,160,0.4)',
              width: '100%',
              wordBreak: 'break-all',
              overflowWrap: 'break-word',
            }}
          >
            {phrase}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
