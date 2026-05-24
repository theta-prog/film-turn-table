import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { FilterType, LookSettings, PresetId } from '../types'
import { lookPreset } from '../types'

const PRESETS: { id: FilterType; label: string }[] = [
  { id: 'film',     label: 'フィルム'     },
  { id: 'record',   label: 'レコード'     },
  { id: 'exposure', label: '露光'         },
  { id: 'vintage',  label: 'ヴィンテージ' },
  { id: 'street',   label: 'ストリート'   },
]

const ATMOSPHERE_OPTIONS: { id: FilterType; label: string }[] = [
  { id: 'film',     label: 'フィルム'     },
  { id: 'record',   label: 'レコード'     },
  { id: 'exposure', label: '露光'         },
  { id: 'vintage',  label: 'ヴィンテージ' },
  { id: 'street',   label: 'ストリート'   },
]

const TEXT_STYLE_OPTIONS: { id: FilterType; label: string }[] = [
  { id: 'film',     label: 'フロート'   },
  { id: 'record',   label: '円形'       },
  { id: 'exposure', label: 'フラッシュ' },
  { id: 'vintage',  label: '波打ち'     },
  { id: 'street',   label: 'バースト'   },
]

interface Props {
  active: LookSettings
  onChange: (look: LookSettings) => void
}

export default function FilterBar({ active, onChange }: Props) {
  const [customOpen, setCustomOpen] = useState(false)

  // 現在がプリセットかどうか
  const activePreset: PresetId =
    active.atmosphere === active.textStyle ? active.atmosphere : 'custom'

  const handlePreset = (id: FilterType) => {
    setCustomOpen(false)
    onChange(lookPreset(id))
  }

  const handleCustomToggle = () => {
    setCustomOpen(v => !v)
  }

  return (
    <div className="flex flex-col bg-black/40 backdrop-blur-sm">
      {/* ─── プリセット行 ─────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 px-3 py-2">
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => handlePreset(p.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
              transition-all duration-200 active:scale-95
              ${activePreset === p.id && !customOpen
                ? 'bg-film-yellow text-black'
                : 'bg-white/8 text-white/50 hover:bg-white/15 hover:text-white'}
            `}
          >
            <span className="hidden sm:inline tracking-wide">{p.label}</span>
          </button>
        ))}

        {/* カスタムボタン */}
        <button
          onClick={handleCustomToggle}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
            transition-all duration-200 active:scale-95 ml-1
            ${customOpen || activePreset === 'custom'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/8 text-white/40 hover:bg-white/15 hover:text-white'}
          `}
        >
          <span className="hidden sm:inline tracking-wide">カスタム</span>
          <span className={`transition-transform duration-200 ${customOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
      </div>

      {/* ─── カスタムパネル ───────────────────────────── */}
      <AnimatePresence>
        {customOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 flex flex-col gap-2 border-t border-white/8">
              {/* 雰囲気ピッカー */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/35 font-mono tracking-widest w-10 flex-shrink-0 text-right">雰囲気</span>
                <div className="flex gap-1.5 flex-wrap">
                  {ATMOSPHERE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => onChange({ ...active, atmosphere: opt.id })}
                      className={`
                        flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold
                        transition-all duration-150 active:scale-95
                        ${active.atmosphere === opt.id
                          ? 'bg-film-yellow/20 text-film-yellow border border-film-yellow/30'
                          : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'}
                      `}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 文字スタイルピッカー */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/35 font-mono tracking-widest w-10 flex-shrink-0 text-right">文字</span>
                <div className="flex gap-1.5 flex-wrap">
                  {TEXT_STYLE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => onChange({ ...active, textStyle: opt.id })}
                      className={`
                        flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold
                        transition-all duration-150 active:scale-95
                        ${active.textStyle === opt.id
                          ? 'bg-film-yellow/20 text-film-yellow border border-film-yellow/30'
                          : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'}
                      `}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
