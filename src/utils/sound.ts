type SoundKind = "tap" | "success" | "notify" | "error"
type AmbientTrack = "breathing" | "meditation" | "rain" | "ocean" | "forest"

let sharedCtx: AudioContext | null = null
let audioArmed = false
let ambientNodes: Array<OscillatorNode | GainNode | BiquadFilterNode | AudioBufferSourceNode> = []
let ambientKey: AmbientTrack | null = null

function getCtx() {
  if (typeof window === "undefined") return null
  const AC = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!audioArmed) return null
  if (!sharedCtx) sharedCtx = new AC()
  return sharedCtx
}

function tone(ctx: AudioContext, freq: number, duration: number, startAt: number, type: OscillatorType, volume: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.02)
}

export function armAudioContext() {
  audioArmed = true
  if (!sharedCtx) return
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume().catch(() => undefined)
  }
}

export function playAppSound(kind: SoundKind) {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime

  if (kind === "tap") {
    tone(ctx, 520, 0.06, now, "triangle", 0.03)
    return
  }
  if (kind === "success") {
    tone(ctx, 480, 0.08, now, "sine", 0.035)
    tone(ctx, 740, 0.12, now + 0.06, "sine", 0.04)
    return
  }
  if (kind === "notify") {
    tone(ctx, 620, 0.08, now, "square", 0.028)
    tone(ctx, 880, 0.09, now + 0.11, "square", 0.03)
    return
  }
  tone(ctx, 280, 0.1, now, "sawtooth", 0.02)
}

function stopAmbientNodes() {
  ambientNodes.forEach((node) => {
    try {
      if ("stop" in node && typeof node.stop === "function") node.stop()
    } catch {
      // ignore
    }
    try {
      node.disconnect()
    } catch {
      // ignore
    }
  })
  ambientNodes = []
  ambientKey = null
}

function createNoiseBuffer(ctx: AudioContext, seconds = 2) {
  const sampleRate = ctx.sampleRate
  const frameCount = sampleRate * seconds
  const buffer = ctx.createBuffer(1, frameCount, sampleRate)
  const channel = buffer.getChannelData(0)
  for (let i = 0; i < frameCount; i += 1) {
    channel[i] = (Math.random() * 2 - 1) * 0.18
  }
  return buffer
}

export function stopAmbientTrack() {
  stopAmbientNodes()
}

export function startAmbientTrack(track: AmbientTrack) {
  const ctx = getCtx()
  if (!ctx) return
  if (sharedCtx?.state === "suspended") {
    sharedCtx.resume().catch(() => undefined)
  }
  if (ambientKey === track) return
  stopAmbientNodes()
  ambientKey = track
  const now = ctx.currentTime

  if (track === "breathing") {
    const gain = ctx.createGain()
    gain.gain.value = 0.025
    gain.connect(ctx.destination)

    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.setValueAtTime(196, now)
    osc.frequency.linearRampToValueAtTime(264, now + 2.2)
    osc.frequency.linearRampToValueAtTime(196, now + 4.4)
    osc.connect(gain)
    osc.start()

    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = 0.18
    lfoGain.gain.value = 0.02
    lfo.connect(lfoGain)
    lfoGain.connect(gain.gain)
    lfo.start()

    ambientNodes = [osc, gain, lfo, lfoGain]
    return
  }

  if (track === "meditation") {
    const gain = ctx.createGain()
    gain.gain.value = 0.018
    gain.connect(ctx.destination)

    const base = ctx.createOscillator()
    base.type = "sine"
    base.frequency.value = 174
    base.connect(gain)
    base.start()

    const shimmer = ctx.createOscillator()
    shimmer.type = "triangle"
    shimmer.frequency.value = 528
    const shimmerGain = ctx.createGain()
    shimmerGain.gain.value = 0.008
    shimmer.connect(shimmerGain)
    shimmerGain.connect(ctx.destination)
    shimmer.start()

    ambientNodes = [base, gain, shimmer, shimmerGain]
    return
  }

  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = createNoiseBuffer(ctx, 3)
  noiseSource.loop = true
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()

  if (track === "rain") {
    filter.type = "lowpass"
    filter.frequency.value = 900
    gain.gain.value = 0.05
  } else if (track === "ocean") {
    filter.type = "bandpass"
    filter.frequency.value = 320
    filter.Q.value = 0.5
    gain.gain.value = 0.04
  } else {
    filter.type = "highpass"
    filter.frequency.value = 500
    gain.gain.value = 0.03
  }

  noiseSource.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  noiseSource.start()

  ambientNodes = [noiseSource, filter, gain]
}
