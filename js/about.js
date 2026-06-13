// ─── ABOUT PAGE BEHAVIOR ───
const fixations = ['css scroll animations (again)', 'reinventing tools that exist', 'optimizing code that runs once', 'side project for a side project', 'dark mode for everything', 'adding easter eggs to websites'];
document.getElementById('fixation').textContent = fixations[Math.floor(Math.random() * fixations.length)];
document.getElementById('tabCount').textContent = `~${Math.floor(Math.random() * 60) + 40} tabs (lowball estimate)`;
document.getElementById('monsterCount').textContent = `${Math.floor(Math.random() * 3) + 2} today · ${Math.floor(Math.random() * 20) + 30} this week`;

const stack = ['HTML','CSS','JS','TypeScript','Lua','Python','React','Node','Git','bash','Docker','caffeine','stubbornness'];
const stackContainer = document.getElementById('stack-pills');
stackContainer.innerHTML = stack.map(s => `<span class="stack-pill">${s}</span>`).join('');
