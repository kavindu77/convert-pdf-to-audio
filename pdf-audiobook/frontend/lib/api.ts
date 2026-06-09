import axios from "axios";

const API_URL = "https://convert-pdf-to-audio.onrender.com";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 60_000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface UploadResponse {
  job_id: string;
  status: string;
  message: string;
  plan?: string;
  max_pages?: number;
  estimated_time?: number | null;
  is_free_plan?: boolean;
}

export interface JobStatus {
  job_id: string;
  status: "pending" | "extracting" | "translating" | "generating_audio" | "completed" | "failed";
  progress_percent: number;
  original_filename: string;
  target_language: string;
  target_language_name: string;
  total_pages: number;
  processed_pages: number;
  is_scanned_pdf: boolean;
  audio_url: string | null;
  chapter_urls: string[] | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export async function uploadPDF(
  file: File,
  targetLanguage: string,
  sourceLanguage = "auto",
  voiceGender = "neutral"
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target_language", targetLanguage);
  formData.append("source_language", sourceLanguage);
  formData.append("voice_gender", voiceGender);
  const { data } = await apiClient.post<UploadResponse>("/api/upload/pdf", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const { data } = await apiClient.get<JobStatus>(`/api/jobs/${jobId}`);
  return data;
}

export async function getSupportedLanguages(): Promise<Record<string, string>> {
  const { data } = await apiClient.get<Record<string, string>>("/api/translate/languages");
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await apiClient.post("/api/auth/login", { email, password });
  if (data.access_token && typeof window !== "undefined") {
    localStorage.setItem("access_token", data.access_token);
  }
  return data;
}

export async function register(email: string, password: string, fullName?: string) {
  const { data } = await apiClient.post("/api/auth/register", { email, password, full_name: fullName });
  return data;
}
