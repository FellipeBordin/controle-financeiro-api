import { NextResponse } from "next/server";

import { corsHeaders } from "@/lib/cors";
import { getUserFromAuthHeader } from "@/lib/get-user-from-token";
import { prisma } from "@/lib/prisma";

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");

  try {
    const authHeader = req.headers.get("authorization");
    const authUser = getUserFromAuthHeader(authHeader);

    if (!authUser) {
      return NextResponse.json(
        {
          error: "Não autorizado",
        },
        {
          status: 401,
          headers: corsHeaders(origin),
        },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: authUser.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Usuário não encontrado",
        },
        {
          status: 404,
          headers: corsHeaders(origin),
        },
      );
    }

    return NextResponse.json(
      {
        user,
      },
      {
        status: 200,
        headers: corsHeaders(origin),
      },
    );
  } catch (error) {
    console.error("ME_ERROR", error);

    return NextResponse.json(
      {
        error: "Erro interno ao buscar usuário",
      },
      {
        status: 500,
        headers: corsHeaders(origin),
      },
    );
  }
}
