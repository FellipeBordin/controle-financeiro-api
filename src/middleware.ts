import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const allowedOrigins = [
  "http://localhost:8081",
  "http://localhost:3000",
  "http://localhost:19006",
  "http://192.168.18.8:8081",
];

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");

  const isAllowedOrigin = origin !== null && allowedOrigins.includes(origin);

  const headers = new Headers();

  if (isAllowedOrigin) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  headers.set("Vary", "Origin");

  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers,
    });
  }

  const response = NextResponse.next();

  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
