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
    <div className="flex flex-col h-full">
      {phase === 'setup' && <TokenSetup onStart={handleStart} />}

      {phase === 'playing' && config && (
        <PlayerView
          token={config.token}
          songUrl={config.songUrl}
          onFinish={handleFinish}
        />
      )}

      {phase === 'result' && config && (
        <>
          <TurntableView
            captures={captures}
            token={config.token}
            songUrl={config.songUrl}
            onBack={handleBack}
          />
          <button
            onClick={handleRestart}
            className="py-2 text-xs text-white/30 hover:text-white/60
                       bg-black/40 transition-colors tracking-widest"
          >
            ↺ 最初からやり直す
          </button>
        </>
      )}
    </div>
  )
}
