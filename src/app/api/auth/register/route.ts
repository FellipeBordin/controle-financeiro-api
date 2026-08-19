import { NextResponse } from "next/server";
import { z } from "zod";

import { generateToken } from "@/lib/auth";
import { corsHeaders } from "@/lib/cors";
import { hashPassword } from "@/lib/hash";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
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

    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: parsed.error.flatten(),
        },
        {
          status: 400,
          headers: corsHeaders(origin),
        },
      );
    }

    const { name, email, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "E-mail já cadastrado",
        },
        {
          status: 409,
          headers: corsHeaders(origin),
        },
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json(
      {
        message: "Usuário criado com sucesso",
        user,
        token,
      },
      {
        status: 201,
        headers: corsHeaders(origin),
      },
    );
  } catch (error) {
    console.error("REGISTER_ERROR", error);

    return NextResponse.json(
      {
        error: "Erro interno ao cadastrar usuário",
      },
      {
        status: 500,
        headers: corsHeaders(origin),
      },
    );
  }
}
