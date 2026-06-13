import { Capacitor } from "@capacitor/core";

const RAW_BASE = import.meta.env.VITE_API_BASE_URL;
const PRODUCTION_API_BASE = "https://api.astikan.tech/api";

function resolveApiBaseUrl() {
  if (Capacitor.isNativePlatform()) {
    return typeof RAW_BASE === "string" && RAW_BASE.trim() && RAW_BASE !== "undefined" && RAW_BASE !== "null"
      ? RAW_BASE.replace(/\/+$/, "")
      : PRODUCTION_API_BASE;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (
      host === "employee.astikan.tech" ||
      host.endsWith(".astikan.tech") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return "/api";
    }
  }

  return typeof RAW_BASE === "string" && RAW_BASE.trim() && RAW_BASE !== "undefined" && RAW_BASE !== "null"
    ? RAW_BASE.replace(/\/+$/, "")
    : "/api";
}

const API_BASE_URL = resolveApiBaseUrl();

export function buildApiUrl(path: string) {
  const raw = String(path || "").trim();
  if (!raw) return API_BASE_URL;
  if (/^(https?:|blob:|data:)/i.test(raw)) return raw;
  const cleanPath = raw.startsWith("/") ? raw : `/${raw}`;
  if (API_BASE_URL.endsWith("/api") && cleanPath.startsWith("/api/")) {
    return `${API_BASE_URL}${cleanPath.slice(4)}`;
  }
  if (API_BASE_URL === "/api" && cleanPath.startsWith("/api/")) return cleanPath;
  return `${API_BASE_URL}${cleanPath}`;
}

export function getAuthToken() {
  try {
    const raw =
      localStorage.getItem("astikan_user_auth") ||
      sessionStorage.getItem("astikan_user_auth");
    if (!raw) return "";
    if (!localStorage.getItem("astikan_user_auth") && sessionStorage.getItem("astikan_user_auth")) {
      localStorage.setItem("astikan_user_auth", sessionStorage.getItem("astikan_user_auth") || "")
    }
    const parsed = JSON.parse(raw) as { token?: string; accessToken?: string };
    return parsed.token || parsed.accessToken || "";
  } catch {
    return "";
  }
}

type ApiEnvelope<T> = {
  status: "ok" | "error";
  data?: T;
  message?: string;
};

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  const raw = await response.text();
  if (!raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

function sanitizeApiErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("online payment gateway")) {
    return message;
  }
  if (
    lower.includes("atlas") ||
    lower.includes("railway") ||
    lower.includes("vercel") ||
    false
  ) {
    return message || "Service temporarily unavailable. Please retry.";
  }
  return message;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}), ...(init.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new Error("Could not reach Astikan services right now. Please try again in a moment.");
  }

  const payload = await parseEnvelope<T>(response);
  if (!response.ok) {
    const rawMessage = payload?.message || response.statusText || `Request failed: ${response.status}`;
    throw new Error(sanitizeApiErrorMessage(rawMessage));
  }
  if (!payload || payload.status !== "ok" || typeof payload.data === "undefined") {
    throw new Error("Service temporarily unavailable. Please retry.");
  }

  return payload.data;
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: "GET", signal });
}

export async function apiPost<T, B>(path: string, body: B): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPut<T, B>(path: string, body: B): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
