import { useState } from 'react'
import { Button, Input } from '@stella-ds/react'
import type { SetupConfig } from '../types'

const ENV_TOKEN = import.meta.env.VITE_TEXTALIVE_TOKEN ?? ''

const PRESET_SONGS = [
  {
    label: 'いつか君と話したミライは',
    url: 'https://piapro.jp/t/--OD',
  },
  {
    label: 'フューチャーノーツ',
    url: 'https://piapro.jp/t/XiaI',
  },
  { label: 'カスタム URL を使う', url: '' },
]

interface Props {
  onStart: (cfg: SetupConfig) => void
}

export default function TokenSetup({ onStart }: Props) {
  const [token, setToken] = useState(ENV_TOKEN)
  const [presetIndex, setPresetIndex] = useState(0)
  const [customUrl, setCustomUrl] = useState('')

  const selectedUrl =
    presetIndex === PRESET_SONGS.length - 1
      ? customUrl
      : PRESET_SONGS[presetIndex].url

  const canStart = token.trim() !== '' && selectedUrl.trim() !== ''

  return (
    <div className="h-full min-h-0 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(22,21,20,0.96),rgba(10,9,9,0.97))] p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        {/* ロゴ */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-sm border border-white/10 bg-black/30 px-4 py-1.5 mb-4 text-[10px] tracking-[0.35em] text-white/40">
            <span>FILM DOOR</span>
            <span className="text-white/20">•</span>
            <span>READY</span>
          </div>
          <div className="inline-block border border-white/[0.09] px-6 py-4 mb-4 relative overflow-hidden rounded-lg bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="absolute left-0 top-0 bottom-0 w-5 film-sprocket bg-black/60" />
            <div className="absolute right-0 top-0 bottom-0 w-5 film-sprocket bg-black/60" />
            <h1 className="font-special text-4xl text-film-yellow tracking-widest mx-5">
              FilmBeat
            </h1>
          </div>
          <p className="text-white/55 text-sm tracking-[0.16em] uppercase">リリックカメラ for Magical Mirai</p>
        </div>

        <div className="space-y-5">
          {/* API トークン（env 未設定時のみ表示） */}
          {!ENV_TOKEN && (
          <div>
            <label className="block text-xs text-white/60 mb-1.5 tracking-wider uppercase">
              TextAlive App Token
            </label>
            <Input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="TextAlive Developer Portal で取得"
              autoComplete="off"
            />
            <p className="text-xs text-white/30 mt-1">
              <a
                href="https://developer.textalive.jp/"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-white/60"
              >
                TextAlive Developer Portal
              </a>{' '}
              でアプリを登録してトークンを取得してください
            </p>
          </div>
          )}

          {/* 曲選択 */}
          <div>
            <label className="block text-xs text-white/60 mb-1.5 tracking-wider uppercase">
              Song
            </label>
            <select
              value={presetIndex}
              onChange={e => setPresetIndex(Number(e.target.value))}
              className="w-full bg-black/30 border border-white/[0.09] rounded px-3 py-3
                         text-sm text-white outline-none focus:border-white/30
                         transition-colors appearance-none cursor-pointer"
            >
              {PRESET_SONGS.map((s, i) => (
                <option key={i} value={i} className="bg-zinc-900">
                  {s.label}
                </option>
              ))}
            </select>

            {presetIndex === PRESET_SONGS.length - 1 && (
              <Input
                type="url"
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="https://piapro.jp/t/..."
                className="mt-2"
              />
            )}
          </div>

          {/* スタートボタン */}
          <button
            disabled={!canStart}
            onClick={() =>
              onStart({ token: token.trim(), songUrl: selectedUrl.trim() })
            }
            className="w-full py-3.5 rounded font-bold tracking-[0.28em] text-sm uppercase
                       transition-all disabled:opacity-30 disabled:cursor-not-allowed
                       enabled:bg-film-yellow enabled:text-black
                       enabled:hover:brightness-110 enabled:active:scale-[0.98]"
          >
            Start FilmBeat
          </button>
        </div>
      </div>
    </div>
  )
}
