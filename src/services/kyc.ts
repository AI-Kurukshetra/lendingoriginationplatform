export function runMockKyc(payload: {
  firstName: string;
  lastName: string;
  idNumber?: string;
}) {
  const match = payload.idNumber && payload.idNumber.length >= 6;
  return {
    provider: "mock-kyc",
    result: match ? "verified" : "review",
    payload: {
      match,
      confidence: match ? 0.92 : 0.62,
    },
  };
}
