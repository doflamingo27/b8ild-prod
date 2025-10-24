export type Candidate<T = string> = { 
  value: T; 
  score: number; 
  source: 'regex' | 'heur' | 'tmpl'; 
  where?: any;
};

export type FieldCandidates = Record<string, Candidate[]>;

export function pickBest<T = any>(
  list: Candidate<T>[], 
  tieBreaker?: (a: Candidate<T>, b: Candidate<T>) => number
): Candidate<T> | null {
  if (!list || !list.length) return null;
  
  // Trier par score décroissant + tie-breaker optionnel
  const sorted = [...list].sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) return scoreDiff;
    return tieBreaker ? tieBreaker(a, b) : 0;
  });
  
  return sorted[0];
}

export function boost(list: Candidate[], when: boolean, plus = 0.1): Candidate[] {
  if (!when) return list;
  for (const c of list) {
    c.score += plus;
  }
  return list;
}

export function addCandidate(
  map: Map<string, Candidate<any>[]>,
  key: string,
  value: any,
  source: 'regex' | 'heur' | 'tmpl',
  baseScore: number
): void {
  if (value === null || value === undefined) return;
  
  if (!map.has(key)) {
    map.set(key, []);
  }
  
  map.get(key)!.push({
    value,
    score: baseScore,
    source,
    where: { key }
  });
}

export function boostConcordance(candidates: FieldCandidates): void {
  // Si 2+ sources donnent la même valeur, boost les candidats concordants
  for (const [field, list] of Object.entries(candidates)) {
    const valueCount = new Map<any, number>();
    
    for (const c of list) {
      const key = JSON.stringify(c.value);
      valueCount.set(key, (valueCount.get(key) || 0) + 1);
    }
    
    for (const c of list) {
      const key = JSON.stringify(c.value);
      if (valueCount.get(key)! >= 2) {
        c.score += 0.15; // Boost concordance
      }
    }
  }
}
