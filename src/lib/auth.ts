import jwt from "jsonwebtoken";

export type TokenPayload = {
  userId: string;
  email: string;
};

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET não definido no .env");
}

export function generateToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
