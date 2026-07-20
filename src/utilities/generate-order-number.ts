export function generateOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SLX-${stamp}-${random}`;
}
