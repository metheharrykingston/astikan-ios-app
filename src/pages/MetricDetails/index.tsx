import { useEffect, useMemo, useRef, useState, type ReactElement } from "react"
import { FiActivity, FiArrowDownRight, FiArrowLeft, FiArrowUpRight, FiCalendar, FiCamera, FiCheckCircle, FiDroplet, FiHeart, FiPlayCircle, FiShield, FiTrendingUp, FiX, FiZap } from "react-icons/fi"
import { useNavigate, useParams } from "react-router-dom"
import { getLatestVital, getVitalHistory, saveVitalReading } from "../../services/vitalsApi"
import { getStressHistory } from "../../services/stressApi"
import "./metric-details.css"

type WindowKey = "7D" | "14D" | "30D"
type BloodPressurePoint = { sys: number; dia: number; eventAt: string }

type MetricConfig = {
  title: string
  current: string
  unit: string
  subtitle: string
  insight: string
  icon: ReactElement
  tone: "red" | "blue" | "orange" | "green"
  windows: Record<WindowKey, number[]>
  tips: string[]
}

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack"

type MealEntry = {
  id: string
  type: MealType
  name: string
  calories: number
  notes: string
  image?: string
  loggedAt: string
}

const details: Record<string, MetricConfig> = {
  "heart-rate": {
    title: "Daily Heartbeat Tracker",
    current: "72",
    unit: "bpm",
    subtitle: "Within healthy resting range",
    insight: "Stable rhythm with no irregular spikes in recent trend.",
    icon: <FiHeart />,
    tone: "red",
    windows: {
      "7D": [74, 72, 75, 71, 73, 72, 70],
      "14D": [76, 74, 73, 72, 75, 71, 73, 72, 70, 72, 74, 71, 72, 72],
      "30D": [77, 76, 75, 74, 75, 74, 73, 72, 73, 72, 71, 72, 74, 73, 72, 72, 71, 70, 72, 73, 72, 71, 72, 73, 72, 71, 70, 72, 72, 72],
    },
    tips: ["Hydrate before noon", "Sleep at fixed timing", "Limit caffeine after 4 PM"],
  },
  "blood-pressure": {
    title: "Blood Pressure",
    current: "120/80",
    unit: "mmHg",
    subtitle: "Normal blood pressure reading",
    insight: "Pressure trend is controlled. No sustained high readings found.",
    icon: <FiActivity />,
    tone: "blue",
    windows: {
      "7D": [118, 120, 122, 121, 119, 120, 118],
      "14D": [122, 121, 120, 119, 120, 121, 122, 121, 120, 119, 120, 121, 119, 118],
      "30D": [124, 123, 122, 121, 121, 120, 120, 119, 120, 121, 122, 121, 120, 120, 119, 118, 119, 120, 121, 120, 119, 120, 121, 120, 119, 118, 119, 119, 118, 118],
    },
    tips: ["Reduce high-salt snacks", "Walk 20 mins daily", "Monitor at same time each day"],
  },
  calories: {
    title: "Calories",
    current: "1850",
    unit: "kcal",
    subtitle: "On-track for daily energy goal",
    insight: "Calorie intake is consistent with your weekly average.",
    icon: <FiZap />,
    tone: "orange",
    windows: {
      "7D": [1780, 1860, 1920, 1805, 1870, 1815, 1850],
      "14D": [1720, 1805, 1875, 1900, 1760, 1840, 1810, 1895, 1920, 1785, 1830, 1865, 1795, 1850],
      "30D": [1760, 1820, 1890, 1905, 1740, 1855, 1810, 1875, 1925, 1800, 1780, 1860, 1835, 1890, 1755, 1845, 1885, 1810, 1865, 1790, 1825, 1900, 1775, 1850, 1880, 1805, 1765, 1860, 1825, 1855],
    },
    tips: ["Maintain protein with meals", "Add a 10-min walk after lunch", "Hydrate to curb false hunger"],
  },
  sugar: {
    title: "Sugar Count",
    current: "110",
    unit: "mg/dL",
    subtitle: "Fasting range is within target",
    insight: "Sugar values are stable with no sharp spikes this week.",
    icon: <FiDroplet />,
    tone: "green",
    windows: {
      "7D": [112, 110, 108, 114, 109, 111, 110],
      "14D": [115, 112, 110, 108, 114, 111, 109, 110, 112, 108, 109, 111, 110, 109],
      "30D": [116, 114, 112, 111, 110, 109, 111, 112, 110, 109, 108, 110, 111, 109, 112, 110, 108, 109, 110, 112, 111, 109, 108, 110, 111, 109, 110, 108, 109, 110],
    },
    tips: ["Log readings at the same time daily", "Limit sugary snacks", "Walk after meals to stabilize glucose"],
  },
  meditation: {
    title: "Meditation Analysis",
    current: "12",
    unit: "mins",
    subtitle: "Short calm sessions tracked",
    insight: "Short quiet sessions help settle the body and reduce mental noise through the day.",
    icon: <FiHeart />,
    tone: "red",
    windows: {
      "7D": [5, 8, 0, 10, 12, 6, 12],
      "14D": [0, 5, 6, 8, 10, 0, 12, 6, 7, 10, 8, 12, 6, 12],
      "30D": [0, 4, 5, 6, 8, 0, 10, 6, 7, 8, 12, 6, 5, 10, 0, 6, 8, 12, 5, 7, 10, 6, 12, 8, 0, 5, 6, 8, 10, 12],
    },
    tips: ["Keep one quiet 10-minute block daily", "Use low light before you start", "Log how calm you feel after the session"],
  },
}

