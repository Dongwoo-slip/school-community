const VISITOR_BASELINE_ACTUAL = 11951;
const VISITOR_BASELINE_DISPLAY = 119510;

export function displayedVisitorCount(actual: number) {
  return VISITOR_BASELINE_DISPLAY + Math.max(0, actual - VISITOR_BASELINE_ACTUAL);
}
