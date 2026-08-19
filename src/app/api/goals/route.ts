import { NextResponse } from "next/server";
import { z } from "zod";

import { corsHeaders } from "@/lib/cors";
import { getUserFromAuthHeader } from "@/lib/get-user-from-token";
import { getMonthRange } from "@/lib/month";
import { moneyToNumber } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const goalSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Formato inválido. Use YYYY-MM"),

  targetAmount: z.number().positive("A meta deve ser maior que zero"),
});

const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Formato inválido. Use YYYY-MM");

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

    const body = await req.json().catch(() => null);

    const parsed = goalSchema.safeParse(body);

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

    const { month, targetAmount } = parsed.data;

    const existingGoal = await prisma.goal.findFirst({
      where: {
        userId: authUser.userId,
        month,
      },
    });

    const goal = existingGoal
      ? await prisma.goal.update({
          where: {
            id: existingGoal.id,
          },
          data: {
            targetAmount,
          },
        })
      : await prisma.goal.create({
          data: {
            month,
            targetAmount,
            userId: authUser.userId,
          },
        });

    return NextResponse.json(
      {
        message: existingGoal
          ? "Meta atualizada com sucesso"
          : "Meta criada com sucesso",

        goal: {
          ...goal,
          targetAmount: moneyToNumber(goal.targetAmount),
        },
      },
      {
        status: 201,
        headers: corsHeaders(origin),
      },
    );
  } catch (error) {
    console.error("UPSERT_GOAL_ERROR", error);

    return NextResponse.json(
      {
        error: "Erro interno ao salvar meta",
      },
      {
        status: 500,
        headers: corsHeaders(origin),
      },
    );
  }
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

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        {
          error: "Parâmetro 'month' é obrigatório",
        },
        {
          status: 400,
          headers: corsHeaders(origin),
        },
      );
    }

    const monthValidation = monthSchema.safeParse(month);

    if (!monthValidation.success) {
      return NextResponse.json(
        {
          error: "Formato inválido. Use YYYY-MM",
        },
        {
          status: 400,
          headers: corsHeaders(origin),
        },
      );
    }

    const validatedMonth = monthValidation.data;

    const goal = await prisma.goal.findFirst({
      where: {
        userId: authUser.userId,
        month: validatedMonth,
      },
    });

    const { startDate, endDate } = getMonthRange(validatedMonth);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: authUser.userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const formattedTransactions = transactions.map((transaction) => ({
      type: transaction.type,
      amount: moneyToNumber(transaction.amount),
    }));

    const totalIncome = formattedTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const totalExpense = formattedTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const balance = totalIncome - totalExpense;

    const targetAmount = goal ? moneyToNumber(goal.targetAmount) : 0;

    const remainingToGoal = Math.max(targetAmount - balance, 0);

    const goalReached = balance >= targetAmount && targetAmount > 0;

    return NextResponse.json(
      {
        goal: goal
          ? {
              ...goal,
              targetAmount,
            }
          : null,

        summary: {
          month: validatedMonth,
          totalIncome,
          totalExpense,
          balance,
          targetAmount,
          remainingToGoal,
          goalReached,
        },
      },
      {
        status: 200,
        headers: corsHeaders(origin),
      },
    );
  } catch (error) {
    console.error("GET_GOAL_ERROR", error);

    return NextResponse.json(
      {
        error: "Erro interno ao buscar meta",
      },
      {
        status: 500,
        headers: corsHeaders(origin),
      },
    );
  }
}
