import { apiPost } from "./api";
import { apiGet } from "./api";

type ChatRole = "system" | "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type AiChatResult = {
  reply: string;
  provider: string;
  model: string;
  phase: "clarify" | "recommend";
  quickReplies: string[];
  suggestedTests: Array<{
    name: string;
    reason?: string;
    category?: string;
  }>;
  suggestedMedicines?: Array<{
    name: string;
    reason?: string;
    category?: string;
  }>;
  doctorSpecialty?: string;
  nextAction?: "book_doctor" | "suggest_tests" | "none";
};

export type ReadinessQuestion = {
  id: string;
  question: string;
  options: Array<{ value: "yes" | "no"; label: string }>;
};

export type InternetMedicineMatch = {
  product: {
    name: string;
    genericName?: string;
    useCase?: string;
    manufacturer?: string;
    strength?: string;
    category?: string;
    description?: string;
    priceInr: number;
    mrpInr?: number;
    sourceUrl: string;
    sourceDomain?: string;
    imageUrl?: string;
    availabilityNote?: string;
    packaging?: string;
    confidence?: "high" | "medium" | "low";
  } | null;
  model: string;
};

export async function askAiChat(input: {
  message: string;
  history: ChatMessage[];
  threadId?: string;
  userId?: string;
  appContext?: string;
  doctorName?: string;
}): Promise<AiChatResult> {
  const apiKey = import.meta.env.VITE_GROK_API_KEY?.trim();
  return apiPost<
    AiChatResult,
    { message: string; history: ChatMessage[]; apiKey?: string; threadId?: string; userId?: string; appContext?: string; doctorName?: string }
  >("/ai/chat", {
    message: input.message,
    history: input.history,
    apiKey: apiKey || undefined,
    threadId: input.threadId,
    userId: input.userId,
    appContext: input.appContext,
    doctorName: input.doctorName,
  });
}

export async function getAiThread(threadId: string) {
  return apiGet<Array<{ role: ChatRole; content: string; createdAt?: string }>>(`/ai/threads/${threadId}`);
}

export async function getAiLabReadinessQuestions(input: {
  testName: string;
  fastingInfo?: string;
}): Promise<{ questions: ReadinessQuestion[]; model: string }> {
  const apiKey = import.meta.env.VITE_GROK_API_KEY?.trim();
  return apiPost<
    { questions: ReadinessQuestion[]; model: string },
    { testName: string; fastingInfo?: string; apiKey?: string }
  >("/ai/lab-readiness", {
    testName: input.testName,
    fastingInfo: input.fastingInfo,
    apiKey: apiKey || undefined,
  });
}

export async function parsePrescriptionImage(input: {
  imageBase64: string;
  fileName?: string;
  mimeType?: string;
}): Promise<{ medicines: Array<{ name: string; strength?: string }>; model: string }> {
  const apiKey = import.meta.env.VITE_GROK_API_KEY?.trim();
  return apiPost<
    { medicines: Array<{ name: string; strength?: string }>; model: string },
    { imageBase64: string; fileName?: string; mimeType?: string; apiKey?: string }
  >("/ai/prescription-parse", {
    imageBase64: input.imageBase64,
    fileName: input.fileName,
    mimeType: input.mimeType,
    apiKey: apiKey || undefined,
  });
}

export async function searchInternetMedicine(query: string): Promise<InternetMedicineMatch> {
  const apiKey = import.meta.env.VITE_GROK_API_KEY?.trim();
  return apiPost<InternetMedicineMatch, { query: string; apiKey?: string }>("/ai/medicine-web-search", {
    query,
    apiKey: apiKey || undefined,
  });
}

export async function createVoiceClientSecret(): Promise<{ value: string; expiresAt: number | null }> {
  return apiPost<{ value: string; expiresAt: number | null }, Record<string, never>>("/ai/voice/client-secret", {});
}

export type MedicalAttachmentAnalysis = {
  summary: string;
  extractedText: string;
  followUpQuestion?: string;
  suggestedSpecialty?: string;
  urgency: "low" | "medium" | "high";
  recommendedNextStep: string;
  attachmentKind: "image" | "pdf";
  model: string;
}

export async function analyzeMedicalAttachment(input: {
  fileBase64: string;
  mimeType: string;
  fileName: string;
  doctorName?: string;
  userQuestion?: string;
}): Promise<MedicalAttachmentAnalysis> {
  const apiKey = import.meta.env.VITE_GROK_API_KEY?.trim();
  return apiPost<
    MedicalAttachmentAnalysis,
    { fileBase64: string; mimeType: string; fileName: string; doctorName?: string; userQuestion?: string; apiKey?: string }
  >("/ai/medical-attachment", {
    fileBase64: input.fileBase64,
    mimeType: input.mimeType,
    fileName: input.fileName,
    doctorName: input.doctorName,
    userQuestion: input.userQuestion,
    apiKey: apiKey || undefined,
  });
}
