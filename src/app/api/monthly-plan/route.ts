/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserFromAuthHeader } from "@/lib/get-user-from-token";
import { corsHeaders } from "@/lib/cors";
import { moneyToNumber } from "@/lib/money";
import { getMonthRange } from "@/lib/month";

const monthlyPlanSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Formato inválido. Use YYYY-MM"),
  expectedIncome: z.number().nonnegative("Receita prevista inválida"),
  categories: z.array(
    z.object({
      name: z.string().min(2, "Nome da categoria obrigatório"),
      plannedAmount: z.number().nonnegative("Valor planejado inválido"),
    }),
  ),
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
    const parsed = monthlyPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: parsed.error.flatten(),
        },
        { status: 400, headers: corsHeaders() },
      );
    }

    const { month, expectedIncome, categories } = parsed.data;

    const existingPlan = await prisma.monthlyPlan.findFirst({
      where: {
        userId: authUser.userId,
        month,
      },
    });

    if (existingPlan) {
      await prisma.budgetCategory.deleteMany({
        where: {
          planId: existingPlan.id,
        },
      });

      const updatedPlan = await prisma.monthlyPlan.update({
        where: {
          id: existingPlan.id,
        },
        data: {
          expectedIncome,
          budgetCategories: {
            create: categories.map((category: any) => ({
              name: category.name,
              plannedAmount: category.plannedAmount,
            })),
          },
        },
        include: {
          budgetCategories: true,
        },
      });

      return NextResponse.json(
        {
          message: "Planejamento atualizado com sucesso",
          plan: {
            ...updatedPlan,
            expectedIncome: moneyToNumber(updatedPlan.expectedIncome),
            budgetCategories: updatedPlan.budgetCategories.map(
              (category: any) => ({
                ...category,
                plannedAmount: moneyToNumber(category.plannedAmount),
              }),
            ),
          },
        },
        { headers: corsHeaders() },
      );
    }

    const plan = await prisma.monthlyPlan.create({
      data: {
        month,
        expectedIncome,
        userId: authUser.userId,
        budgetCategories: {
          create: categories.map((category: any) => ({
            name: category.name,
            plannedAmount: category.plannedAmount,
          })),
        },
      },
      include: {
        budgetCategories: true,
      },
    });

    return NextResponse.json(
      {
        message: "Planejamento criado com sucesso",
        plan: {
          ...plan,
          expectedIncome: moneyToNumber(plan.expectedIncome),
          budgetCategories: plan.budgetCategories.map((category: any) => ({
            ...category,
            plannedAmount: moneyToNumber(category.plannedAmount),
          })),
        },
      },
      { status: 201, headers: corsHeaders() },
    );
  } catch (error) {
    console.error("SAVE_MONTHLY_PLAN_ERROR", error);

    return NextResponse.json(
      { error: "Erro interno ao salvar planejamento" },
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

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Parâmetro 'month' inválido. Use YYYY-MM" },
        { status: 400, headers: corsHeaders() },
      );
    }

    const plan = await prisma.monthlyPlan.findFirst({
      where: {
        userId: authUser.userId,
        month,
      },
      include: {
        budgetCategories: true,
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

    const realIncome = formattedTransactions
      .filter((transaction: any) => transaction.type === "income")
      .reduce((sum: number, transaction: any) => sum + transaction.amount, 0);

    const realExpense = formattedTransactions
      .filter((transaction: any) => transaction.type === "expense")
      .reduce((sum: number, transaction: any) => sum + transaction.amount, 0);

    const realBalance = realIncome - realExpense;

    const formattedPlan = plan
      ? {
          ...plan,
          expectedIncome: moneyToNumber(plan.expectedIncome),
          budgetCategories: plan.budgetCategories.map((category: any) => {
            const plannedAmount = moneyToNumber(category.plannedAmount);

            const realAmount = formattedTransactions
              .filter(
                (transaction: any) =>
                  transaction.type === "expense" &&
                  transaction.category === category.name,
              )
              .reduce(
                (sum: number, transaction: any) => sum + transaction.amount,
                0,
              );

            return {
              ...category,
              plannedAmount,
              realAmount,
              difference: plannedAmount - realAmount,
              exceeded: realAmount > plannedAmount,
            };
          }),
        }
      : null;

    const plannedExpense =
      formattedPlan?.budgetCategories.reduce(
        (sum: number, category: any) => sum + category.plannedAmount,
        0,
      ) ?? 0;

    const expectedIncome = formattedPlan?.expectedIncome ?? 0;
    const plannedBalance = expectedIncome - plannedExpense;

    return NextResponse.json(
      {
        plan: formattedPlan,
        summary: {
          month,
          expectedIncome,
          plannedExpense,
          plannedBalance,
          realIncome,
          realExpense,
          realBalance,
          incomeDifference: realIncome - expectedIncome,
          expenseDifference: plannedExpense - realExpense,
          balanceDifference: realBalance - plannedBalance,
        },
      },
      { headers: corsHeaders() },
    );
  } catch (error) {
    console.error("GET_MONTHLY_PLAN_ERROR", error);

    return NextResponse.json(
      { error: "Erro interno ao buscar planejamento" },
      { status: 500, headers: corsHeaders() },
    );
  }
}

export async function DELETE(req: Request) {
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
        { error: "Mês obrigatório" },
        { status: 400, headers: corsHeaders() },
      );
    }

    await prisma.monthlyPlan.deleteMany({
      where: {
        userId: authUser.userId,
        month,
      },
    });

    return NextResponse.json(
      { message: "Planejamento excluído" },
      { headers: corsHeaders() },
    );
  } catch (error) {
    console.error("DELETE_MONTHLY_PLAN_ERROR", error);

    return NextResponse.json(
      { error: "Erro ao excluir planejamento" },
      { status: 500, headers: corsHeaders() },
    );
  }
}
