// ─── PROJECTS PAGE BEHAVIOR ───
let mysteryClicks = 0;
function mysteryClick() {
  const msgs = [
    '> [CLASSIFIED]',
    '> access denied. clearance level: insufficient',
    '> hint: it\'s big. that\'s all.',
    '> ok fine. it\'s on github soon. maybe.',
    '> you asked 4 times. respect. still classified.'
  ];
  toast(msgs[Math.min(mysteryClicks, msgs.length - 1)]);
  mysteryClicks++;
}
