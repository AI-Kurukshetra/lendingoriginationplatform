"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function payment(amount: number, annualRate: number, months: number) {
  if (!amount || !annualRate || !months) return 0;
  const rate = annualRate / 100 / 12;
  if (rate === 0) return amount / months;
  return (amount * rate) / (1 - Math.pow(1 + rate, -months));
}

export function LoanComparisonClient({
  products,
}: {
  products: { id: string; name: string; base_rate: number; min_term_months: number; max_term_months: number }[];
}) {
  const [amount, setAmount] = useState(20000);
  const [term, setTerm] = useState(36);

  const comparisons = useMemo(() => {
    return products.map((product) => {
      const monthly = payment(amount, product.base_rate, term);
      const total = monthly * term;
      return { ...product, monthly, total };
    });
  }, [amount, term, products]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted">Loan amount</p>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div>
            <p className="text-xs text-muted">Term (months)</p>
            <Input
              type="number"
              value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {comparisons.map((product) => (
          <Card key={product.id}>
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <p className="text-xs text-muted">Base rate: {product.base_rate}%</p>
            <div className="mt-4 space-y-1 text-sm">
              <p>Monthly payment: ${product.monthly.toFixed(2)}</p>
              <p>Total cost: ${product.total.toFixed(2)}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
