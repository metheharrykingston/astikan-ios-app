import { useMemo, useState } from "react"
import { FiArrowLeft, FiAward, FiCheckCircle, FiClipboard, FiTrendingUp } from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import { goBackOrFallback } from "../../utils/navigation"
import "./health-assessments.css"

type CampaignStatus = "Draft" | "Open Enrollment" | "Live" | "Completed"

type AssessmentQuestion = {
  id: string
  prompt: string
  options: string[]
  correctOption: number
  points: number
}

type AssessmentTask = {
  id: string
  title: string
  points: number
  questions: AssessmentQuestion[]
}

type HealthAssessmentCampaign = {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  audience: string
  status: CampaignStatus
  tasks: AssessmentTask[]
  createdBy: string
}

type UserAssessmentProgress = {
  completedTaskIds: string[]
  pointsEarned: number
  answers: Record<string, number>
}

const CAMPAIGN_STORAGE_KEY = "astikan_health_assessment_campaigns_v1"
const PROGRESS_STORAGE_KEY = "astikan_user_assessment_progress_v1"

const fallbackCampaigns: HealthAssessmentCampaign[] = [
  {
    id: "camp-1001",
    title: "Heart Smart Week",
    description: "Wellness knowledge sprint around cardiac health and emergency response.",
    startDate: "2026-03-08",
    endDate: "2026-03-14",
    audience: "All Astikan users",
    status: "Open Enrollment",
    createdBy: "Super Admin",
    tasks: [
      {
        id: "task-1001",
        title: "Know your BP zones",
        points: 120,
        questions: [
          {
            id: "q-1001",
            prompt: "Which blood pressure range is generally considered stage 1 hypertension?",
            options: ["90/60", "120/80", "130-139 / 80-89", "160/110"],
            correctOption: 2,
            points: 60,
          },
        ],
      },
    ],
  },
]

function loadCampaigns() {
  try {
    const raw = window.localStorage.getItem(CAMPAIGN_STORAGE_KEY)
    if (!raw) return fallbackCampaigns
    const parsed = JSON.parse(raw) as HealthAssessmentCampaign[]
    return Array.isArray(parsed) && parsed.length ? parsed : fallbackCampaigns
  } catch {
    return fallbackCampaigns
  }
}

function loadProgress(): UserAssessmentProgress {
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY)
    if (!raw) return { completedTaskIds: [], pointsEarned: 0, answers: {} }
    return JSON.parse(raw) as UserAssessmentProgress
  } catch {
    return { completedTaskIds: [], pointsEarned: 0, answers: {} }
  }
}

export default function HealthAssessments() {
  const navigate = useNavigate()
  const [campaigns] = useState<HealthAssessmentCampaign[]>(loadCampaigns())
  const [progress, setProgress] = useState<UserAssessmentProgress>(loadProgress())
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns[0]?.id ?? "")

  const liveCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "Open Enrollment" || campaign.status === "Live"),
    [campaigns]
  )

  const selectedCampaign = useMemo(
    () => liveCampaigns.find((campaign) => campaign.id === selectedCampaignId) ?? liveCampaigns[0] ?? null,
    [liveCampaigns, selectedCampaignId]
  )

  const taskCount = selectedCampaign?.tasks.length ?? 0
  const totalPoints = selectedCampaign?.tasks.reduce((sum, task) => sum + task.points, 0) ?? 0
  const completedCount = selectedCampaign
    ? selectedCampaign.tasks.filter((task) => progress.completedTaskIds.includes(task.id)).length
    : 0

  function updateProgress(next: UserAssessmentProgress) {
    setProgress(next)
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next))
  }

  function chooseAnswer(questionId: string, optionIndex: number) {
    updateProgress({
      ...progress,
      answers: { ...progress.answers, [questionId]: optionIndex },
    })
  }

  function completeTask(task: AssessmentTask) {
    if (progress.completedTaskIds.includes(task.id)) return

    let earned = 0
    task.questions.forEach((question) => {
      const picked = progress.answers[question.id]
      if (picked === question.correctOption) earned += question.points
    })

    updateProgress({
      ...progress,
      pointsEarned: progress.pointsEarned + earned,
      completedTaskIds: [...progress.completedTaskIds, task.id],
    })
  }

  return (
    <main className="health-assessments-page app-page-enter">
      <header className="health-assessments-head app-fade-stagger">
        <button type="button" className="health-assessments-back app-pressable" onClick={() => goBackOrFallback(navigate)} aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <h1>Health Assessment Campaigns</h1>
          <p>Astikan wellness campaigns for users. Complete tasks and earn points.</p>
        </div>
      </header>

      <section className="health-assessments-content app-content-slide">
        <article className="assessment-stats-card app-fade-stagger">
          <section>
            <h4><FiAward /> Points Earned</h4>
            <strong>{progress.pointsEarned}</strong>
          </section>
          <section>
            <h4><FiClipboard /> Campaign Tasks</h4>
            <strong>{completedCount}/{taskCount}</strong>
          </section>
          <section>
            <h4><FiTrendingUp /> Campaign Total</h4>
            <strong>{totalPoints}</strong>
          </section>
        </article>

        <article className="assessment-create-card app-fade-stagger">
          <h3>Available Campaigns</h3>
          {liveCampaigns.length ? (
            <div className="assessment-campaign-grid">
              {liveCampaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  type="button"
                  className={`assessment-campaign-btn ${selectedCampaignId === campaign.id ? "active" : ""}`}
                  onClick={() => setSelectedCampaignId(campaign.id)}
                >
                  <strong>{campaign.title}</strong>
                  <small>{campaign.startDate} to {campaign.endDate}</small>
                  <span>{campaign.audience}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="assessment-focus">No active campaigns published yet.</p>
          )}
        </article>

        {selectedCampaign ? (
          <article className="assessment-list-card app-fade-stagger">
            <div className="list-head">
              <h3>{selectedCampaign.title}</h3>
              <strong>{selectedCampaign.tasks.length}</strong>
            </div>
            <p className="assessment-focus">{selectedCampaign.description}</p>
            <div className="assessment-list">
              {selectedCampaign.tasks.map((task) => {
                const isDone = progress.completedTaskIds.includes(task.id)
                return (
                  <section key={task.id} className="assessment-row">
                    <div>
                      <h4>{task.title}</h4>
                      <p>{task.points} points</p>

                      {task.questions.map((question) => {
                        const selected = progress.answers[question.id]
                        return (
                          <div key={question.id} className="assessment-question-block">
                            <p className="assessment-question-title">{question.prompt}</p>
                            <div className="assessment-question-options">
                              {question.options.map((option, index) => (
                                <button
                                  key={`${question.id}-${option}`}
                                  type="button"
                                  className={`assessment-option ${selected === index ? "active" : ""}`}
                                  onClick={() => chooseAnswer(question.id, index)}
                                  disabled={isDone}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="assessment-row-side">
                      {isDone ? <span><FiCheckCircle /> Completed</span> : <span>In Progress</span>}
                      <button type="button" className="create-assessment-btn" disabled={isDone} onClick={() => completeTask(task)}>
                        {isDone ? "Submitted" : "Submit Task"}
                      </button>
                    </div>
                  </section>
                )
              })}
            </div>
          </article>
        ) : null}
      </section>
    </main>
  )
}
