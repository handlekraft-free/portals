export interface PortalUser {
  id: number;
  email: string;
  role: "admin" | "employee" | "client" | "student" | "board";
  firstName: string;
  lastName: string;
  mustChangePassword?: boolean;
  status?: string;
  canApprove?: boolean;
  approverId?: number | null;
  boardPosition?: string | null;
  termStart?: string | null;
  termEnd?: string | null;
  isInterestedDirector?: boolean;
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

export async function login(email: string, password: string): Promise<{ user: PortalUser } | { error: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (data.success) return { user: data.data };
    return { error: data.error || "Login failed" };
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

export function getPortalPath(role: string): string {
  switch (role) {
    case "admin": return "/portal/employee/dashboard";
    case "employee": return "/portal/employee/dashboard";
    case "client": return "/portal/client/dashboard";
    case "student": return "/portal/student/dashboard";
    case "board": return "/portal/board/dashboard";
    default: return "/login";
  }
}

export function apiRequest<T = any>(method: string, url: string, body?: any): Promise<{ success: boolean; data: T; error?: string }> {
  return fetch(url, {
    method,
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    credentials: "include",
  }).then(r => r.json());
}
