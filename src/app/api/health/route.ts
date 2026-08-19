import { NextResponse } from "next/server";

import { corsHeaders } from "@/lib/cors";

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");

  return NextResponse.json(
    {
      ok: true,
      message: "API funcionando",
    },
    {
      status: 200,
      headers: corsHeaders(origin),
    },
  );
}
