/**
 * Safely evaluate a simple arithmetic expression.
 * Supports: + - * / ( ) and decimal numbers (dot or comma separator).
 * Returns null if the input is empty or invalid.
 * Never uses eval().
 */
export function evalExpr(input: string): number | null {
  const s = input.trim().replace(/\s/g, '').replace(/,/g, '.');
  if (!s) return null;

  let pos = 0;

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (pos < s.length && (s[pos] === '+' || s[pos] === '-')) {
      const op = s[pos++];
      const right = parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv(): number {
    let left = parseUnary();
    while (pos < s.length && (s[pos] === '*' || s[pos] === '/' || s[pos] === 'x' || s[pos] === 'X')) {
      const op = s[pos++];
      const right = parseUnary();
      left = (op === '*' || op === 'x' || op === 'X') ? left * right : left / right;
    }
    return left;
  }

  function parseUnary(): number {
    if (s[pos] === '-') { pos++; return -parseAtom(); }
    if (s[pos] === '+') { pos++; return parseAtom(); }
    return parseAtom();
  }

  function parseAtom(): number {
    if (s[pos] === '(') {
      pos++;
      const val = parseAddSub();
      if (s[pos] === ')') pos++;
      return val;
    }
    const start = pos;
    while (pos < s.length && (s[pos] >= '0' && s[pos] <= '9' || s[pos] === '.')) pos++;
    if (pos === start) throw new Error('Expected number');
    return parseFloat(s.slice(start, pos));
  }

  try {
    const result = parseAddSub();
    if (pos !== s.length) return null; // leftover chars
    if (!isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

/** Resolve an expression string to a clean number string on blur. */
export function resolveExpr(raw: string): string {
  const v = evalExpr(raw);
  if (v === null) return raw;
  // Round to at most 4 decimal places, strip trailing zeros
  return String(Math.round(v * 10000) / 10000);
}
