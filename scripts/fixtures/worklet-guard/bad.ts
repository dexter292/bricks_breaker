/** Known-bad fixture: worklet calls a non-worklet helper (NJ-1 / NF-1 class). */
export function helper(): number {
  return 1;
}

export function caller(): number {
  'worklet';
  return helper() + 1;
}
