// ─── HOME PAGE BEHAVIOR ───

// uptime counter
const startTime = Date.now();
function updateUptime() {
  const s = Math.floor((Date.now() - startTime) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  document.getElementById('uptime').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
setInterval(updateUptime, 1000);

// ─── PIN ───
let pinCount = 0;
function pinClick() {
  const msgs = ['📌 load-bearing pin', '📌 don\'t remove this', '📌 structural integrity: pin-dependent', '📌 ok that one does nothing'];
  toast(msgs[pinCount % msgs.length]);
  pinCount++;
}

// ─── TITLE GLITCH on long hover ───
const bigTitle = document.getElementById('bigTitle');
let hoverTimer;
bigTitle.addEventListener('mouseenter', () => {
  hoverTimer = setTimeout(() => {
    bigTitle.classList.add('glitch-active');
    toast('> runtime error: too much charisma');
    setTimeout(() => bigTitle.classList.remove('glitch-active'), 500);
  }, 3000);
});
bigTitle.addEventListener('mouseleave', () => clearTimeout(hoverTimer));
