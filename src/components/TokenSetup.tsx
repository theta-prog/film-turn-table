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
    <div className="min-h-screen flex items-center justify-center bg-film-dark p-6">
      <div className="w-full max-w-md">
        {/* ロゴ */}
        <div className="text-center mb-10">
          <div className="inline-block border-2 border-white/20 px-6 py-3 mb-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-5 film-sprocket bg-black/60" />
            <div className="absolute right-0 top-0 bottom-0 w-5 film-sprocket bg-black/60" />
            <h1 className="font-special text-4xl text-film-yellow tracking-widest mx-5">
              FilmBeat
            </h1>
          </div>
          <p className="text-white/50 text-sm">リリックカメラ for Magical Mirai</p>
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
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2.5
                         text-sm text-white outline-none focus:border-film-yellow/50
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
            className="w-full py-3 rounded font-bold tracking-widest text-sm uppercase
                       transition-all disabled:opacity-30 disabled:cursor-not-allowed
                       enabled:bg-film-yellow enabled:text-black
                       enabled:hover:bg-yellow-200 enabled:active:scale-95"
          >
            Start FilmBeat
          </button>
        </div>
      </div>
    </div>
  )
}
