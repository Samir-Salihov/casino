// BLACKJACK с общим состоянием через Casino API
const { getState, setState, checkBankrupt } = window.Casino;

const MIN_BET = 10;
const BET_STEP = 10;
const SUITS = ['♠','♥','♦','♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

const els = {
  balance: document.getElementById('bj-balance'),
  status: document.getElementById('bj-status'),
  bet: document.getElementById('bj-bet'),
  betInc: document.getElementById('bj-bet-inc'),
  betDec: document.getElementById('bj-bet-dec'),
  deal: document.getElementById('bj-deal'),
  hit: document.getElementById('bj-hit'),
  stand: document.getElementById('bj-stand'),
  reset: document.getElementById('bj-reset'),
  dealerCards: document.getElementById('dealer-cards'),
  playerCards: document.getElementById('player-cards'),
  dealerScore: document.getElementById('dealer-score'),
  playerScore: document.getElementById('player-score'),
  history: document.getElementById('bj-history'),
};

let state = getState();
let round = null; // { deck, bet, player, dealer, over, canAct }

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
  renderHands();
}
function makeDeck(){
  const d=[];
  for (const s of SUITS) for (const r of RANKS) d.push({ r, s });
  for (let i=d.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
function valueOfCard(r){ if(r==='A')return 11; if(['J','Q','K'].includes(r))return 10; return Number(r); }
function scoreHand(cards){
  let total=0, aces=0;
  for (const c of cards){ total+=valueOfCard(c.r); if(c.r==='A') aces++; }
  while (total>21 && aces>0){ total-=10; aces--; }
  const soft = cards.some(c=>c.r==='A') && total<=21;
  return { total, soft };
}
function renderCard(c, hidden=false){
  const div=document.createElement('div');
  if(hidden){ div.className='playing-card playing-card--back'; return div; }
  const isRed = (c.s==='♥'||c.s==='♦');
  div.className = 'playing-card' + (isRed ? ' playing-card--red' : '');
  div.innerHTML = `<span class="playing-card__rank">${c.r}</span><span class="playing-card__suit">${c.s}</span>`;
  return div;
}
function renderHands(){
  els.dealerCards.textContent=''; els.playerCards.textContent='';
  if(!round){ els.dealerScore.textContent='Очки: —'; els.playerScore.textContent='Очки: —'; return; }

  round.dealer.forEach((c,i)=>{
    const el = (i===0 && !round.over) ? renderCard(c,true) : renderCard(c);
    els.dealerCards.appendChild(el);
  });
  round.player.forEach(c=>els.playerCards.appendChild(renderCard(c)));

  els.dealerScore.textContent = `Очки: ${round.over ? scoreHand(round.dealer).total : '—'}`;
  els.playerScore.textContent = `Очки: ${round.player.length ? scoreHand(round.player).total : '—'}`;

  els.hit.disabled = !round || round.over || !round.canAct;
  els.stand.disabled = !round || round.over || !round.canAct;
  els.deal.disabled = round && !round.over;
  els.bet.disabled = round && !round.over;
  els.betInc.disabled = els.betDec.disabled = round && !round.over;
}
function setStatus(t){ els.status.textContent = t; }
function addHistoryRow({ result, bet, delta, player, dealer }){
  const li=document.createElement('li');
  const left=document.createElement('div');
  const right=document.createElement('div');
  const badge=document.createElement('span');
  left.textContent = `${result} • Ставка: ${fmt(bet)} • Игрок: ${handStr(player)} • Дилер: ${handStr(dealer)}`;
  badge.className='badge ' + (delta>=0?'badge--win':'badge--loss');
  badge.textContent = (delta>=0?`+${fmt(delta)}`:`${fmt(delta)}`);
  right.appendChild(badge); li.appendChild(left); li.appendChild(right);
  els.history.prepend(li);
}
function handStr(h){ return h.map(c=>`${c.r}${c.s}`).join(' '); }

function startRound(){
  if (round && !round.over) return;
  let bet = clampBet(els.bet.value);
  if (bet > state.balance) bet = state.balance;
  if (bet < MIN_BET) return;

  state = getState(); state.balance -= bet; setState(state); updateUI(); if (checkBankrupt()) return;

  round = { deck: makeDeck(), bet, player: [], dealer: [], over:false, canAct:true };

  round.player.push(round.deck.pop());
  round.dealer.push(round.deck.pop());
  round.player.push(round.deck.pop());
  round.dealer.push(round.deck.pop());

  setStatus('Ваш ход: «Ещё» или «Хватит».');
  updateUI();

  const ps = scoreHand(round.player).total;
  const ds = scoreHand(round.dealer).total;
  const playerBJ = (ps===21 && round.player.length===2);
  const dealerBJ = (ds===21 && round.dealer.length===2);
  if (playerBJ || dealerBJ) finishRound();
}
function playerHit(){
  if (!round || round.over || !round.canAct) return;
  round.player.push(round.deck.pop());
  const ps = scoreHand(round.player).total;
  if (ps > 21) finishRound(); else updateUI();
}
function playerStand(){
  if (!round || round.over || !round.canAct) return;
  round.canAct=false; dealerPlay();
}
function dealerPlay(){
  while (true){
    const ds=scoreHand(round.dealer);
    if (ds.total < 17 || (ds.total===17 && ds.soft)) round.dealer.push(round.deck.pop());
    else break;
  }
  finishRound();
}
function finishRound(){
  round.over=true; round.canAct=false;
  const ps=scoreHand(round.player).total, ds=scoreHand(round.dealer).total;
  const playerBJ=(ps===21 && round.player.length===2);
  const dealerBJ=(ds===21 && round.dealer.length===2);

  let result='', payout=0;

  if (playerBJ && dealerBJ){ result='Пуш: оба Blackjack'; payout=round.bet; }
  else if (playerBJ){ result='Blackjack! Победа'; payout=Math.floor(round.bet*2.5); }
  else if (dealerBJ){ result='Поражение: у дилера Blackjack'; payout=0; }
  else {
    const playerBust=ps>21, dealerBust=ds>21;
    if (playerBust && dealerBust){ result='Пуш: оба перебор 🤯'; payout=round.bet; }
    else if (playerBust){ result='Перебор. Поражение'; payout=0; }
    else if (dealerBust){ result='Дилер перебрал. Победа'; payout=round.bet*2; }
    else if (ps>ds){ result='Победа'; payout=round.bet*2; }
    else if (ps<ds){ result='Поражение'; payout=0; }
    else { result='Пуш (ничья)'; payout=round.bet; }
  }

  const net = payout - round.bet;
  state = getState(); state.balance += payout;
  pushHistory({ time:new Date().toLocaleTimeString(), bet: round.bet, result:`BJ: ${result}`, win: Math.max(0, net) });
  setState(state);

  addHistoryRow({ result, bet: round.bet, delta: net, player: round.player, dealer: round.dealer });

  setStatus(result + ' • Нажмите «Раздать» для нового раунда.');
  updateUI(); checkBankrupt();
}

function resetProgress(){
  if (!confirm('Сбросить баланс и историю?')) return;
  setState({ balance: window.Casino.START_BALANCE, history: [] });
  round=null; updateUI();
}

els.deal.addEventListener('click', startRound);
els.hit.addEventListener('click', playerHit);
els.stand.addEventListener('click', playerStand);
els.reset.addEventListener('click', resetProgress);
document.addEventListener('keydown', (e)=>{ if(e.code==='Space'){ e.preventDefault(); if(!round||round.over) startRound(); } });
els.bet.addEventListener('input', ()=>{ els.bet.value = clampBet(els.bet.value); });
els.betInc.addEventListener('click', ()=>{ els.bet.value = clampBet(Number(els.bet.value)+BET_STEP); });
els.betDec.addEventListener('click', ()=>{ els.bet.value = clampBet(Number(els.bet.value)-BET_STEP); });

updateUI();
setStatus('Сделайте ставку и начните раунд');
