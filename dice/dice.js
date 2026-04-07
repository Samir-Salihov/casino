// DICE (кости) с общим состоянием через Casino API
const { getState, setState, checkBankrupt, START_BALANCE } = window.Casino;

const MIN_BET = 10;
const BET_STEP = 10;

const els = {
  balance: document.getElementById('d-balance'),
  status: document.getElementById('d-status'),
  bet: document.getElementById('d-bet'),
  betInc: document.getElementById('d-bet-inc'),
  betDec: document.getElementById('d-bet-dec'),
  roll: document.getElementById('d-roll'),
  risk: document.getElementById('d-double'),
  reset: document.getElementById('d-reset'),
  p1: document.getElementById('p1'),
  p2: document.getElementById('p2'),
  d1: document.getElementById('d1'),
  d2: document.getElementById('d2'),
  pScore: document.getElementById('p-score'),
  dScore: document.getElementById('d-score'),
  history: document.getElementById('d-history'),
};

let state = getState();
let lastWin = 0;

function fmt(n){ return new Intl.NumberFormat('ru-RU').format(n); }
function clampBet(v){
  v = Math.max(MIN_BET, Math.floor(Number(v) || MIN_BET));
  return Math.min(v, Math.max(MIN_BET, state.balance));
}
function pushHistory(item){
  state = getState();
  state.history ??= [];
  state.history.unshift(item);
  state.history = state.history.slice(0, 40);
  setState(state);
}
function updateUI(){
  state = getState();
  els.balance.textContent = fmt(state.balance);
  els.bet.value = clampBet(els.bet.value);
}
function rollDie(){ return 1 + Math.floor(Math.random()*6); }
function showDice(el, val){
  el.textContent = val;
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
}
function setStatus(t){ els.status.textContent = t; }
function setScores(p, d){
  els.pScore.textContent = `Сумма: ${p ?? '—'}`;
  els.dScore.textContent = `Сумма: ${d ?? '—'}`;
}
function addHistoryRow({ result, bet, delta, playerSum, dealerSum }){
  const li=document.createElement('li');
  const left=document.createElement('div');
  const right=document.createElement('div');
  const badge=document.createElement('span');
  left.textContent = `${result} • Ставка: ${fmt(bet)} • Игрок: ${playerSum} • Дилер: ${dealerSum}`;
  badge.className='badge ' + (delta>=0?'badge--win':'badge--loss');
  badge.textContent = (delta>=0?`+${fmt(delta)}`:`${fmt(delta)}`);
  right.appendChild(badge); li.appendChild(left); li.appendChild(right);
  els.history.prepend(li);
}

function doRoll(isRisk=false){
  state = getState();
  let bet = clampBet(els.bet.value);
  if (!isRisk){
    if (bet > state.balance) bet = state.balance;
    if (bet < MIN_BET) return;
    state.balance -= bet; setState(state); updateUI(); if (checkBankrupt()) return;
  }else{
    bet = lastWin; if (bet <= 0) return;
  }

  const pA=rollDie(), pB=rollDie(), dA=rollDie(), dB=rollDie();
  showDice(els.p1, pA); showDice(els.p2, pB);
  showDice(els.d1, dA); showDice(els.d2, dB);
  const pSum=pA+pB, dSum=dA+dB; setScores(pSum, dSum);

  let payout=0, title='—';
  const playerDoubleSix = (pA===6 && pB===6);

  if (isRisk){
    if (pSum>dSum){ payout = bet*2; title='Риск-выигрыш ×2'; }
    else if (pSum<dSum){ payout=0; title='Риск-пролёт'; }
    else { payout=bet; title='Риск-пуш'; }
    const net = payout - bet;
    state = getState(); state.balance += payout;
    pushHistory({ time:new Date().toLocaleTimeString(), bet, result:'Dice: '+title, win: Math.max(0, net) });
    setState(state); updateUI(); els.risk.disabled=true; setStatus(title+' • Бросайте снова.'); checkBankrupt(); return;
  }

  if (playerDoubleSix){ payout=bet*3; title='Двойные шестёрки! ×3'; }
  else if (pSum>dSum){ payout=bet*2; title='Победа'; }
  else if (pSum<dSum){ payout=0; title='Поражение'; }
  else { payout=bet; title='Пуш (ничья)'; }

  const net = payout - bet;
  state = getState(); state.balance += payout;
  lastWin = Math.max(0, net);
  addHistoryRow({ result:title, bet, delta: net, playerSum:pSum, dealerSum:dSum });
  pushHistory({ time:new Date().toLocaleTimeString(), bet, result:'Dice: '+title, win: Math.max(0, net) });
  setState(state); updateUI(); els.risk.disabled = !(net>0); setStatus(title + (net>0?' • Можете рискнуть ×2.':' • Бросайте снова.')); checkBankrupt();
}

function resetProgress(){
  if (!confirm('Сбросить баланс и историю?')) return;
  setState({ balance: START_BALANCE, history: [] });
  lastWin=0; updateUI(); setStatus('Прогресс сброшен. Бросайте кости.');
  showDice(els.p1,'—'); showDice(els.p2,'—'); showDice(els.d1,'—'); showDice(els.d2,'—'); setScores('—','—');
}

els.roll.addEventListener('click', ()=>doRoll(false));
els.risk.addEventListener('click', ()=>doRoll(true));
els.reset.addEventListener('click', resetProgress);
document.addEventListener('keydown', (e)=>{ if(e.code==='Space'){ e.preventDefault(); doRoll(false); }});
els.bet.addEventListener('input', ()=>{ els.bet.value = clampBet(els.bet.value); });
els.betInc.addEventListener('click', ()=>{ els.bet.value = clampBet(Number(els.bet.value)+BET_STEP); });
els.betDec.addEventListener('click', ()=>{ els.bet.value = clampBet(Number(els.bet.value)-BET_STEP); });

updateUI();
setStatus('Сделайте ставку и бросайте кости');
