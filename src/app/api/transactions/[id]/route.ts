import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserFromAuthHeader } from "@/lib/get-user-from-token";
import { moneyToNumber } from "@/lib/money";
import { corsHeaders } from "@/lib/cors";

const updateTransactionSchema = z.object({
  title: z.string().min(2).optional(),
  amount: z.number().positive().optional(),
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().min(2).optional(),
  date: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const authHeader = req.headers.get("authorization");
    const authUser = getUserFromAuthHeader(authHeader);

    if (!authUser) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401, headers: corsHeaders() },
      );
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    const parsed = updateTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: parsed.error.flatten(),
        },
        { status: 400, headers: corsHeaders() },
      );
    }

    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: authUser.userId,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 },
      );
    }

    const data = parsed.data;

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    return NextResponse.json(
      {
        message: "Transação atualizada com sucesso",
        transaction: {
          ...updatedTransaction,
          amount: moneyToNumber(updatedTransaction.amount),
        },
      },
      { headers: corsHeaders() },
    );
  } catch (error) {
    console.error("UPDATE_TRANSACTION_ERROR", error);

    return NextResponse.json(
      { error: "Erro interno ao atualizar transação" },
      { status: 500, headers: corsHeaders() },
    );
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const authHeader = req.headers.get("authorization");
    const authUser = getUserFromAuthHeader(authHeader);

    if (!authUser) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401, headers: corsHeaders() },
      );
    }

    const { id } = await context.params;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: authUser.userId,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Lançamento não encontrado" },
        { status: 404, headers: corsHeaders() },
      );
    }

    await prisma.transaction.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Lançamento excluído com sucesso" },
      { headers: corsHeaders() },
    );
  } catch (error) {
    console.error("DELETE_TRANSACTION_ERROR", error);

    return NextResponse.json(
      { error: "Erro interno ao excluir lançamento" },
      { status: 500, headers: corsHeaders() },
    );
  }
}
