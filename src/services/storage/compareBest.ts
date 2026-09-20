export function evaluatePersonalBest(
  runScore: number,
  previousBest: number,
): { best: number; isNewRecord: boolean } {
  const isNewRecord = runScore > previousBest;
  return {
    best: isNewRecord ? runScore : previousBest,
    isNewRecord,
  };
}
