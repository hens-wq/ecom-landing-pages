import type { User } from "@/lib/types";
import { MOCK_USER } from "@/lib/seed/mock-user";

/**
 * Auth abstraction. UI code and pages should only ever talk to
 * `authRepository`, never touch localStorage/cookies directly - that way
 * swapping LocalAuthRepository for a real ApiAuthRepository later is a
 * one-line change.
 */
export interface AuthRepository {
  login(email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}

const STORAGE_KEY = "ecom-lms:auth:user";

class LocalAuthRepository implements AuthRepository {
  async login(email: string, password: string): Promise<User> {
    if (!email.trim() || !password.trim()) {
      throw new Error("נא למלא אימייל וסיסמה");
    }
    // Mock authentication: any non-empty credentials succeed as the seed user.
    const user: User = { ...MOCK_USER, email: email.trim() };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
    return user;
  }

  async logout(): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  }

  async getCurrentUser(): Promise<User | null> {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}

export const authRepository: AuthRepository = new LocalAuthRepository();
