/** Marks a 401 so the interface can offer a sign-in instead of a generic failure. */
export class AdminSessionExpiredError extends Error {}

/**
 * A session issued before the cookie scope was corrected only covers `/admin`, so it never
 * reaches these APIs and every call returns 401. Signing in again replaces it.
 */
export async function adminFetch(input: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401) throw new AdminSessionExpiredError("Session expired");
  return response;
}

export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Sign out and sign in again to continue.";

export function adminErrorMessage(error: unknown, fallback: string) {
  return error instanceof AdminSessionExpiredError ? SESSION_EXPIRED_MESSAGE : fallback;
}
