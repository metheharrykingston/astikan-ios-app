import type { ReactElement } from "react"
import { FiActivity, FiDroplet, FiMoon, FiSmile } from "react-icons/fi"

export type TipSectionQuestion = {
  id: string
  text: string
  options: string[]
}

export type TipSection = {
  heading: string
  body: string
  coach: string
  question: TipSectionQuestion
}

export type HealthTip = {
  id: string
  title: string
  summary: string
  tags: string[]
  moodTags: string[]
  heroImage: string
  icon: ReactElement
  sections: TipSection[]
}

export const healthTips: HealthTip[] = [
  {
    id: "air-quality-shield",
    title: "Air Quality Shield",
    summary: "Protect lungs and energy on high‑pollution days.",
    tags: ["Recovery", "Air"],
    moodTags: ["general", "stress"],
    heroImage: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    icon: <FiActivity />,
    sections: [
      {
        heading: "Reduce exposure",
        body: "Limit outdoor intensity when pollution spikes. Prefer indoor exercise and keep windows closed during peak traffic hours.",
        coach: "This is gentle protection, not panic. Clinically, reduced exposure lowers airway irritation on high AQI days.",
        question: {
          id: "air_exposure",
          text: "How much time do you plan to stay outdoors today?",
          options: ["Less than 30 mins", "About an hour", "Multiple hours"],
        },
      },
      {
        heading: "Hydrate and rinse",
        body: "Drink extra water and rinse nose/throat after outdoor travel. It helps clear irritants from airways.",
        coach: "Small habits make a big difference. Hydration helps the body clear pollutants more efficiently.",
        question: {
          id: "air_hydration",
          text: "Would you like a hydration reminder?",
          options: ["Yes, remind me", "No, I will remember", "Maybe later"],
        },
      },
      {
        heading: "Mask and monitor",
        body: "If you go out, use a well‑fitting mask (N95 if available). Watch for cough, burning eyes, or chest tightness.",
        coach: "Masks are a practical shield on poor air days. If symptoms feel intense, consider a medical consult.",
        question: {
          id: "air_mask",
          text: "Do you have a protective mask available?",
          options: ["Yes", "Not right now", "I can arrange"],
        },
      },
    ],
  },
  {
    id: "hydration-reset",
    title: "Hydration Reset",
    summary: "A simple water rhythm that keeps dizziness, fatigue, and headaches away.",
    tags: ["Hydration", "Energy"],
    moodTags: ["dizzy", "fatigue", "general"],
    heroImage: "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=1200&q=80",
    icon: <FiDroplet />,
    sections: [
      {
        heading: "Why hydration works",
        body: "Your brain and muscles depend on steady fluid balance. Even a small dip can trigger headaches, low focus, or lightheadedness. The goal is consistency, not a huge amount all at once.",
        coach: "You are not alone in this. Clinically, even mild dehydration can affect focus and balance, so gentle consistency is more effective than chugging water.",
        question: {
          id: "hydration_check",
          text: "Which hydration pattern sounds closest to you today?",
          options: ["I forget water most of the day", "I drink only with meals", "I sip regularly"],
        },
      },
      {
        heading: "A simple rhythm",
        body: "Use a 2-hour rhythm: drink a small glass when you start work, one mid-morning, one with lunch, one mid-afternoon, and one early evening. Add a pinch of salt or lemon if you feel drained.",
        coach: "Let us keep it easy and repeatable. This rhythm supports steady blood volume and helps prevent lightheadedness.",
        question: {
          id: "hydration_rhythm",
          text: "Pick a reminder that will actually work for you",
          options: ["Set 2-hour alarms", "Keep a bottle in sight", "Pair with routine breaks"],
        },
      },
      {
        heading: "Check your signals",
        body: "Clear urine, fewer headaches, and stable energy are good signs. If you feel dizzy when standing, slow down and drink 250ml over 10 minutes.",
        coach: "If dizziness spikes, sit down and breathe slowly first. Clinically, a slow intake helps the body absorb fluids more comfortably.",
        question: {
          id: "hydration_signal",
          text: "How are you feeling right now?",
          options: ["Lightheaded", "Okay", "Stable and energized"],
        },
      },
    ],
  },
  {
    id: "calm-breath",
    title: "Calm Breathing",
    summary: "Two minutes that lower stress spikes and steady your heart rate.",
    tags: ["Stress", "Breathing"],
    moodTags: ["stress", "sleep", "general"],
    heroImage: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    icon: <FiSmile />,
    sections: [
      {
        heading: "Start with the exhale",
        body: "Longer exhales calm the nervous system. Try 4 seconds in, 6 seconds out. Keep your shoulders relaxed.",
        coach: "You are doing great. Longer exhales activate the vagus nerve, which clinically helps reduce stress response.",
        question: {
          id: "breath_start",
          text: "What do you feel in your body right now?",
          options: ["Tight chest", "Racing mind", "Mostly okay"],
        },
      },
      {
        heading: "Two-minute reset",
        body: "Do 10 slow cycles. Put one hand on your chest and one on your belly. Let the belly move more than the chest.",
        coach: "That belly movement is the key. Clinically, diaphragmatic breathing lowers heart rate and eases tension.",
        question: {
          id: "breath_reset",
          text: "Want a reminder in 2 hours?",
          options: ["Yes, remind me", "No, I will remember", "Maybe later"],
        },
      },
      {
        heading: "Make it a habit",
        body: "Attach breathing to a trigger you already have: before calls, after lunch, or when you feel a stress spike.",
        coach: "Small anchors build big change. The more consistent the trigger, the faster your nervous system learns the calm response.",
        question: {
          id: "breath_trigger",
          text: "Pick your strongest trigger",
          options: ["Before meetings", "After meals", "When I feel tension"],
        },
      },
    ],
  },
  {
    id: "sleep-recovery",
    title: "Sleep Recovery",
    summary: "Small changes that improve deep sleep and morning energy.",
    tags: ["Sleep", "Recovery"],
    moodTags: ["sleep", "fatigue", "stress"],
    heroImage: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    icon: <FiMoon />,
    sections: [
      {
        heading: "Make sleep predictable",
        body: "A consistent window matters more than a perfect bedtime. Try to keep sleep and wake time within 45 minutes daily.",
        coach: "It is okay if it is not perfect. Clinically, the body responds best to stable timing rather than a single perfect night.",
        question: {
          id: "sleep_window",
          text: "Which part is hardest for you?",
          options: ["Falling asleep", "Staying asleep", "Waking up on time"],
        },
      },
      {
        heading: "Light and calm",
        body: "Bright light in the morning and dim light at night helps reset your clock. Avoid heavy screens 45 minutes before bed.",
        coach: "Gentle light cues guide your circadian rhythm. This is a proven clinical lever for better sleep depth.",
        question: {
          id: "sleep_light",
          text: "Pick one change for tonight",
          options: ["No phone 30 mins", "Lower room light", "Short evening walk"],
        },
      },
      {
        heading: "Recovery check",
        body: "If you wake up tired, keep naps short (20 minutes max) and avoid caffeine after 3 PM.",
        coach: "This protects your deep sleep later. Clinically, late caffeine pushes sleep quality down even if you fall asleep.",
        question: {
          id: "sleep_recovery",
          text: "How is your energy right now?",
          options: ["Low", "Average", "Good"],
        },
      },
    ],
  },
  {
    id: "desk-stretch",
    title: "Desk Stretch",
    summary: "Quick mobility for neck, shoulders, and lower back.",
    tags: ["Mobility", "Desk Work"],
    moodTags: ["fatigue", "general"],
    heroImage: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    icon: <FiActivity />,
    sections: [
      {
        heading: "Release the neck",
        body: "Drop your right ear toward the right shoulder, hold 20 seconds, switch sides. Keep the shoulder relaxed.",
        coach: "Move slowly and stay comfortable. Clinically, gentle holds reduce muscle guarding and improve blood flow.",
        question: {
          id: "stretch_neck",
          text: "Where do you feel tension most?",
          options: ["Neck", "Lower back", "Shoulders"],
        },
      },
      {
        heading: "Open the chest",
        body: "Interlace fingers behind your back, gently lift, and open the chest for 20 seconds. Breathe slowly.",
        coach: "This opens the front body and counteracts desk posture. Clinically, it reduces upper back tightness.",
        question: {
          id: "stretch_open",
          text: "Would you like a reminder later?",
          options: ["Yes", "No", "Maybe"],
        },
      },
      {
        heading: "Reset posture",
        body: "Stand up, take 6 slow breaths, and relax your shoulders. This simple reset helps reduce stiffness.",
        coach: "Nice work. Short posture resets are clinically linked to less neck and shoulder strain over time.",
        question: {
          id: "stretch_reset",
          text: "How do you feel after the reset?",
          options: ["Looser", "Same", "Better"],
        },
      },
    ],
  },
]
