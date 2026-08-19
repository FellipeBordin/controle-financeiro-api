export type TransactionInput = {
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
};
type InsightSummary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  topExpenseCategory: string | null;
  topExpenseCategoryAmount: number;
};

export function buildInsightSummary(
  transactions: TransactionInput[],
): InsightSummary {
  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const totalExpense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const balance = totalIncome - totalExpense;

  const expenseByCategory = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce<Record<string, number>>((acc, transaction) => {
      const current = acc[transaction.category] ?? 0;
      acc[transaction.category] = current + transaction.amount;
      return acc;
    }, {});

  let topExpenseCategory: string | null = null;
  let topExpenseCategoryAmount = 0;

  for (const [category, amount] of Object.entries(expenseByCategory)) {
    if (amount > topExpenseCategoryAmount) {
      topExpenseCategory = category;
      topExpenseCategoryAmount = amount;
    }
  }

  return {
    totalIncome,
    totalExpense,
    balance,
    topExpenseCategory,
    topExpenseCategoryAmount,
  };
}
