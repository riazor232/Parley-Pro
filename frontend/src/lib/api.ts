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
  items: string; // serialized JSON list of items
}

export interface SavedParleyCreate {
  stake: number;
  total_odds: number;
  potential_payout: number;
  created_at: string;
  items: string; // serialized JSON list of items
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function getFixtures(): Promise<Fixture[]> {
  const res = await fetch(`${API_BASE_URL}/api/fixtures`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error("Failed to fetch fixtures");
  }
  return res.json();
}

export async function syncFixtures(): Promise<{status: string, message: string}> {
  const res = await fetch(`${API_BASE_URL}/api/fixtures/sync`, { method: "POST", cache: 'no-store' });
  if (!res.ok) {
    throw new Error("Failed to sync fixtures");
  }
  return res.json();
}

export async function searchFixtures(query: string): Promise<Fixture[]> {
  const res = await fetch(`${API_BASE_URL}/api/fixtures/search?query=${encodeURIComponent(query)}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error("Failed to search fixtures");
  }
  return res.json();
}

export async function getSavedParleys(): Promise<SavedParley[]> {
  const res = await fetch(`${API_BASE_URL}/api/parleys`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error("Failed to fetch saved parleys");
  }
  return res.json();
}

export async function saveParley(parley: SavedParleyCreate): Promise<SavedParley> {
  const res = await fetch(`${API_BASE_URL}/api/parleys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parley),
  });
  if (!res.ok) {
    throw new Error("Failed to save parley");
  }
  return res.json();
}

export async function deleteParley(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/parleys/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete parley");
  }
}

export async function getServerStatus(): Promise<{ data_source: string }> {
  const res = await fetch(`${API_BASE_URL}/api/status`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error("Failed to fetch server status");
  }
  return res.json();
}

export async function analyzeFixture(match_name: string): Promise<{ analysis: string }> {
  const res = await fetch(`${API_BASE_URL}/api/fixtures/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ match_name }),
  });
  if (!res.ok) {
    throw new Error("Failed to analyze fixture");
  }
  return res.json();
}