function avg(values: number[]) {
  return values.reduce((sum, item) => sum + item, 0) / values.length
}

export default function MetricDetails() {
  const navigate = useNavigate()
  const { metricId } = useParams()
  const metric = details[metricId ?? "heart-rate"] ?? details["heart-rate"]
  const [windowKey, setWindowKey] = useState<WindowKey>("7D")
  const [measureStage, setMeasureStage] = useState<"idle" | "guide" | "prepare" | "measuring" | "done">("idle")
  const [measureProgress, setMeasureProgress] = useState(0)
  const [measureBpm, setMeasureBpm] = useState(72)
  const [cameraError, setCameraError] = useState("")
  const [lowSignal, setLowSignal] = useState(false)
  const [signalQuality, setSignalQuality] = useState(0)
  const [placementMessage, setPlacementMessage] = useState("Place your finger properly over the rear camera and flash.")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [historyOverride, setHistoryOverride] = useState<number[] | null>(null)
  const [latestOverride, setLatestOverride] = useState<number | null>(null)
  const [bpLatest, setBpLatest] = useState<{ sys: number | null; dia: number | null; eventAt?: string } | null>(null)
  const [bpHistory, setBpHistory] = useState<BloodPressurePoint[] | null>(null)
  const [meditationHistory, setMeditationHistory] = useState<number[] | null>(null)
  const [meditationLatest, setMeditationLatest] = useState<number | null>(null)
  const [saveTimeoutReached, setSaveTimeoutReached] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const measureStartRef = useRef<number | null>(null)
  const samplesRef = useRef<Array<{ t: number; v: number }>>([])
  const rafRef = useRef<number | null>(null)
  const savedRef = useRef(false)
  const retryTimerRef = useRef<number | null>(null)
  const history = metric.windows[windowKey]
  const dynamicHistory = metricId === "blood-pressure"
    ? bpHistory?.map((point) => point.sys) ?? history
    : metricId === "meditation"
      ? meditationHistory ?? history
    : historyOverride ?? history

  const max = Math.max(...dynamicHistory)
  const min = Math.min(...dynamicHistory)
  const range = max - min || 1
  const average = avg(dynamicHistory)
  const trendDelta = dynamicHistory[dynamicHistory.length - 1] - dynamicHistory[0]
  const trendText = trendDelta > 0 ? `+${trendDelta.toFixed(1)}` : trendDelta.toFixed(1)
  const displayCurrentNumber = latestOverride ?? Number(metric.current)
  const todayKey = new Date().toISOString().slice(0, 10)
  const mealStorageKey = `calorie_meals_${todayKey}`
  const mealTypes: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"]
  const lastCheckDate = localStorage.getItem("heart_rate_check_date")
  const lastCheckAt = localStorage.getItem("heart_rate_check_at")
  const checkedToday = lastCheckDate === todayKey
  const hrSubtitle =
    displayCurrentNumber > 100
      ? "Elevated resting rate today"
      : displayCurrentNumber < 55
        ? "Below typical resting range"
        : "Within healthy resting range"
  const hrInsight =
    trendDelta > 4
      ? "AI insight: Your trend is rising this week. Prioritize hydration, sleep, and reduce stimulants."
      : trendDelta < -4
        ? "AI insight: Your trend is improving. Keep recovery and light activity consistent."
        : "AI insight: Stable rhythm with no major spikes in your recent trend."
  const hrTips = displayCurrentNumber > 100
    ? ["Short recovery walk", "Hydrate + electrolytes", "Reduce caffeine today"]
    : ["Hydrate before noon", "Sleep at fixed timing", "Limit caffeine after 4 PM"]
  const heartPlacementState = useMemo<"waiting" | "good" | "adjust">(() => {
    if (measureStage === "guide" || measureStage === "idle" || measureStage === "done") return "waiting"
    if (signalQuality >= 0.35 && !lowSignal) return "good"
    return "adjust"
  }, [lowSignal, measureStage, signalQuality])
  const summaryStats = [
    { label: "Average", icon: <FiActivity />, value: `${average.toFixed(1)} ${metric.unit}` },
    { label: "Lowest", icon: <FiArrowDownRight />, value: `${min.toFixed(1)} ${metric.unit}` },
    { label: "Highest", icon: <FiArrowUpRight />, value: `${max.toFixed(1)} ${metric.unit}` },
    { label: `${windowKey} Trend`, icon: <FiTrendingUp />, value: `${trendText} ${metric.unit}`, accent: "trend" as const },
  ]
  const chartLabelStep = dynamicHistory.length <= 7 ? 1 : dynamicHistory.length <= 14 ? 2 : 5

  const displayValue =
    metricId === "blood-pressure" && bpLatest?.sys && bpLatest?.dia
      ? `${Math.round(bpLatest.sys)}/${Math.round(bpLatest.dia)}`
      : metricId === "meditation"
        ? String(meditationLatest ?? displayCurrentNumber)
        : String(displayCurrentNumber)
  const displayUnit = metricId === "blood-pressure" ? "mmHg" : metric.unit
  const bpDiastolicHistory = bpHistory?.map((point) => point.dia) ?? []
  const bpCombinedLatest = bpLatest?.sys && bpLatest?.dia ? `${Math.round(bpLatest.sys)}/${Math.round(bpLatest.dia)}` : displayValue
  const bpLineWidth = 320
  const bpLineHeight = 188
  const bpDates = dynamicHistory.map((_, index) => `May ${12 + index}`)
  const toBpY = (value: number) => {
    const normalized = (value - 60) / 80
    return bpLineHeight - normalized * bpLineHeight
  }
  const bpSysPoints = dynamicHistory.map((value, index) => {
    const x = dynamicHistory.length > 1 ? (index / (dynamicHistory.length - 1)) * bpLineWidth : bpLineWidth / 2
    return `${x},${toBpY(value)}`
  }).join(" ")
  const bpDiaPoints = bpDiastolicHistory.map((value, index) => {
    const x = bpDiastolicHistory.length > 1 ? (index / (bpDiastolicHistory.length - 1)) * bpLineWidth : bpLineWidth / 2
    return `${x},${toBpY(value)}`
  }).join(" ")
  const bpStatus = useMemo(() => {
    if (!bpLatest?.sys || !bpLatest?.dia) return { label: "Track", copy: "Add your reading to start live trend", tone: "neutral" as const }
    if (bpLatest.sys <= 120 && bpLatest.dia <= 80) return { label: "Normal", copy: "Normal blood pressure reading", tone: "good" as const }
    if (bpLatest.sys >= 140 || bpLatest.dia >= 90) return { label: "Elevated", copy: "Reading needs quick follow-up", tone: "high" as const }
    return { label: "Watch", copy: "Keep monitoring this week", tone: "mid" as const }
  }, [bpLatest?.dia, bpLatest?.sys])

  const [mealEntries, setMealEntries] = useState<MealEntry[]>(() => {
    if (metricId !== "calories") return []
    const raw = localStorage.getItem(mealStorageKey)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as MealEntry[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const [mealDraft, setMealDraft] = useState({
    type: "Breakfast" as MealType,
    name: "",
    calories: "",
    notes: "",
    image: "",
  })
  const [mealScanState, setMealScanState] = useState<"idle" | "scanning" | "done">("idle")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (metricId !== "calories") return
    localStorage.setItem(mealStorageKey, JSON.stringify(mealEntries))
  }, [mealEntries, mealStorageKey, metricId])

  function handlePickMealImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      setMealDraft((prev) => ({ ...prev, image: result }))
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  function estimateCalories() {
    if (mealScanState === "scanning") return
    if (!mealDraft.image && !mealDraft.name.trim()) {
      setMealDraft((prev) => ({ ...prev, notes: prev.notes || "Add a meal name or photo to estimate calories." }))
      return
    }
    setMealScanState("scanning")
    const base = mealDraft.type === "Breakfast" ? 350 : mealDraft.type === "Lunch" ? 600 : mealDraft.type === "Dinner" ? 650 : 220
    const jitter = Math.round((Math.random() * 120) - 60)
    window.setTimeout(() => {
      const estimate = Math.max(120, base + jitter)
      setMealDraft((prev) => ({ ...prev, calories: String(estimate) }))
      setMealScanState("done")
      window.setTimeout(() => setMealScanState("idle"), 1200)
    }, 900)
  }

  function saveMeal() {
    const name = mealDraft.name.trim() || `${mealDraft.type} meal`
    const calories = Number(mealDraft.calories) || 0
    if (!mealDraft.image && !mealDraft.name.trim()) {
      setMealDraft((prev) => ({ ...prev, notes: prev.notes || "Add a meal name or photo before saving." }))
      return
    }
    const entry: MealEntry = {
      id: `meal-${Date.now()}`,
      type: mealDraft.type,
      name,
      calories,
      notes: mealDraft.notes.trim(),
      image: mealDraft.image || undefined,
      loggedAt: new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
    }
    const nextTotal = mealEntries.reduce((sum, item) => sum + item.calories, 0) + calories
    setMealEntries((prev) => [entry, ...prev])
    setMealDraft({ type: mealDraft.type, name: "", calories: "", notes: "", image: "" })

    // Persist a daily total so trend charts can use backend data (deduped by date on read).
    void saveVitalReading({ metric: "calories", value: nextTotal, unit: "kcal", source: "manual" }).catch(() => undefined)
  }

  useEffect(() => {
    if (metricId !== "meditation") return
    let active = true
    void getStressHistory("meditation", windowKey === "7D" ? 7 : windowKey === "14D" ? 14 : 30)
      .then((response) => {
        if (!active) return
        const durations = [...(response.entries ?? [])]
          .reverse()
          .map((entry) => Number(entry.durationMinutes) || 0)
          .filter((value) => value >= 0)
        if (durations.length > 0) {
          setMeditationHistory(durations)
          setMeditationLatest(durations[durations.length - 1] ?? null)
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [metricId, windowKey])

  useEffect(() => {
    if (measureStage !== "prepare") return
    const timer = window.setTimeout(() => setMeasureStage("measuring"), 700)
    return () => window.clearTimeout(timer)
  }, [measureStage])

  useEffect(() => {
    if (measureStage === "idle" || measureStage === "done" || measureStage === "guide") {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          if (track.kind === "video") {
            try {
              ;(track as any).applyConstraints({ advanced: [{ torch: false }] })
            } catch {
              // ignore torch cleanup
            }
          }
          track.stop()
        })
        streamRef.current = null
      }
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access not supported.")
      return
    }
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
          audio: false,
        })
        streamRef.current = stream
        const track = stream.getVideoTracks()[0]
        if (track) {
          const caps = (track as any).getCapabilities?.()
          if (caps?.torch) {
            try {
              await (track as any).applyConstraints({ advanced: [{ torch: true }] })
            } catch {
              // ignore torch failures
            }
          }
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
      } catch (error) {
        setCameraError(error instanceof Error ? error.message : "Camera permission denied.")
      }
    }
    void start()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [measureStage])

  useEffect(() => {
    if (measureStage !== "measuring") return
    const durationMs = 25000
    measureStartRef.current = performance.now()
    samplesRef.current = []
    savedRef.current = false

    const tick = () => {
      const now = performance.now()
      const start = measureStartRef.current ?? now
      const elapsed = now - start
      const progress = Math.min(100, Math.round((elapsed / durationMs) * 100))
      setMeasureProgress(progress)

      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState >= 2) {
        const size = 64
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, size, size)
          const image = ctx.getImageData(22, 22, 20, 20).data
          let gSum = 0
          let rSum = 0
          let bSum = 0
          const count = image.length / 4
          for (let i = 0; i < image.length; i += 4) {
            rSum += image[i]
            gSum += image[i + 1]
            bSum += image[i + 2]
          }
          const avgR = rSum / count
          const avgG = gSum / count
          const avgB = bSum / count
          samplesRef.current.push({ t: now, v: avgG })
          const windowMs = 10000
          samplesRef.current = samplesRef.current.filter((s) => now - s.t <= windowMs)

          const values = samplesRef.current.map((s) => s.v)
          const mean = values.reduce((sum, v) => sum + v, 0) / (values.length || 1)
          const detrended = values.map((v) => v - mean)
          const variance = detrended.reduce((sum, v) => sum + Math.pow(v, 2), 0) / (detrended.length || 1)
          const std = Math.sqrt(variance)
          const quality = Math.min(1, std / 5)
          const brightness = (avgR + avgG + avgB) / 3
          const redDominance = avgR - ((avgG + avgB) / 2)
          if (brightness < 16) {
            setPlacementMessage("Too dark right now. Cover the camera and flash gently, then hold still.")
          } else if (redDominance < 6) {
            setPlacementMessage("Place your index finger directly on the rear camera until the view turns warm red.")
          } else if (quality >= 0.35) {
            setPlacementMessage("Finger placement looks good. Hold steady.")
          } else {
            setPlacementMessage("Almost there. Keep your finger flat and cover the camera fully.")
          }
          setSignalQuality(quality)
          setLowSignal(quality < 0.2)
          const threshold = std * 0.4

          const peaks: number[] = []
          const minInterval = 380
          let lastPeak = 0
          for (let i = 1; i < samplesRef.current.length - 1; i += 1) {
            const prev = detrended[i - 1]
            const curr = detrended[i]
            const next = detrended[i + 1]
            if (curr > threshold && curr > prev && curr >= next) {
              const t = samplesRef.current[i].t
              if (!lastPeak || t - lastPeak > minInterval) {
                peaks.push(t)
                lastPeak = t
              }
            }
          }
          if (peaks.length >= 2) {
            const diffs = peaks.slice(1).map((t, idx) => t - peaks[idx])
            const avgDiff = diffs.reduce((sum, v) => sum + v, 0) / diffs.length
            const bpm = Math.round(60000 / avgDiff)
            if (bpm >= 45 && bpm <= 140) {
              setMeasureBpm(bpm)
            }
          }
        }
      }

      if (progress >= 100) {
        setMeasureProgress(100)
        setMeasureStage("done")
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [measureStage])

  const startMeasurement = () => {
    setMeasureProgress(0)
    setMeasureBpm(72)
    setCameraError("")
    setLowSignal(false)
    setSignalQuality(0)
    setPlacementMessage("Place your finger properly over the rear camera and flash.")
    setSaveStatus("idle")
    setMeasureStage("guide")
  }

  useEffect(() => {
    if (measureStage !== "done" || savedRef.current) return
    savedRef.current = true
    setSaveTimeoutReached(false)
    const timeoutId = window.setTimeout(() => {
      setSaveTimeoutReached(true)
      setSaveStatus("error")
    }, 120000)
    const saveNow = async () => {
      try {
        setSaveStatus("saving")
        await saveVitalReading({
          metric: "heart_rate",
          value: measureBpm,
          unit: "bpm",
          source: "camera",
          signalQuality: Number(signalQuality.toFixed(2)),
        })
        setSaveStatus("saved")
        localStorage.setItem("heart_rate_check_date", todayKey)
        localStorage.setItem("heart_rate_check_at", new Date().toISOString())
        const latest = await getLatestVital("heart_rate")
        if (typeof latest?.value === "number") {
          setLatestOverride(latest.value)
        }
        const historyResp = await getVitalHistory("heart_rate", 30)
        if (historyResp?.points?.length) {
          const values = historyResp.points
            .slice()
            .reverse()
            .map((point) => point.value)
          setHistoryOverride(values)
        }
        window.clearTimeout(timeoutId)
      } catch (error) {
        setSaveStatus("error")
        console.warn("Failed to save vital reading", error)
        if (!saveTimeoutReached) {
          retryTimerRef.current = window.setTimeout(saveNow, 4000)
        }
      }
    }
    void saveNow()
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [measureStage, measureBpm, signalQuality])

  useEffect(() => {
    if (metricId !== "heart-rate") return
    let active = true
    void (async () => {
      try {
        const latest = await getLatestVital("heart_rate")
        if (!active) return
        if (typeof latest?.value === "number") {
          setLatestOverride(latest.value)
        }
        const historyResp = await getVitalHistory("heart_rate", 30)
        if (!active) return
        if (historyResp?.points?.length) {
          const values = historyResp.points
            .slice()
            .reverse()
            .map((point) => point.value)
          setHistoryOverride(values)
        }
      } catch {
        // keep fallback data
      }
    })()
    return () => {
      active = false
    }
  }, [metricId])

  useEffect(() => {
    if (metricId !== "blood-pressure") return
    let active = true
    void (async () => {
      try {
        const [sys, dia] = await Promise.all([
          getLatestVital("blood_pressure_sys"),
          getLatestVital("blood_pressure_dia"),
        ])
        if (!active) return
        setBpLatest({
          sys: typeof sys?.value === "number" ? sys.value : null,
          dia: typeof dia?.value === "number" ? dia.value : null,
          eventAt: sys?.eventAt || dia?.eventAt,
        })
        const [sysHistoryResp, diaHistoryResp] = await Promise.all([
          getVitalHistory("blood_pressure_sys", 30),
          getVitalHistory("blood_pressure_dia", 30),
        ])
        if (!active) return
        const sysPoints = sysHistoryResp?.points?.slice().reverse() ?? []
        const diaPoints = diaHistoryResp?.points?.slice().reverse() ?? []
        const length = Math.min(sysPoints.length, diaPoints.length)
        if (length > 0) {
          const nextHistory = Array.from({ length }).map((_, index) => ({
            sys: sysPoints[index]?.value ?? 0,
            dia: diaPoints[index]?.value ?? 0,
            eventAt: sysPoints[index]?.eventAt || diaPoints[index]?.eventAt || new Date().toISOString(),
          }))
          setBpHistory(nextHistory)
        }
      } catch {
        // keep fallback data
      }
    })()
    return () => {
      active = false
    }
  }, [metricId])

  useEffect(() => {
    if (metricId !== "calories") return
    let active = true
    const load = async () => {
      try {
        const historyResp = await getVitalHistory("calories", 120)
        if (!active) return
        const points = historyResp?.points ?? []
        const dailyLatest = new Map<string, number>()
        for (const point of points) {
          const dateKey = (point.eventAt || "").slice(0, 10)
          if (!dateKey) continue
          if (!dailyLatest.has(dateKey)) {
            dailyLatest.set(dateKey, Number(point.value) || 0)
          }
        }

        const days = windowKey === "7D" ? 7 : windowKey === "14D" ? 14 : 30
        const series: number[] = []
        let carry: number | null = null
        for (let i = days - 1; i >= 0; i -= 1) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const key = d.toISOString().slice(0, 10)
          const value = dailyLatest.has(key) ? (dailyLatest.get(key) as number) : null
          if (typeof value === "number") {
            carry = value
            series.push(value)
          } else if (typeof carry === "number") {
            series.push(carry)
          } else {
            series.push(0)
          }
        }

        // If backend has no data, fall back to local meal storage for a few days.
        if (series.every((v) => v === 0)) {
          const fallback: number[] = []
          let fallbackCarry: number | null = null
          for (let i = days - 1; i >= 0; i -= 1) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const key = d.toISOString().slice(0, 10)
            const mealKey = `calorie_meals_${key}`
            try {
              const raw = localStorage.getItem(mealKey)
              if (raw) {
                const parsed = JSON.parse(raw) as Array<{ calories?: number }>
                const total = parsed.reduce((sum, row) => sum + (Number(row.calories) || 0), 0)
                fallbackCarry = total
                fallback.push(total)
                continue
              }
            } catch {
              // ignore parse issues
            }
            if (typeof fallbackCarry === "number") {
              fallback.push(fallbackCarry)
            } else {
              fallback.push(0)
            }
          }
          setHistoryOverride(fallback)
          setLatestOverride(fallback[fallback.length - 1] ?? null)
          return
        }

        setHistoryOverride(series)
        setLatestOverride(series[series.length - 1] ?? null)
      } catch {
        // keep fallback data
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [metricId, windowKey])

  return (
    <main className="metric-detail-page app-page-enter">
      <header className="metric-detail-header app-fade-stagger">
        <button className="metric-back app-pressable" type="button" onClick={() => navigate(-1)} aria-label="Back">
          <FiArrowLeft />
        </button>
        <h1>{metricId === "heart-rate" ? "Daily Heartbeat Tracker" : `${metric.title} Analysis`}</h1>
      </header>

      <section className="metric-detail-shell app-content-slide">
        {metricId === "blood-pressure" ? (
          <article className="bp-analysis-hero app-fade-stagger">
            <div className="bp-analysis-hero-icon">
              <span className="bp-analysis-heart">{metric.icon}</span>
              <span className="bp-analysis-live-dot" />
            </div>
            <div className="bp-analysis-hero-copy">
              <span className={`bp-analysis-status ${bpStatus.tone}`}>
                <FiCheckCircle />
                {bpStatus.label}
              </span>
              <h2>{bpCombinedLatest} <small>mmHg</small></h2>
              <p>{bpStatus.copy}</p>
              <div className="bp-analysis-meta">
                <span><FiCalendar /> {bpLatest?.eventAt ? new Date(bpLatest.eventAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Today"}</span>
                <span>•</span>
                <span><FiCamera /> Manual Entry</span>
              </div>
            </div>
          </article>
        ) : (
          <article className={`metric-hero ${metric.tone} app-fade-stagger`}>
            <span className="hero-icon">{metric.icon}</span>
            <div>
              <h2>{displayValue} <small>{displayUnit}</small></h2>
              <p>{metricId === "heart-rate" ? hrSubtitle : metric.subtitle}</p>
            </div>
          </article>
        )}

        {metricId === "heart-rate" && !checkedToday && (
          <article className="metric-measure-card app-fade-stagger">
            <div className="metric-measure-copy">
              <span className="measure-kicker">Daily camera scan</span>
              <h3>Check your heartbeat in one guided tap</h3>
              <p>Build your daily trend, spot small changes faster, and save a cleaner AI-led reading log.</p>
            </div>
            <button className="measure-btn app-pressable" type="button" onClick={startMeasurement}>
              <FiPlayCircle />
              <span>Start Checking Heart Rate</span>
            </button>
          </article>
        )}

        {metricId === "heart-rate" && checkedToday && (
          <article className="metric-measure-card app-fade-stagger">
            <div>
              <h3>Heart rate checked today</h3>
              <p>{lastCheckAt ? `Last check: ${new Date(lastCheckAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : "Saved to your health log."}</p>
            </div>
          </article>
        )}

        {(metricId === "blood-pressure" || metricId === "sugar") && (
          <article className={`metric-measure-card app-fade-stagger ${metricId === "blood-pressure" ? "metric-measure-card--bp" : ""}`}>
            {metricId === "blood-pressure" ? (
              <div className="bp-track-cta bp-track-cta--image">
                <img src="/assets/reference-ui/bp-track-card.webp" alt="Daily tracking card" className="bp-track-card-image" />
              </div>
            ) : (
              <div>
                <h3>Daily tracking</h3>
                <p>Log your reading on the tracking page to keep the analysis accurate.</p>
              </div>
            )}
            <button
              className="measure-btn app-pressable"
              type="button"
              onClick={() => navigate(metricId === "sugar" ? "/metric/sugar/log" : "/metric/blood-pressure/log")}
            >
              {metricId === "sugar" ? "Log blood sugar" : "Log blood pressure"}
            </button>
          </article>
        )}

        <article className="metric-window-card app-fade-stagger">
          <h3>Time Window</h3>
          <div className="window-switch">
            {(["7D", "14D", "30D"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={`window-btn app-pressable ${windowKey === item ? "active" : ""}`}
                onClick={() => setWindowKey(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </article>

        <article className="metric-summary-grid app-fade-stagger">
          {summaryStats.map((item) => (
            <section key={item.label} className={`summary-item ${item.accent ?? ""}`}>
              <span className="summary-icon">{item.icon}</span>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </section>
          ))}
        </article>

        {metricId === "calories" && (
          <article className="meal-tracker-card app-fade-stagger">
            <header className="meal-tracker-head">
              <div>
                <h3>Daily Meal Tracker</h3>
                <p>Log breakfast, lunch, dinner, and snacks with a photo scan.</p>
              </div>
              <div className="meal-total">
                <span>Total today</span>
                <strong>{mealEntries.reduce((sum, item) => sum + item.calories, 0)} kcal</strong>
              </div>
            </header>

            <div className="meal-grid">
              {mealTypes.map((type) => {
                const latest = mealEntries.find((item) => item.type === type)
                return (
                  <div key={type} className="meal-slot">
                    <div className="meal-slot-head">
                      <h4>{type}</h4>
                      <span>{latest ? `${latest.calories} kcal` : "Not logged"}</span>
                    </div>
                    {latest ? (
                      <div className="meal-slot-body">
                        {latest.image ? <img src={latest.image} alt={latest.name} /> : <div className="meal-photo-fallback">No image</div>}
                        <div>
                          <p>{latest.name}</p>
                          <small>{latest.loggedAt}</small>
                        </div>
                      </div>
                    ) : (
                      <div className="meal-slot-empty">Add your {type.toLowerCase()} to see insights.</div>
                    )}
                    <button
                      type="button"
                      className={`meal-chip ${mealDraft.type === type ? "active" : ""}`}
                      onClick={() => setMealDraft((prev) => ({ ...prev, type }))}
                    >
                      Add {type}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="meal-form">
              <div className="meal-form-row">
                <label>
                  Meal name
                  <input
                    className="meal-input"
                    placeholder="E.g., Poha with peanuts"
                    value={mealDraft.name}
                    onChange={(e) => setMealDraft((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </label>
                <label>
                  Calories (estimated)
                  <input
                    className="meal-input"
                    placeholder="Auto estimate"
                    value={mealDraft.calories}
                    onChange={(e) => setMealDraft((prev) => ({ ...prev, calories: e.target.value }))}
                  />
                </label>
              </div>
              <label>
                Notes
                <input
                  className="meal-input"
                  placeholder="Add ingredients or portion size"
                  value={mealDraft.notes}
                  onChange={(e) => setMealDraft((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </label>
              <div className="meal-actions">
                <button type="button" className="meal-btn secondary" onClick={() => fileInputRef.current?.click()}>
                  <FiCamera /> Add food photo
                </button>
                <button type="button" className="meal-btn" onClick={estimateCalories} disabled={mealScanState === "scanning"}>
                  {mealScanState === "scanning" ? "Scanning..." : "Scan & estimate"}
                </button>
                <button type="button" className="meal-btn primary" onClick={saveMeal}>
                  Save meal
                </button>
              </div>
              {!!mealDraft.image && (
                <div className="meal-preview">
                  <img src={mealDraft.image} alt="Meal preview" />
                  <span>{mealDraft.type} preview</span>
                </div>
              )}
            </div>
          </article>
        )}

        {metricId === "blood-pressure" ? (
          <article className="metric-chart-card metric-chart-card--bp app-fade-stagger">
            <div className="bp-chart-head">
              <h3>{windowKey} Trend</h3>
              <span className="bp-chart-filter">Systolic / Diastolic</span>
            </div>
            <div className="bp-line-chart">
              <div className="bp-line-grid">
                <svg viewBox={`0 0 ${bpLineWidth + 54} ${bpLineHeight + 40}`} className="bp-line-svg" aria-hidden="true">
                  {[140, 120, 100, 80, 60].map((tick) => {
                    const y = toBpY(tick)
                    return (
                      <g key={tick}>
                        <text x="0" y={y + 4} className="bp-axis-label">{tick}</text>
                        <line x1="34" y1={y} x2={bpLineWidth + 34} y2={y} className="bp-grid-line" />
                      </g>
                    )
                  })}

                  <polyline points={bpSysPoints} transform="translate(34 0)" className="bp-polyline sys" />
                  <polyline points={bpDiaPoints} transform="translate(34 0)" className="bp-polyline dia" />

                  {dynamicHistory.map((value, index) => {
                    const x = dynamicHistory.length > 1 ? (index / (dynamicHistory.length - 1)) * bpLineWidth + 34 : bpLineWidth / 2 + 34
                    const sysY = toBpY(value)
                    const diaY = toBpY(bpDiastolicHistory[index] ?? 0)
                    const isLast = index === dynamicHistory.length - 1
                    return (
                      <g key={`${windowKey}-${index}`}>
                        <circle cx={x} cy={sysY} r="5.5" className="bp-dot sys" />
                        <circle cx={x} cy={diaY} r="5.5" className="bp-dot dia" />
                        {isLast ? (
                          <>
                            <rect x={x + 12} y={sysY - 17} rx="10" ry="10" width="44" height="30" className="bp-tag-box sys" />
                            <text x={x + 34} y={sysY + 3} textAnchor="middle" className="bp-tag-text">{Math.round(value)}</text>
                            <rect x={x + 12} y={diaY - 17} rx="10" ry="10" width="44" height="30" className="bp-tag-box dia" />
                            <text x={x + 34} y={diaY + 3} textAnchor="middle" className="bp-tag-text">{Math.round(bpDiastolicHistory[index] ?? 0)}</text>
                          </>
                        ) : null}
                        {(index % chartLabelStep === 0 || isLast) ? (
                          <text x={x} y={bpLineHeight + 26} textAnchor="middle" className="bp-date-label">{bpDates[index]}</text>
                        ) : null}
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>
            <div className="bp-chart-legend">
              <span><i className="sys" /> Systolic (mmHg)</span>
              <span><i className="dia" /> Diastolic (mmHg)</span>
            </div>
          </article>
        ) : (
          <article className="metric-chart-card app-fade-stagger">
            <h3>{windowKey} Trend</h3>
            <div className="metric-chart-scroll">
              <div
                className="metric-chart"
                style={{ gridTemplateColumns: `repeat(${dynamicHistory.length}, minmax(22px, 1fr))` }}
              >
                {dynamicHistory.map((value, index) => {
                  const heightPx = Math.round(28 + ((value - min) / range) * 100)
                  return (
                    <div className="bar-wrap" key={`${metric.title}-${windowKey}-${index}`}>
                      <span
                        className={`bar ${metric.tone}`}
                        style={{ height: `${heightPx}px`, animationDelay: `${index * 70}ms` }}
                      />
                      <small>{index % chartLabelStep === 0 || index === dynamicHistory.length - 1 ? index + 1 : ""}</small>
                    </div>
                  )
                })}
              </div>
            </div>
          </article>
        )}

        <article className={`metric-insight-card app-fade-stagger ${metricId === "blood-pressure" ? "metric-insight-card--bp" : ""}`}>
          <h3>Clinical insight</h3>
          <p>{metricId === "heart-rate" ? hrInsight : metric.insight}</p>
          <ul>
            {(metricId === "heart-rate" ? hrTips : metric.tips).map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
            <li>Book consultation if unusual trend persists for 3+ days</li>
          </ul>
          {metricId === "blood-pressure" ? (
            <div className="bp-privacy-note">
              <FiShield />
              Your data is private and secure.
            </div>
          ) : null}
        </article>
      </section>

      {metricId === "calories" && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="meal-file"
          onChange={handlePickMealImage}
        />
      )}

      {metricId === "heart-rate" && measureStage !== "idle" && (
        <div className="hr-measure-overlay">
          <section className="hr-measure-card">
            <button
              className="measure-dismiss app-pressable"
              type="button"
              onClick={() => setMeasureStage("idle")}
              aria-label="Close measurement popup"
            >
              <FiX />
            </button>
            <header className="hr-measure-head">
              <h2>Measure</h2>
              <p>
                {measureStage === "guide"
                  ? "Before we start"
                  : measureStage === "prepare"
                    ? "Press your finger on camera"
                    : "Measuring your heart rate..."}
              </p>
            </header>

            {measureStage === "guide" && (
              <div className="hr-guide">
                <div className="hr-guide-illustration" aria-hidden="true">
                  <span className="hr-pulse-ring hr-pulse-ring-a" />
                  <span className="hr-pulse-ring hr-pulse-ring-b" />
                  <span className="hr-phone">
                    <span className="hr-screen-glow" />
                    <span className="hr-camera-dot" />
                  </span>
                  <span className="hr-hand" />
                  <span className="hr-finger-tip" />
                  <span className="hr-placement-chip">Rear camera</span>
                  <span className="hr-placement-wave" />
                </div>
                <ol className="hr-guide-list">
                  <li>Place your index finger gently on the rear camera.</li>
                  <li>Cover the light fully, hold steady for 25 seconds.</li>
                  <li>Stay seated and breathe normally.</li>
                </ol>
                <button className="measure-close measure-close--primary measure-close--cta app-pressable" type="button" onClick={() => setMeasureStage("prepare")}>
                  <FiCamera />
                  <span>Start measurement</span>
                </button>
              </div>
            )}

            {measureStage !== "guide" && (
              <>
                <div className="hr-camera-shell">
                  {cameraError ? (
                    <div className="hr-camera-error">{cameraError}</div>
                  ) : (
                    <video ref={videoRef} className="hr-camera" muted playsInline />
                  )}
                </div>
                <canvas ref={canvasRef} className="hr-camera-canvas" />
              </>
            )}

            {measureStage !== "guide" && (
              <div
                className="hr-measure-ring"
                style={{ ["--progress" as string]: `${measureProgress}%` }}
              >
                <div className="hr-measure-inner">
                  <span className="hr-heart"><FiHeart /></span>
                  <strong>{measureStage === "prepare" ? "--" : measureBpm}</strong>
                  <small>bpm</small>
                </div>
              </div>
            )}

            {measureStage !== "guide" && (
              <div className="hr-measure-foot">
                <span className="hr-progress-text">
                  {measureStage === "done" ? "Completed" : `Measuring... (${measureProgress}%)`}
                </span>
                {measureStage !== "done" && (
                  <span className={`hr-placement-status ${heartPlacementState}`}>
                    {heartPlacementState === "good"
                      ? "Finger placement looks good. Hold steady."
                      : placementMessage}
                  </span>
                )}
                {lowSignal && measureStage !== "done" && (
                  <span className="hr-signal-warning">Low signal. Cover camera and light fully.</span>
                )}
                {measureStage === "done" && saveStatus === "saving" && (
                  <span className="hr-signal-warning">Saving to server...</span>
                )}
                {measureStage === "done" && saveStatus === "error" && (
                  <span className="hr-signal-warning">
                    {saveTimeoutReached ? "Save timed out. Tap Retry." : "Retrying save... keep app open."}
                  </span>
                )}
                <div className="hr-wave" aria-hidden="true" />
              </div>
            )}

            {measureStage !== "guide" && measureStage === "done" && saveTimeoutReached ? (
              <div className="hr-save-actions">
                <button className="measure-close app-pressable" type="button" onClick={() => setMeasureStage("idle")}>
                  Cancel
                </button>
                <button
                  className="measure-close measure-close--primary app-pressable"
                  type="button"
                  onClick={() => {
                    savedRef.current = false
                    setSaveTimeoutReached(false)
                    setSaveStatus("saving")
                    setMeasureStage("done")
                  }}
                >
                  Retry Save
                </button>
              </div>
            ) : measureStage !== "guide" ? (
              <button
                className="measure-close app-pressable"
                type="button"
                onClick={() => setMeasureStage("idle")}
                disabled={measureStage === "done" && saveStatus !== "saved"}
              >
                {measureStage === "done" ? "Done" : "Cancel"}
              </button>
            ) : null}
          </section>
        </div>
      )}

      {measureStage === "done" && saveStatus === "saving" && (
        <div className="hr-save-blocker">
          <div className="hr-save-card">
            <span className="save-spinner" />
            <p>Saving to server...</p>
          </div>
        </div>
      )}
    </main>
  )
}
