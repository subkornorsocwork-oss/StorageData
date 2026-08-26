export function compareBarcodes(a: string | null | undefined, b: string | null | undefined) {
  const left = (a ?? "").trim();
  const right = (b ?? "").trim();

  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  const leftMatch = left.match(/^(.*?)(\d+)(.*)$/);
  const rightMatch = right.match(/^(.*?)(\d+)(.*)$/);
  if (!leftMatch || !rightMatch) {
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  }

  const prefixOrder = leftMatch[1].localeCompare(rightMatch[1], undefined, { sensitivity: "base" });
  if (prefixOrder !== 0) return prefixOrder;

  const numberOrder = Number(leftMatch[2]) - Number(rightMatch[2]);
  if (numberOrder !== 0) return numberOrder;

  // Keep a stable, predictable order when A1 and A01 represent the same number.
  const paddingOrder = leftMatch[2].length - rightMatch[2].length;
  if (paddingOrder !== 0) return paddingOrder;

  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}
