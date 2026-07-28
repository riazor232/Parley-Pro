export interface Fixture {
  id: number;
  match_name: string;
  league: string;
  date_time: string;
  market: string;
  odds: number;
  probability: number;
  risk_level: string;
}

export interface SavedParley {
  id: number;
  stake: number;
  total_odds: number;
  potential_payout: number;
  created_at: string;
  items: string;
}

export interface SavedParleyCreate {
  stake: number;
  total_odds: number;
  potential_payout: number;
  created_at: string;
  items: string;
}

export interface SavedBet {
  id: number;
  username: string;
  match_name: string;
  league: string;
  date_time: string;
  selected_market: string;
  odds: number;
  prompt_analysis?: string | null;
  status: string; // "Pendiente" | "Finalizado"
  final_result?: string | null;
  efficiency_analysis?: string | null;
  created_at: string;
  analyzed_at?: string | null;
}

export interface SavedBetCreate {
  username?: string;
  match_name: string;
  league: string;
  date_time: string;
  selected_market: string;
  odds: number;
  prompt_analysis?: string | null;
}

export interface AdminUser {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface ApiUsageRecord {
  id: number;
  username: string;
  ai_service: string;
  action: string;
  tokens_used: number;
  match_name: string | null;
  created_at: string;
}

export interface ApiQuota {
  id: number;
  ai_service: string;
  plan_name: string;
  total_tokens: number;
  monthly_cost_usd: number;
  renewal_date: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const ADMIN_TOKEN = "juarez";

const adminHeaders = {
  "Content-Type": "application/json",
  "x-admin-token": ADMIN_TOKEN,
};

// ─── Fixtures ────────────────────────────────────────────────────────────────

export async function getFixtures(): Promise<Fixture[]> {
  const res = await fetch(`${API_BASE_URL}/api/fixtures`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch fixtures");
  return res.json();
}

export async function syncFixtures(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/fixtures/sync`, { method: "POST", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to sync fixtures");
  return res.json();
}

export async function searchFixtures(query: string): Promise<Fixture[]> {
  const res = await fetch(`${API_BASE_URL}/api/fixtures/search?query=${encodeURIComponent(query)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to search fixtures");
  return res.json();
}

// ─── Parleys ─────────────────────────────────────────────────────────────────

export async function getSavedParleys(): Promise<SavedParley[]> {
  const res = await fetch(`${API_BASE_URL}/api/parleys`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch saved parleys");
  return res.json();
}

export async function saveParley(parley: SavedParleyCreate): Promise<SavedParley> {
  const res = await fetch(`${API_BASE_URL}/api/parleys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parley),
  });
  if (!res.ok) throw new Error("Failed to save parley");
  return res.json();
}

export async function deleteParley(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/parleys/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete parley");
}

// ─── Saved Bets (Apuestas Guardadas y Eficiencia) ───────────────────────────

export async function getSavedBets(username = "admin"): Promise<SavedBet[]> {
  const res = await fetch(`${API_BASE_URL}/api/saved-bets?username=${encodeURIComponent(username)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch saved bets");
  return res.json();
}

export async function createSavedBet(bet: SavedBetCreate): Promise<SavedBet> {
  const res = await fetch(`${API_BASE_URL}/api/saved-bets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bet),
  });
  if (!res.ok) throw new Error("Failed to save bet");
  return res.json();
}

export async function deleteSavedBet(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/saved-bets/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete saved bet");
}

export async function analyzeBetEfficiency(betId: number, finalResult: string, username = "admin"): Promise<{ status: string; analysis: string; bet: SavedBet }> {
  const res = await fetch(`${API_BASE_URL}/api/saved-bets/${betId}/efficiency`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ final_result: finalResult, username }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || "Error al analizar eficiencia");
  }
  return res.json();
}

// ─── Status & Auth ───────────────────────────────────────────────────────────

export async function getServerStatus(): Promise<{ data_source: string }> {
  const res = await fetch(`${API_BASE_URL}/api/status`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch server status");
  return res.json();
}

export async function loginUser(username: string, password: string): Promise<{ username: string; role: string }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Credenciales incorrectas");
  return res.json();
}

// ─── Groq Analysis ───────────────────────────────────────────────────────────

export async function analyzeFixture(match_name: string, username = "admin"): Promise<{ analysis: string }> {
  const res = await fetch(`${API_BASE_URL}/api/fixtures/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ match_name, username }),
  });
  if (!res.ok) throw new Error("Failed to analyze fixture");
  return res.json();
}

// ─── Admin: Usuarios ─────────────────────────────────────────────────────────

export async function adminGetUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/users`, { headers: adminHeaders });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function adminCreateUser(data: { username: string; password: string; role: string }): Promise<AdminUser> {
  const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || "Error al crear usuario");
  }
  return res.json();
}

export async function adminUpdateUser(id: number, data: { password?: string; role?: string; is_active?: boolean }): Promise<AdminUser> {
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update user");
  return res.json();
}

export async function adminDeleteUser(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
  if (!res.ok) throw new Error("Failed to delete user");
}

// ─── Admin: Uso ───────────────────────────────────────────────────────────────

export async function adminGetUsage(limit = 500): Promise<ApiUsageRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/usage?limit=${limit}`, { headers: adminHeaders });
  if (!res.ok) throw new Error("Failed to fetch usage");
  return res.json();
}

export async function adminGetUsageSummary(): Promise<Record<string, { groq: number; gemini: number; total: number }>> {
  const res = await fetch(`${API_BASE_URL}/api/admin/usage/summary`, { headers: adminHeaders });
  if (!res.ok) throw new Error("Failed to fetch usage summary");
  return res.json();
}

// ─── Admin: Cuotas ────────────────────────────────────────────────────────────

export async function adminGetQuotas(): Promise<ApiQuota[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/quotas`, { headers: adminHeaders });
  if (!res.ok) throw new Error("Failed to fetch quotas");
  return res.json();
}

export async function adminUpdateQuota(ai_service: string, data: Partial<ApiQuota>): Promise<ApiQuota> {
  const res = await fetch(`${API_BASE_URL}/api/admin/quotas/${ai_service}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update quota");
  return res.json();
}
