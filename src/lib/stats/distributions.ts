// Distribution quantiles needed for confidence intervals.
// Pure functions; no dependencies. Validated against published critical values
// in distributions.test.ts.

/**
 * Inverse standard normal CDF (quantile function).
 * Acklam's rational approximation; absolute error < ~1.15e-9.
 * Returns z such that P(Z <= z) = p, for p in (0, 1).
 */
export function invNormalCdf(p: number): number {
  if (p <= 0 || p >= 1) {
    if (p === 0) return -Infinity;
    if (p === 1) return Infinity;
    return NaN;
  }

  // Coefficients
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
}

/**
 * Two-sided Student's t critical value.
 * Returns t* such that P(|T_df| > t*) = pTwoTail (Hill, Algorithm 396, 1970).
 * For a 95% CI pass pTwoTail = 0.05.
 */
export function studentTCritical(pTwoTail: number, df: number): number {
  if (pTwoTail <= 0 || pTwoTail >= 1 || df < 1) return NaN;
  const n = df;

  if (n === 1) {
    return 1 / Math.tan((pTwoTail * Math.PI) / 2);
  }
  if (n === 2) {
    return Math.sqrt(2 / (pTwoTail * (2 - pTwoTail)) - 2);
  }

  const a = 1 / (n - 0.5);
  const b = 48 / (a * a);
  let c = ((20700 * a) / b - 98) * a * a - 16 * a + 96.36;
  // Re-derive c following Hill exactly:
  c = ((20700 * a / b - 98) * a - 16) * a + 96.36;
  const d = ((94.5 / (b + c) - 3) / b + 1) * Math.sqrt(a * Math.PI * 0.5) * n;

  let x = d * pTwoTail;
  let y = Math.pow(x, 2 / n);

  if (y > 0.05 + a) {
    // Use the normal approximation refinement.
    const xn = invNormalCdf(pTwoTail * 0.5); // negative value
    x = -xn; // upper-tail z
    y = x * x;
    if (n < 5) c = c + 0.3 * (n - 4.5) * (x + 0.6);
    c = (((0.05 * d * x - 5) * x - 7) * x - 2) * x + b + c;
    y =
      (((((0.4 * y + 6.3) * y + 36) * y + 94.5) / c - y - 3) / b + 1) * x;
    y = a * y * y;
    y = y > 0.002 ? Math.exp(y) - 1 : 0.5 * y * y + y;
  } else {
    y =
      ((1 /
        (((n + 6) / (n * y) - 0.089 * d - 0.822) * (n + 2) * 3) +
        0.5 / (n + 4)) *
        y -
        1) *
        ((n + 1) / (n + 2)) +
      1 / y;
  }

  return Math.sqrt(n * y);
}
