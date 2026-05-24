import { useState } from 'react'
import TokenSetup from './components/TokenSetup'
import PlayerView from './components/PlayerView'
import TurntableView from './components/TurntableView'
import type { CaptureItem, Phase, SetupConfig } from './types'

function revokeVideoUrls(captures: CaptureItem[]) {
  captures.forEach(capture => {
    if (capture.kind === 'video') {
      URL.revokeObjectURL(capture.dataUrl)
    }
  })
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [config, setConfig] = useState<SetupConfig | null>(null)
  const [captures, setCaptures] = useState<CaptureItem[]>([])

  const phaseStatus =
    phase === 'setup'
      ? 'SETUP'
      : phase === 'playing'
        ? 'LIVE CAPTURE'
        : `${String(captures.length).padStart(2, '0')} FRAMES`

  const phaseHint =
    phase === 'setup'
      ? 'Load token and choose a song reel'
      : phase === 'playing'
        ? 'CAPTURE ACTIVE'
        : 'Review, rewind, and download exposed frames'

  const handleStart = (cfg: SetupConfig) => {
    setConfig(cfg)
    revokeVideoUrls(captures)
    setCaptures([])
    setPhase('playing')
  }

  const handleFinish = (captured: CaptureItem[]) => {
    revokeVideoUrls(captures)
    setCaptures(captured)
    setPhase('result')
  }

  const handleBack = () => {
    setPhase('playing')
  }

  const handleRestart = () => {
    setPhase('setup')
    setConfig(null)
    revokeVideoUrls(captures)
    setCaptures([])
  }

  return (
    <div className="app-shell">
      <div className="camera-body">
        <header className="camera-topbar">
          <div className="camera-brand">
            <span className="camera-brand__badge">FILMBT</span>
            <span className="camera-brand__title">LYRIC CAM</span>
          </div>

          <div className="camera-topbar__readout">{phaseStatus}</div>
        </header>

        <div className="camera-gate-wrap">
          <div className="camera-rail camera-rail--left" aria-hidden="true" />

          <main className="camera-gate">
            <div className="camera-viewport">
              {phase === 'setup' && <TokenSetup onStart={handleStart} />}

              {phase === 'playing' && config && (
                <PlayerView
                  token={config.token}
                  songUrl={config.songUrl}
                  onFinish={handleFinish}
                />
              )}

              {phase === 'result' && config && (
                <TurntableView
                  captures={captures}
                  token={config.token}
                  songUrl={config.songUrl}
                  onBack={handleBack}
                />
              )}
            </div>
          </main>

          <div className="camera-ctrl-panel" aria-hidden="true">
            <div className="camera-grip" />
            <div className="camera-hw-btn">MNU</div>
            <div className="camera-hw-btn">Fn</div>
            <div style={{ flex: 1 }} />
            <div className="camera-multictl" />
            <div style={{ flex: 1 }} />
            <div className="camera-hw-btn">▶</div>
            <div className="camera-hw-btn">⋮</div>
          </div>
        </div>

        <footer className="camera-footer">
          <div className="camera-footer__meta">
            <span>FTT-LC1</span>
            <span>LYRIC MODE</span>
          </div>

          {phase === 'result' ? (
            <button onClick={handleRestart} className="camera-reset-button">
              ↺ 最初からやり直す
            </button>
          ) : (
            <div className="camera-footer__stamp">{phaseHint}</div>
          )}
        </footer>
      </div>
    </div>
  )
}
