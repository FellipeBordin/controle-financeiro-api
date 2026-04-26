import { verifyToken } from "@/lib/auth";

type AuthUser = {
  userId: string;
  email: string;
};

export function getUserFromAuthHeader(
  authHeader: string | null,
): AuthUser | null {
  if (!authHeader) return null;

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
