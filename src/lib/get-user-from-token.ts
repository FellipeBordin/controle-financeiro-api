import { type TokenPayload, verifyToken } from "@/lib/auth";

export function getUserFromAuthHeader(
  authHeader: string | null,
): TokenPayload | null {
  if (!authHeader) {
    return null;
  }

  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    return null;
  }

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}
