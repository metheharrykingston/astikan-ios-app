import { useEffect, useRef, useState } from "react"
import { FiArrowLeft } from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import { armAudioContext, startAmbientTrack, stopAmbientTrack } from "../../utils/sound"
import "./meditation.css"

export default function Meditation() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [cameraError, setCameraError] = useState("")
  const [soundOn, setSoundOn] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch {
        setCameraError("Camera permission is needed to start the guided meditation.")
      }
    }
    startCamera()
    return () => {
      stopAmbientTrack()
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return (
    <main className="meditation-page app-page-enter">
      <header className="meditation-header">
        <button className="meditation-back app-pressable" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>Guided Meditation</h1>
          <p>Find a quiet space and follow the guidance</p>
        </div>
      </header>

      <section className="meditation-body">
        <div className="meditation-camera-shell">
          <video ref={videoRef} autoPlay playsInline muted className="meditation-video" />
          <div className="meditation-overlay">
            <div className="meditation-illustration" />
            <div className="meditation-prompt">
              <strong>Sit straight, shoulders relaxed</strong>
              <p>Place your feet flat and gently rest your hands on your knees.</p>
            </div>
          </div>
        </div>

        {cameraError && <p className="meditation-error">{cameraError}</p>}

        <div className="meditation-instructions">
          <h3>AI Coach</h3>
          <p>Take a slow breath in. Hold for a moment. Exhale gently. Let your mind settle.</p>
          <button
            type="button"
            className="meditation-sound-btn app-pressable"
            onClick={() => {
              armAudioContext()
              if (soundOn) {
                stopAmbientTrack()
                setSoundOn(false)
                return
              }
              startAmbientTrack("meditation")
              setSoundOn(true)
            }}
          >
            {soundOn ? "Pause calming audio" : "Play calming audio"}
          </button>
          <ul>
            <li>Keep your chin slightly down</li>
            <li>Unclench your jaw and relax your shoulders</li>
            <li>Return focus to your breath if your mind wanders</li>
          </ul>
        </div>
      </section>
    </main>
  )
}
