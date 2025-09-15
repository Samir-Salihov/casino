// СЛОТЫ с общим состоянием через Casino API
const { getState, setState, checkBankrupt, START_BALANCE } = window.Casino;

const MIN_BET = 10;
const BET_STEP = 10;
const SYMBOLS = [
  { char: '🍒', weight: 40, mult3: 5 },
  { char: '🍋', weight: 30, mult3: 4 },
  { char: '⭐',  weight: 18, mult3: 7 },
  { char: '7️⃣', weight: 9,  mult3: 20 },
  { char: '💎', weight: 3,   mult3: 50 }
];

const els = {
  balance: document.getElementById('balance'),
  betInput: document.getElementById('bet'),
  betDec: document.getElementById('bet-dec'),
  betInc: document.getElementById('bet-inc'),
  maxBet: document.getElementById('max-bet'),
  lastWin: document.getElementById('lastWin'),
  spin: document.getElementById('spin'),
  reset: document.getElementById('reset'),
  reels: [ document.getElementById('reel-1'), document.getElementById('reel-2'), document.getElementById('reel-3') ],
  history: document.getElementById('history')
};

let state = getState();
updateUI();

function save(){ setState(state); updateUI(); }
function fmt(n){ return new Intl.NumberFormat('ru-RU').format(n); }
function clampBet(v){
  v = Math.max(MIN_BET, Math.floor(Number(v) || MIN_BET));
  return Math.min(v, Math.max(MIN_BET, state.balance));
}
function weightedRandomSymbol(){
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of SYMBOLS){ if ((r -= s.weight) <= 0) return s.char; }
  return SYMBOLS[0].char;
}
function payoutFor([a,b,c], bet){
  if (a===b && b===c) return bet * SYMBOLS.find(s=>s.char===a).mult3;
  if (a===b || b===c || a===c) return bet * 1;
  return 0;
}
function pushHistory(item){
  state.history ??= []; state.history.unshift(item); state.history = state.history.slice(0,25);
}
function updateUI(){
  state = getState();
  els.balance.textContent = fmt(state.balance);
  els.lastWin.textContent = fmt(state.history?.[0]?.win ?? 0);
  els.betInput.value = clampBet(els.betInput.value);
  renderHistory();
}
function renderHistory(){
  els.history.textContent = '';
  (state.history||[]).forEach(h=>{
    const li = document.createElement('li');
    const left = document.createElement('div');
    const right = document.createElement('div');
    const badge = document.createElement('span');
    left.textContent = `${h.time} • ${h.result?.join ? 'Слоты' : ''} Ставка: ${fmt(h.bet)} • Результат: ${h.result?.join ? h.result.join(' ') : h.result}`;
    badge.className = 'badge ' + ((h.win??0)>0 ? 'badge--win' : 'badge--loss');
    badge.textContent = ((h.win??0)>0 ? `+${fmt(h.win)}` : `-${fmt(h.bet)}`);
    right.appendChild(badge); li.appendChild(left); li.appendChild(right); els.history.appendChild(li);
  });
}
function nowTime(){ const d=new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`; }

let spinning=false;
async function spinOnce(){
  if (spinning) return;
  let bet = clampBet(els.betInput.value);
  if (bet > state.balance) bet = state.balance;
  if (bet < MIN_BET) return;
  state.balance -= bet; save(); if (checkBankrupt()) return;

  spinning=true; els.spin.disabled=true; els.reels.forEach(r=>r.classList.add('spin'));
  const timers=[];
  els.reels.forEach((reel,i)=>{ timers[i]=setInterval(()=>{ reel.textContent = weightedRandomSymbol(); }, 70); });

  const final=[];
  await new Promise(r=>setTimeout(r,900)); final[0]=weightedRandomSymbol(); clearInterval(timers[0]); els.reels[0].textContent=final[0]; els.reels[0].classList.remove('spin');
  await new Promise(r=>setTimeout(r,250)); final[1]=weightedRandomSymbol(); clearInterval(timers[1]); els.reels[1].textContent=final[1]; els.reels[1].classList.remove('spin');
  await new Promise(r=>setTimeout(r,250)); final[2]=weightedRandomSymbol(); clearInterval(timers[2]); els.reels[2].textContent=final[2]; els.reels[2].classList.remove('spin');

  const win = payoutFor(final, bet);
  state = getState(); state.balance += win; pushHistory({ time: nowTime(), bet, result: final, win }); setState(state); updateUI();
  checkBankrupt();
  spinning=false; els.spin.disabled=false;
}

els.spin.addEventListener('click', spinOnce);
document.addEventListener('keydown', e=>{ if (e.code==='Space'){ e.preventDefault(); spinOnce(); } });
els.betInc.addEventListener('click', ()=>{ els.betInput.value = clampBet(Number(els.betInput.value)+BET_STEP); });
els.betDec.addEventListener('click', ()=>{ els.betInput.value = clampBet(Number(els.betInput.value)-BET_STEP); });
els.betInput.addEventListener('input', ()=>{ els.betInput.value = clampBet(els.betInput.value); });
els.maxBet.addEventListener('click', ()=>{ els.betInput.value = clampBet(state.balance); });
els.reset.addEventListener('click', ()=>{ if(!confirm('Сбросить баланс и историю?'))return;
  setState({ balance: START_BALANCE, history: [] }); updateUI();
});
