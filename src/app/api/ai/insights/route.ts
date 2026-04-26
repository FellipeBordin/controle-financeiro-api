/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserFromAuthHeader } from "@/lib/get-user-from-token";
import { getMonthRange } from "@/lib/month";
import { moneyToNumber } from "@/lib/money";
import { buildInsightSummary } from "@/lib/insights";
import { openai } from "@/lib/openai";
import { corsHeaders } from "@/lib/cors";

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Formato inválido. Use YYYY-MM"),
});

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
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

    const parsed = querySchema.safeParse({ month });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetro 'month' inválido. Use YYYY-MM" },
        { status: 400, headers: corsHeaders() },
      );
    }

    const { startDate, endDate } = getMonthRange(parsed.data.month);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: authUser.userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    const formattedTransactions = transactions.map((transaction: any) => ({
      ...transaction,
      amount: moneyToNumber(transaction.amount),
    }));

    if (formattedTransactions.length === 0) {
      return NextResponse.json(
        {
          month: parsed.data.month,
          insight:
            "Ainda não há lançamentos neste mês. Cadastre receitas e despesas para receber um insight.",
          summary: null,
        },
        { headers: corsHeaders() },
      );
    }

    const summary = buildInsightSummary(formattedTransactions);

    const prompt = `
Você é um assistente de educação financeira.
Analise os dados abaixo e gere apenas 1 insight curto, claro e prático em português do Brasil.

Regras:
- Responda em no máximo 3 frases.
- Não invente valores.
- Não faça promessa de enriquecimento.
- Não dê aconselhamento financeiro complexo.
- Foque em organização financeira pessoal.
- Se houver uma categoria dominante de gasto, mencione isso.
- Se possível, sugira uma ação simples e prática.

Dados do mês:
- Receita total: R$ ${summary.totalIncome.toFixed(2)}
- Despesa total: R$ ${summary.totalExpense.toFixed(2)}
- Saldo: R$ ${summary.balance.toFixed(2)}
- Maior categoria de gasto: ${summary.topExpenseCategory ?? "N/A"}
- Valor da maior categoria: R$ ${summary.topExpenseCategoryAmount.toFixed(2)}
`;

    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: prompt,
    });

    const insight =
      response.output_text?.trim() ||
      "Não foi possível gerar um insight neste momento.";

    return NextResponse.json(
      {
        month: parsed.data.month,
        insight,
        summary,
      },
      { headers: corsHeaders() },
    );
  } catch (error) {
    console.error("AI_INSIGHTS_ERROR", error);

    return NextResponse.json(
      {
        month: new URL(req.url).searchParams.get("month"),
        insight:
          "Seu resumo financeiro foi gerado no modo básico. Continue registrando receitas e despesas para acompanhar melhor seus gastos.",
        summary: null,
      },
      { status: 200, headers: corsHeaders() },
    );
  }
}
