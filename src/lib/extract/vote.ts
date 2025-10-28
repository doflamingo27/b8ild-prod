export type Cand<T = string> = {
  value: T;
  score: number;
  source: 'regex' | 'layout' | 'template';
};

export function choose<T>(arr: Cand<T>[]): Cand<T> | null {
  if (!arr || !arr.length) return null;
  
  // Regrouper par valeur et sommer les scores
  const byVal = new Map<string, number>();
  for (const c of arr) {
    const key = String(c.value);
    byVal.set(key, (byVal.get(key) || 0) + c.score);
  }
  
  // Trouver la valeur avec le meilleur score total
  const best = [...byVal.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!best) return null;
  
  // Retourner le candidat individuel avec la meilleure source
  const chosen = arr
    .filter(c => String(c.value) === best[0])
    .sort((a, b) => {
      // Ordre de préférence : template > layout > regex
      const sourceOrder = { template: 3, layout: 2, regex: 1 };
      const scoreA = sourceOrder[a.source] * 100 + a.score;
      const scoreB = sourceOrder[b.source] * 100 + b.score;
      return scoreB - scoreA;
    })[0];
  
  return chosen;
}
