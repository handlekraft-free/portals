export interface PortalUser {
  id: number;
  email: string;
  role: "admin" | "employee" | "client" | "student" | "board";
  availableRoles: string[];
  firstName: string;
  lastName: string;
  mustChangePassword?: boolean;
  onboardingComplete?: boolean;
  status?: string;
  canApprove?: boolean;
  approverId?: number | null;
  boardPosition?: string | null;
  termStart?: string | null;
  termEnd?: string | null;
  isInterestedDirector?: boolean;
  boardRestrictedAccess?: boolean;
}

export async function getCurrentUser(): Promise<PortalUser | null> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

export interface RoleSelectionRequired {
  requiresRoleSelection: true;
  roles: string[];
  pendingToken: string;
  firstName: string;
  lastName: string;
}

export async function login(
  email: string,
  password: string
): Promise<{ user: PortalUser } | { roleSelection: RoleSelectionRequired } | { error: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!data.success) return { error: data.error || "Login failed" };
    if (data.data?.requiresRoleSelection) return { roleSelection: data.data };
    return { user: data.data };
  } catch {
    return { error: "Network error. Please try again." };
  }
}

export async function selectRole(
  pendingToken: string,
  role: string
): Promise<{ user: PortalUser } | { error: string }> {
  try {
    const res = await fetch("/api/auth/select-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pendingToken, role }),
      credentials: "include",
    });
    const data = await res.json();
    if (data.success) return { user: data.data };
    return { error: data.error || "Failed to select role" };
  } catch {
    return { error: "Network error. Please try again." };
  }
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ error?: string }> {
  try {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
      credentials: "include",
    });
    const data = await res.json();
    if (data.success) return {};
    return { error: data.error || "Failed to change password." };
  } catch {
    return { error: "Network error. Please try again." };
  }
}

export function getPortalPath(role: string, enabled?: readonly string[]): string {
  switch (role) {
    case "employee": return "/portal/employee/dashboard";
    case "client": return "/portal/client/dashboard";
    case "student": return "/portal/student/dashboard";
    case "board": return "/portal/board/dashboard";
    case "admin": {
      // Admin lands on the first enabled portal's dashboard so the page
      // they see actually has its APIs mounted. Default to employee when
      // we don't know the enabled list yet (legacy callers).
      const first = enabled?.find(p => p !== "admin");
      return first ? getPortalPath(first) : "/portal/employee/dashboard";
    }
    default: return "/login";
  }
}

export type XpAward = { amount: number; reason: string; newTotal: number; stat?: string | null };
export type CrewBond = { partnerFirstName: string; kind: "review"; cardTitle: string };

export function apiRequest<T = any>(
  method: string, url: string, body?: any
): Promise<{ success: boolean; data: T; error?: string; xpAwarded?: XpAward | null; xpAwards?: XpAward[]; crewBonds?: CrewBond[] }> {
  return fetch(url, {
    method,
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    credentials: "include",
  }).then(r => r.json()).then(json => {
    if (typeof window !== "undefined" && json) {
      // Prefer the array form (multi-award); fall back to legacy single object.
      const awards: XpAward[] | null = Array.isArray(json.xpAwards) && json.xpAwards.length > 0
        ? json.xpAwards
        : json.xpAwarded
          ? [json.xpAwarded]
          : null;
      if (awards) {
        try { window.dispatchEvent(new CustomEvent("xp:awarded", { detail: { awards } })); } catch {}
      }
      if (Array.isArray(json.crewBonds) && json.crewBonds.length > 0) {
        try { window.dispatchEvent(new CustomEvent("crew:bond", { detail: { bonds: json.crewBonds } })); } catch {}
      }
    }
    return json;
  });
}
