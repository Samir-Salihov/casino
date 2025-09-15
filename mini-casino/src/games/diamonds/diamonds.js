// DIAMONDS (сапёр с алмазиками) с общим состоянием через Casino API
const { getState, setState, checkBankrupt, START_BALANCE } = window.Casino;

const MIN_BET = 10;
const BET_STEP = 10;
const SIZE = 8;
const BOMBS = 10;

const els = {
  balance: document.getElementById('dm-balance'),
  status: document.getElementById('dm-status'),
  bet: document.getElementById('dm-bet'),
  betInc: document.getElementById('dm-bet-inc'),
  betDec: document.getElementById('dm-bet-dec'),
  start: document.getElementById('dm-start'),
  flagBtn: document.getElementById('dm-flag'),
  board: document.getElementById('board'),
  grid: document.getElementById('grid'),
  history: document.getElementById('dm-history'),
};

let state = getState();
let round = null; // { bet, cells:[][], revealed, over, armed, flagMode }

updateUI();

function fmt(n){ return new Intl.NumberFormat('ru-RU').format(n); }
function clampBet(v){
  v = Math.max(MIN_BET, Math.floor(Number(v) || MIN_BET));
  return Math.min(v, Math.max(MIN_BET, state.balance));
}
function pushHistory(item){
  state = getState();
  state.history ??= [];
  state.history.unshift(item);
  state.history = state.history.slice(0, 50);
  setState(state);
}
function updateUI(){
  state = getState();
  els.balance.textContent = fmt(state.balance ?? START_BALANCE);
  els.bet.value = clampBet(els.bet.value ?? MIN_BET);
}
function addHistoryRow({ result, bet, delta }){
  const li=document.createElement('li');
  const left=document.createElement('div');
  const right=document.createElement('div');
  const badge=document.createElement('span');
  left.textContent = `${result} • Ставка: ${fmt(bet)}`;
  badge.className='badge ' + (delta>=0?'badge--win':'badge--loss');
  badge.textContent = (delta>=0?`+${fmt(delta)}`:`${fmt(delta)}`);
  right.appendChild(badge); li.appendChild(left); li.appendChild(right);
  els.history.prepend(li);
}
function makeEmptyGrid(){
  const arr=[];
  for(let r=0;r<SIZE;r++){ arr[r]=[]; for(let c=0;c<SIZE;c++){ arr[r][c]={ bomb:false, n:0, revealed:false, flagged:false, el:null }; } }
  return arr;
}
function placeBombs(cells, safeR, safeC){
  let placed=0;
  while(placed<BOMBS){
    const r=Math.floor(Math.random()*SIZE), c=Math.floor(Math.random()*SIZE);
    if ((r===safeR&&c===safeC) || cells[r][c].bomb) continue;
    cells[r][c].bomb=true; placed++;
  }
  const dirs=[-1,0,1];
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      if(cells[r][c].bomb) continue;
      let cnt=0;
      for(const dr of dirs) for(const dc of dirs){
        if(dr===0&&dc===0) continue;
        const rr=r+dr, cc=c+dc;
        if(rr>=0&&rr<SIZE&&cc>=0&&cc<SIZE&&cells[rr][cc].bomb) cnt++;
      }
      cells[r][c].n=cnt;
    }
  }
}
function renderGrid(){
  els.grid.style.gridTemplateColumns = `repeat(${SIZE}, 42px)`;
  els.grid.innerHTML='';
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      const div=document.createElement('div');
      div.className='cell'; div.dataset.r=r; div.dataset.c=c;
      div.oncontextmenu=(e)=>{ e.preventDefault(); toggleFlag(r,c); };
      div.addEventListener('click',()=>onCellClick(r,c));
      els.grid.appendChild(div); round.cells[r][c].el=div;
    }
  }
}
function startRound(){
  if (round && !round.over) return;
  state=getState();
  let bet=clampBet(els.bet.value);
  if (bet>state.balance) bet=state.balance;
  if (bet<MIN_BET) return;
  state.balance -= bet; setState(state); updateUI(); if (checkBankrupt()) return;

  round = { bet, cells: makeEmptyGrid(), revealed:0, over:false, armed:false, flagMode:false };
  els.flagBtn.textContent='Флажок: выкл';
  els.board.hidden=false; els.grid.innerHTML=''; renderGrid();
  setStatus('Откройте любую клетку (первый клик безопасен).');
}
function setStatus(t){ els.status.textContent=t; }
function toggleFlag(r,c){
  if(!round||round.over) return;
  const cell=round.cells[r][c];
  if(cell.revealed) return;
  cell.flagged=!cell.flagged;
  cell.el.classList.toggle('flagged', cell.flagged);
  cell.el.textContent = cell.flagged ? '⚑' : '';
}
function revealCell(r,c){
  const cell=round.cells[r][c];
  if(cell.revealed||cell.flagged) return;
  cell.revealed=true; cell.el.classList.add('revealed');
  if(cell.bomb){ cell.el.classList.add('bomb'); cell.el.textContent='💣'; }
  else { cell.el.classList.add('safe'); cell.el.textContent=(cell.n===0?'💎':String(cell.n)); }
}
function floodReveal(r,c){
  const stack=[[r,c]]; const dirs=[-1,0,1];
  while(stack.length){
    const [rr,cc]=stack.pop();
    const cell=round.cells[rr][cc];
    if(cell.revealed||cell.flagged) continue;
    revealCell(rr,cc); round.revealed++;
    if(!cell.bomb && cell.n===0){
      for(const dr of dirs) for(const dc of dirs){
        if(dr===0&&dc===0) continue;
        const nr=rr+dr, nc=cc+dc;
        if(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE){
          const ncell=round.cells[nr][nc];
          if(!ncell.revealed && !ncell.flagged && !ncell.bomb) stack.push([nr,nc]);
        }
      }
    }
  }
}
function onCellClick(r,c){
  if(!round||round.over) return;
  if(!round.armed){ placeBombs(round.cells,r,c); round.armed=true; }
  if(round.flagMode){ toggleFlag(r,c); return; }
  const cell=round.cells[r][c];
  if(cell.flagged||cell.revealed) return;
  if(cell.bomb){ revealCell(r,c); revealAll(); finish(false); }
  else{
    floodReveal(r,c);
    const safeTotal=SIZE*SIZE - BOMBS;
    if(round.revealed>=safeTotal){ revealAll(); finish(true);}
    else setStatus('Аккуратно продолжай. Помечай подозрительные клетки флажком.');
  }
}
function revealAll(){
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      const cell=round.cells[r][c];
      if(!cell.revealed){
        if(cell.bomb){ cell.el.textContent='💣'; cell.el.classList.add('bomb'); }
        else { cell.el.textContent=(cell.n===0?'💎':String(cell.n)); cell.el.classList.add('safe'); }
        cell.revealed=true; cell.el.classList.add('revealed');
      }
    }
  }
  round.over=true;
}
function finish(win){
  const bet=round.bet;
  const payout = win ? bet*3 : 0;
  const net = payout - bet;

  state=getState(); state.balance += payout;
  pushHistory({ time:new Date().toLocaleTimeString(), bet, result:'Diamonds: ' + (win?'Победа':'Поражение'), win: Math.max(0, net) });
  setState(state); updateUI();
  addHistoryRow({ result: win ? 'Победа ×3' : 'Поражение', bet, delta: net });
  setStatus(win ? 'Победа! Выплата ×3. Нажмите «Старт» для нового раунда.' : 'Бомба! Раунд проигран.');
  checkBankrupt();
}
function addHistoryRow({ result, bet, delta }){
  const li=document.createElement('li');
  const left=document.createElement('div');
  const right=document.createElement('div');
  const badge=document.createElement('span');
  left.textContent=`${result} • Ставка: ${fmt(bet)}`;
  badge.className='badge '+(delta>=0?'badge--win':'badge--loss');
  badge.textContent=(delta>=0?`+${fmt(delta)}`:`${fmt(delta)}`);
  right.appendChild(badge); li.appendChild(left); li.appendChild(right); els.history.prepend(li);
}
function toggleFlagMode(){
  if(!round||round.over){ round = round || {}; }
  round.flagMode = !round.flagMode;
  els.flagBtn.textContent = 'Флажок: ' + (round.flagMode ? 'вкл' : 'выкл');
}

els.start.addEventListener('click', startRound);
els.flagBtn.addEventListener('click', toggleFlagMode);
els.bet.addEventListener('input', ()=>{ els.bet.value = clampBet(els.bet.value); });
els.betInc.addEventListener('click', ()=>{ els.bet.value = clampBet(Number(els.bet.value)+BET_STEP); });
els.betDec.addEventListener('click', ()=>{ els.bet.value = clampBet(Number(els.bet.value)-BET_STEP); });
