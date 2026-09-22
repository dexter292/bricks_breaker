/** Known-good fixture for worklet-closure guard self-check (NJ-1). */
export function helper(): number {
  'worklet';
  return 1;
}

export function caller(): number {
  'worklet';
  return helper() + 1;
}
