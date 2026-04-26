export function getMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  const startDate = new Date(Date.UTC(year, monthNumber - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, monthNumber, 1, 0, 0, 0));

  return {
    startDate,
    endDate,
  };
}
