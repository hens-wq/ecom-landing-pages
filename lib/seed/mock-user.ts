import type { User } from "@/lib/types";

/**
 * The single seed user for this mock-auth MVP. When real authentication
 * lands, this is replaced by whatever ApiAuthRepository.getCurrentUser()
 * returns - nothing in the UI depends on this being hardcoded.
 */
export const MOCK_USER: User = {
  id: "u-daniel-cohen",
  name: "דניאל כהן",
  email: "daniel@ecomcollege.co.il",
  role: "נציג מכירות",
  startDate: "2026-08-01",
};
