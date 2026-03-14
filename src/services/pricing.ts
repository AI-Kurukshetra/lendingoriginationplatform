export function calculatePricing(input: {
  baseRate: number;
  creditScore?: number | null;
  requestedAmount?: number | null;
}) {
  let rate = input.baseRate;
  if ((input.creditScore ?? 0) >= 720) {
    rate -= 0.5;
  }
  if ((input.requestedAmount ?? 0) > 40000) {
    rate += 0.35;
  }
  return Number(rate.toFixed(2));
}
