// ─── DEVLOG PAGE BEHAVIOR ───
const lines = [
  {ts:'09:12:03', type:'cmd', text:'git status'},
  {ts:'09:12:03', type:'out', text:'nothing to commit (sure, git, sure)'},
  {ts:'09:14:55', type:'cmd', text:'npm run dev'},
  {ts:'09:14:56', type:'warn', text:'73 deprecated packages · vibes deprecated too'},
  {ts:'09:22:11', type:'cmd', text:'git commit -m "fix bug"'},
  {ts:'09:22:11', type:'err', text:'broke something else. classic.'},
  {ts:'09:22:15', type:'cmd', text:'git commit -m "fix the fix"'},
  {ts:'09:45:00', type:'dim', text:'// TODO: write tests (someday)'},
  {ts:'10:30:22', type:'cmd', text:'npm install yet-another-package'},
  {ts:'10:30:23', type:'warn', text:'added 847 packages. cool. cool cool cool.'},
  {ts:'11:02:08', type:'cmd', text:'git push origin main'},
  {ts:'11:15:44', type:'err', text:'prod is on fire · estimated fix: soon™'},
  {ts:'11:16:01', type:'cmd', text:'git revert HEAD --no-edit'},
  {ts:'14:00:00', type:'dim', text:'resumed after lunch. it was a good sandwich.'},
  {ts:'16:30:12', type:'out', text:'it works and i don\'t know why. shipping.'},
  {ts:'16:30:15', type:'dim', text:'// closing the 47 debugging tabs now'},
];

const out = document.getElementById('logOutput');
lines.forEach((l, i) => {
  setTimeout(() => {
    const div = document.createElement('div');
    div.className = 'log-line';
    div.innerHTML = `<span class="ts">${l.ts}</span><span class="${l.type === 'cmd' ? 'prompt' : ''}">${l.type === 'cmd' ? '$ ' : ''}</span><span class="${l.type}">${l.text}</span>`;
    out.appendChild(div);
  }, i * 80);
});
