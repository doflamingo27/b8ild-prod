export type Cand<T = string> = {
  value: T;
  score: number;
  source: 'regex' | 'layout' | 'template';
};

export function choose<T>(arr?: Cand<T>[]): Cand<T> | null {
  if (!arr?.length) return null;
  
  const byValue = new Map<string, number>();
  
  for (const candidate of arr) {
    const key = String(candidate.value);
    byValue.set(key, (byValue.get(key) || 0) + candidate.score);
  }
  
  const [bestValue] = [...byValue.entries()].sort((a, b) => b[1] - a[1])[0];
  
  return [...arr]
    .filter((c) => String(c.value) === bestValue)
    .sort((a, b) => b.score - a.score)[0];
}
