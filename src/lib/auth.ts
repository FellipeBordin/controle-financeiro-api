import jwt from "jsonwebtoken";

export type TokenPayload = {
  userId: string;
  email: string;
};

const JWT_SECRET: string = process.env.JWT_SECRET ?? (() => {
  throw new Error("JWT_SECRET não definido no .env");
})();

export function generateToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (
    typeof decoded === "object" &&
    decoded !== null &&
    typeof decoded.userId === "string" &&
    typeof decoded.email === "string"
  ) {
    return {
      userId: decoded.userId,
      email: decoded.email,
    };
  }

  throw new Error("Token inválido");
}