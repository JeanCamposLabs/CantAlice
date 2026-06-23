import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Playback } from '../hooks/useKaraokePlayback'
import { playerController } from '../spotify/player'
import { formatTime } from '../lib/format'

export function PlayerControls({ playback }: { playback: Playback }) {
  return (
    <div className="space-y-4">
      <SeekBar playback={playback} />

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={playback.restart}
          className="grid h-12 w-12 place-items-center rounded-full text-mist/70 transition-colors hover:bg-white/10 hover:text-cream"
          title="Recomeçar"
        >
          <RotateCcw size={22} />
        </button>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={playback.toggle}
          className="grid h-16 w-16 place-items-center rounded-full text-night-900 shadow-xl"
          style={{ background: 'linear-gradient(135deg, #ffc4a3, #ff8fb1 55%, #b478ff)' }}
          title={playback.isPlaying ? 'Pausar' : 'Tocar'}
        >
          {playback.isPlaying ? (
            <Pause size={28} fill="currentColor" />
          ) : (
            <Play size={28} fill="currentColor" className="ml-1" />
          )}
        </motion.button>

        {playback.mode === 'spotify' ? (
          <VolumeControl />
        ) : (
          <div className="h-12 w-12" aria-hidden />
        )}
      </div>
    </div>
  )
}

function SeekBar({ playback }: { playback: Playback }) {
  const fillRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [label, setLabel] = useState('0:00')
  const draggingRef = useRef(false)

  // Smoothly drive the fill width every frame from the live position.
  useEffect(() => {
    let raf = 0
    const loop = () => {
      if (!draggingRef.current) {
        const pos = playback.getPosition()
        const pct = playback.durationMs > 0 ? Math.min(1, pos / playback.durationMs) : 0
        if (fillRef.current) fillRef.current.style.width = `${pct * 100}%`
        if (knobRef.current) knobRef.current.style.left = `${pct * 100}%`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playback])

  // Update the time label a few times a second (cheap, readable).
  useEffect(() => {
    const id = setInterval(() => setLabel(formatTime(playback.getPosition())), 250)
    return () => clearInterval(id)
  }, [playback])

  const ratioFromEvent = (clientX: number): number => {
    const rect = trackRef.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const r = ratioFromEvent(e.clientX)
    if (fillRef.current) fillRef.current.style.width = `${r * 100}%`
    if (knobRef.current) knobRef.current.style.left = `${r * 100}%`
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const r = ratioFromEvent(e.clientX)
    if (fillRef.current) fillRef.current.style.width = `${r * 100}%`
    if (knobRef.current) knobRef.current.style.left = `${r * 100}%`
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    const r = ratioFromEvent(e.clientX)
    playback.seek(r * playback.durationMs)
  }

  return (
    <div>
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="group relative h-6 cursor-pointer touch-none"
      >
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/12" />
        <div
          ref={fillRef}
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ width: '0%', background: 'linear-gradient(90deg, #ffc4a3, #ff8fb1)' }}
        />
        <div
          ref={knobRef}
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream opacity-0 shadow transition-opacity group-hover:opacity-100"
          style={{ left: '0%' }}
        />
      </div>
      <div className="flex justify-between text-xs text-mist/50">
        <span>{label}</span>
        <span>{formatTime(playback.durationMs)}</span>
      </div>
    </div>
  )
}

function VolumeControl() {
  const [volume, setVolume] = useState(0.8)
  useEffect(() => {
    playerController.getVolume().then(setVolume).catch(() => {})
  }, [])
  return (
    <div className="group relative grid h-12 w-12 place-items-center">
      <Volume2 size={22} className="text-mist/70" />
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="glass-strong rounded-full px-3 py-2">
          <input
            type="range"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value)
              setVolume(v)
              playerController.setVolume(v)
            }}
            className="h-1 w-24 accent-rose-400"
          />
        </div>
      </div>
    </div>
  )
}
