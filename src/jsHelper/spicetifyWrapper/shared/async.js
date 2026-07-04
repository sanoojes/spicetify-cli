export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitFor(getValue, ms, attempt = 0) {
  const value = getValue();
  if (value) return value;

  await delay(Math.min(ms * 2 ** Math.min(attempt, 6), 1000));
  return waitFor(getValue, ms, attempt + 1);
}
