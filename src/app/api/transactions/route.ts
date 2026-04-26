/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserFromAuthHeader } from "@/lib/get-user-from-token";
import { moneyToNumber } from "@/lib/money";
import { corsHeaders } from "@/lib/cors";

const transactionSchema = z.object({
  title: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  type: z.enum(["income", "expense"]),
  category: z.string().min(2, "Categoria obrigatória"),
  date: z.string().datetime("Data inválida"),
  notes: z.string().optional(),
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
    const parsed = transactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: parsed.error.flatten(),
        },
        { status: 400, headers: corsHeaders() },
      );
    }

    const { title, amount, type, category, date, notes } = parsed.data;

    const transaction = await prisma.transaction.create({
      data: {
        title,
        amount,
        type,
        category,
        date: new Date(date),
        notes,
        userId: authUser.userId,
      },
    });

    return NextResponse.json(
      {
        message: "Transação criada com sucesso",
        transaction: {
          ...transaction,
          amount: moneyToNumber(transaction.amount),
        },
      },
      { status: 201, headers: corsHeaders() },
    );
  } catch (error) {
    console.error("CREATE_TRANSACTION_ERROR", error);

    return NextResponse.json(
      { error: "Erro interno ao criar transação" },
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

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: authUser.userId,
      },
      orderBy: {
        date: "desc",
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

    return NextResponse.json(
      {
        transactions: formattedTransactions,
        summary: {
          totalIncome,
          totalExpense,
          balance,
        },
      },
      { headers: corsHeaders() },
    );
  } catch (error) {
    console.error("GET_TRANSACTIONS_ERROR", error);

    return NextResponse.json(
      { error: "Erro interno ao buscar transações" },
      { status: 500, headers: corsHeaders() },
    );
  }
}
