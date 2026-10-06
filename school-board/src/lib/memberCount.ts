const MEMBER_BASELINE_ACTUAL = 371;
const MEMBER_BASELINE_DISPLAY = 732;

export function displayedMemberCount(actual: number) {
  return MEMBER_BASELINE_DISPLAY + Math.max(0, actual - MEMBER_BASELINE_ACTUAL);
}
