// ─── SHARED SITE BEHAVIOR ───
// Theme, toasts, nav easter eggs, konami code, console hooks.
// Loaded on every page.

// footer year (if present on this page)
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ─── DARK MODE ───
const root = document.documentElement;
let dark = false;
try { dark = localStorage.getItem('jaypix-theme') === 'dark'; } catch(e) {}
applyTheme(dark);

function applyTheme(isDark) {
  dark = isDark;
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (icon) icon.textContent = isDark ? '☀' : '☽';
  if (label) label.textContent = isDark ? 'light mode' : 'dark mode';
  try { localStorage.setItem('jaypix-theme', isDark ? 'dark' : 'light'); } catch(e) {}
}

function toggleTheme() {
  applyTheme(!dark);
  toast(dark ? '> theme: dark mode engaged. eyes: saved.' : '> theme: light mode. blinding. classic.');
}

// ─── TOAST ───
function toast(msg) {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = msg;
  c.appendChild(d);
  setTimeout(() => d.remove(), 3200);
}

// ─── LOGO CLICK ───
let logoClicks = 0;
const logoMsgs = [
  '> access_level: nerd',
  '> error: personality too big',
  '> cat life.txt: "building stuff"',
  '> git commit -m "exists"',
  '> rm -rf regrets/',
  '> sudo make me a sandwich',
  '> error 418: i\'m a teapot',
  '> uptime: too long. send coffee.',
  '> whoami: jaypix (obviously)',
  '> ls hobbies/: too many results'
];
const logoBtn = document.getElementById('logoBtn');
if (logoBtn) {
  logoBtn.addEventListener('click', () => {
    toast(logoMsgs[logoClicks % logoMsgs.length]);
    logoClicks++;
    if (logoClicks === 7) toast('> wait, you\'re still clicking??');
    if (logoClicks === 13) toast('> ok you unlocked something. check the title.');
  });
}

// ─── SECRET REVEALS ───
function secretReveal(n) {
  const reveals = {
    1: '> feature: bug that survived long enough to be intentional',
    2: '> more eggs. check console. also try the konami code.',
    3: '* and a suspiciously helpful AI but we won\'t mention that',
    4: '> hover the big title for 3s. don\'t ask why.',
    5: '> console: try jaypix.help() or jaypix.coffee()'
  };
  toast(reveals[n]);
}

// ─── KONAMI ───
const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIdx = 0;
document.addEventListener('keydown', e => {
  if (e.key === konami[konamiIdx]) {
    konamiIdx++;
    if (konamiIdx === konami.length) {
      konamiIdx = 0;
      toast('> konami unlocked. you played yourself. congrats.');
      const bigTitle = document.getElementById('bigTitle');
      if (bigTitle) {
        bigTitle.style.transition = 'all 0.3s';
        bigTitle.style.transform = 'scale(1.05) rotate(-1deg)';
        bigTitle.style.color = 'var(--accent)';
        setTimeout(() => { bigTitle.style.transform = ''; bigTitle.style.color = ''; }, 1000);
      }
      enableSparkles();
      console.log('%c🏆 KONAMI UNLOCKED ● sparkle mode active', 'color:#c7522a;font-size:14px;');
    }
  } else {
    konamiIdx = e.key === konami[0] ? 1 : 0;
  }
});

// ─── SPARKLE MODE ───
let sparklesEnabled = false;
function enableSparkles() {
  if (sparklesEnabled) return;
  sparklesEnabled = true;
  const emojis = ['✦','✧','★','◆','·','⁎','✱'];
  document.addEventListener('mousemove', e => {
    if (!sparklesEnabled) return;
    if (Math.random() > 0.12) return;
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.left = e.clientX + 'px';
    s.style.top = e.clientY + 'px';
    s.style.color = ['var(--accent)','var(--accent2)','var(--accent3)','var(--yellow)'][Math.floor(Math.random()*4)];
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 700);
  });
}

// ─── CONSOLE EASTER EGGS ───
console.log('%cjaypix.dev', 'font-size:32px;font-family:Georgia,serif;font-style:italic;color:#c7522a;font-weight:300;');
console.log('%cwelcome to the source, detective', 'color:#9b8f82;font-size:12px;');
console.log('%c', '');
console.log('%c↑ ↑ ↓ ↓ ← → ← → B A   (try it on the page)', 'color:#4a4540;font-size:10px;font-style:italic;');
console.log('%c', '');

window.jaypix = {
  help: () => {
    console.log('%cjaypix.dev API (unofficial)', 'color:#c7522a;font-weight:bold;');
    console.log('  jaypix.coffee()    — request caffeination');
    console.log('  jaypix.hire()      — express interest');
    console.log('  jaypix.chaos()     — activate chaos mode');
    console.log('  jaypix.secret()    — ???');
    return '> help loaded. use wisely.';
  },
  coffee: () => {
    const r = ['☕ request queued. eta: never. bring your own.', '☕ monster energy is the real coffee.', '☕ ERROR: coffee pot empty. critical failure.'];
    const msg = r[Math.floor(Math.random()*r.length)];
    console.log('%c' + msg, 'color:#d4a017;');
    toast(msg);
    return msg;
  },
  hire: () => {
    const msg = '📨 shoot an email to contact@jaypix.dev';
    console.log('%c' + msg, 'color:#5c7a3e;font-size:14px;');
    toast(msg);
    return msg;
  },
  chaos: () => {
    enableSparkles();
    toast('> chaos mode: enabled. sparkles incoming.');
    console.log('%c🌀 chaos mode active', 'color:#c7522a;font-size:16px;');
    return '> chaos engaged';
  },
  secret: () => {
    console.log('%c⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛', 'font-size:20px;');
    console.log('%c  REDACTED  ', 'background:#c7522a;color:white;font-size:14px;padding:4px 12px;');
    console.log('%c⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛', 'font-size:20px;');
    return 'clearance level insufficient';
  }
};
