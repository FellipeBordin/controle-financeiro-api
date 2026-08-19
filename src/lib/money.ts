type DecimalLike = {
  toNumber: () => number;
};

export function moneyToNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
  }

  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const decimal = value as Partial<DecimalLike>;

    if (typeof decimal.toNumber === "function") {
      return decimal.toNumber();
    }
  }

  return 0;
}
