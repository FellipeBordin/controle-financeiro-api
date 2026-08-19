import { NextResponse } from "next/server";
import { z } from "zod";

import { generateToken } from "@/lib/auth";
import { corsHeaders } from "@/lib/cors";
import { comparePassword } from "@/lib/hash";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  try {
    const body = await req.json().catch(() => null);

    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
        },
        {
          status: 400,
          headers: corsHeaders(origin),
        },
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: {
        email,
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

    const isValid = await comparePassword(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        {
          error: "Senha inválida",
        },
        {
          status: 401,
          headers: corsHeaders(origin),
        },
      );
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json(
      {
        message: "Login realizado com sucesso",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      },
      {
        status: 200,
        headers: corsHeaders(origin),
      },
    );
  } catch (error) {
    console.error("LOGIN_ERROR", error);

    return NextResponse.json(
      {
        error: "Erro interno no login",
      },
      {
        status: 500,
        headers: corsHeaders(origin),
      },
    );
  }
}
