// Pure classification logic for provision-collector.mjs's actual purpose:
// did handle_new_user() (Admin repo) really create a profiles row with
// role='collector'? Extracted from the CLI script specifically so this can
// be unit-tested and catch a future regression automatically — a one-time
// manual CLI run proves the trigger works today, not that it still will
// after some later change.
export function classifyProfileCheck(profile) {
  if (profile && profile.role === 'collector') return { status: 'fired-correctly' }
  if (profile) return { status: 'wrong-role', role: profile.role }
  return { status: 'missing-regression' }
}
