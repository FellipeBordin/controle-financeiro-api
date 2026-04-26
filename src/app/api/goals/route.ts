/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserFromAuthHeader } from "@/lib/get-user-from-token";
import { moneyToNumber } from "@/lib/money";
import { getMonthRange } from "@/lib/month";
import { corsHeaders } from "@/lib/cors";

const goalSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Formato inválido. Use YYYY-MM"),
  targetAmount: z.number().positive("A meta deve ser maior que zero"),
});

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const authUser = getUserFromAuthHeader(authHeader);

    if (!authUser) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401, headers: corsHeaders() },
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
        { status: 400, headers: corsHeaders() },
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
          where: { id: existingGoal.id },
          data: { targetAmount },
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
      { status: 201, headers: corsHeaders() },
    );
  } catch (error) {
    console.error("UPSERT_GOAL_ERROR", error);

    return NextResponse.json(
      { error: "Erro interno ao salvar meta" },
      { status: 500, headers: corsHeaders() },
    );
  }
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const authUser = getUserFromAuthHeader(authHeader);

    if (!authUser) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401, headers: corsHeaders() },
      );
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        { error: "Parâmetro 'month' é obrigatório" },
        { status: 400, headers: corsHeaders() },
      );
    }

    const monthValidation = z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Formato inválido. Use YYYY-MM")
      .safeParse(month);

    if (!monthValidation.success) {
      return NextResponse.json(
        { error: "Formato inválido. Use YYYY-MM" },
        { status: 400, headers: corsHeaders() },
      );
    }

    const goal = await prisma.goal.findFirst({
      where: {
        userId: authUser.userId,
        month,
      },
    });

    const { startDate, endDate } = getMonthRange(month);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: authUser.userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const formattedTransactions = transactions.map((transaction: any) => ({
      ...transaction,
      amount: moneyToNumber(transaction.amount),
    }));

    const totalIncome = formattedTransactions
      .filter((transaction: any) => transaction.type === "income")
      .reduce((sum: number, transaction: any) => sum + transaction.amount, 0);

    const totalExpense = formattedTransactions
      .filter((transaction: any) => transaction.type === "expense")
      .reduce((sum: number, transaction: any) => sum + transaction.amount, 0);

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
          month,
          totalIncome,
          totalExpense,
          balance,
          targetAmount,
          remainingToGoal,
          goalReached,
        },
      },
      { headers: corsHeaders() },
    );
  } catch (error) {
    console.error("GET_GOAL_ERROR", error);

    return NextResponse.json(
      { error: "Erro interno ao buscar meta" },
      { status: 500, headers: corsHeaders() },
    );
  }
}
