type MonthRange = {
  startDate: Date;
  endDate: Date;
};

export function getMonthRange(month: string): MonthRange {
  const [yearString, monthString] = month.split("-");

  const year = Number(yearString);
  const monthNumber = Number(monthString);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    throw new Error("Mês inválido. Use o formato YYYY-MM.");
  }

  const startDate = new Date(Date.UTC(year, monthNumber - 1, 1, 0, 0, 0));

  const endDate = new Date(Date.UTC(year, monthNumber, 1, 0, 0, 0));

  return {
    startDate,
    endDate,
  };
}
