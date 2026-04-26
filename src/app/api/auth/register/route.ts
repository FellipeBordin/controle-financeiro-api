import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash";
import { generateToken } from "@/lib/auth";

function corsHeaders(origin?: string | null) {
  const allowedOrigins = ["http://localhost:8081", "http://192.168.18.8:8081"];

  const allowedOrigin =
    origin && allowedOrigins.includes(origin)
      ? origin
      : "http://localhost:8081";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

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
        { status: 400, headers: corsHeaders(origin) },
      );
    }

    const { name, email, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "E-mail já cadastrado" },
        { status: 409, headers: corsHeaders(origin) },
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
      { status: 201, headers: corsHeaders(origin) },
    );
  } catch (error) {
    console.error("REGISTER_ERROR", error);

    return NextResponse.json(
      { error: "Erro interno ao cadastrar usuário" },
      { status: 500, headers: corsHeaders(origin) },
    );
  }
}
