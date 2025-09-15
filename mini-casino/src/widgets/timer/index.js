// Таймер / Секундомер с SVG-кольцом, laps и плавным ходом
(() => {
  const $ = (q, r=document) => r.querySelector(q);
  const els = {
    tabs: document.querySelectorAll('.timer-tabs .tab'),
    digits: $('#tw-digits'),
    ms: $('#tw-millis'),
    ring: document.querySelector('.ring-fg'),
    inputs: $('#tw-inputs'),
    min: $('#tw-min'),
    sec: $('#tw-sec'),
    set1: $('#tw-set-1'),
    set5: $('#tw-set-5'),
    start: $('#tw-start'),
    pause: $('#tw-pause'),
    reset: $('#tw-reset'),
    lap: $('#tw-lap'),
    laps: $('#tw-laps'),
    lapsBody: $('#tw-laps-body'),
    lapsClear: $('#tw-clear-laps'),
  };

  // Если на странице нет блока таймера — тихо выходим (страница может быть не slots.html)
  if (!els.digits) return;

  const CIRC = 2 * Math.PI * 54;
  let mode = 'timer'; // 'timer' | 'stopwatch'
  let running = false;
  let baseNow = 0;     // performance.now() в момент старта
  let baseTime = 0;    // накопленное (мс) при паузах
  let target = 30_000; // длительность таймера (мс)
  let raf = 0;

  let laps = [];
  let lastSplit = 0;

  const clamp = (v, min, max)=> Math.max(min, Math.min(max, v));
  const pad2 = (n)=> n.toString().padStart(2,'0');
  function fmt(ms){
    ms = Math.max(0, ms|0);
    const sec = Math.floor(ms/1000);
    const m = Math.floor(sec/60);
    const s = sec % 60;
    const tenth = Math.floor((ms % 1000)/100);
    return { m, s, tenth };
  }
  function renderDisplay(ms){
    const {m,s,tenth} = fmt(ms);
    els.digits.textContent = `${pad2(m)}:${pad2(s)}`;
    els.ms.textContent = `.${tenth}`;
  }
  function setRingProgress(frac){
    const offset = CIRC * (1 - clamp(frac, 0, 1));
    els.ring.style.strokeDashoffset = String(offset);
  }

  function switchMode(next){
    if (mode === next) return;
    mode = next;

    document.querySelectorAll('.timer-tabs .tab').forEach(btn=>{
      const is = btn.dataset.mode === mode;
      btn.classList.toggle('is-active', is);
      btn.setAttribute('aria-selected', String(is));
    });

    stop();
    baseTime = 0;
    lastSplit = 0;
    laps = [];
    renderLaps();

    if (mode === 'timer'){
      els.inputs.hidden = false;
      els.lap.disabled = true;
      els.laps.hidden = true;
      applyInputsToTarget();
      setRingProgress(0);
      renderDisplay(target);
    } else {
      els.inputs.hidden = true;
      els.lap.disabled = false;
      els.laps.hidden = false;
      setRingProgress(1);
      renderDisplay(0);
    }
    updateButtons();
  }

  function start(){
    if (running) return;
    running = true;
    baseNow = performance.now();
    if (mode==='timer' && target<=0){ applyInputsToTarget(); }
    tick();
    updateButtons();
  }
  function pause(){
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    const now = performance.now();
    const dt = now - baseNow;
    baseTime += dt;
    updateButtons();
  }
  function stop(){
    running = false;
    cancelAnimationFrame(raf);
    baseNow = 0;
  }
  function reset(){
    stop();
    baseTime = 0;
    lastSplit = 0;
    laps = [];
    renderLaps();

    if (mode==='timer'){
      applyInputsToTarget();
      renderDisplay(target);
      setRingProgress(0);
    } else {
      renderDisplay(0);
      setRingProgress(1);
    }
    updateButtons();
  }

  function applyInputsToTarget(){
    const m = clamp(parseInt(els.min.value||'0',10), 0, 999);
    const s = clamp(parseInt(els.sec.value||'0',10), 0, 59);
    target = (m*60 + s) * 1000;
  }
  function totalElapsed(){
    if (!running) return baseTime;
    return baseTime + (performance.now() - baseNow);
  }

  function tick(){
    if (!running) return;
    const t = totalElapsed();

    if (mode==='timer'){
      const left = Math.max(0, target - t);
      renderDisplay(left);
      setRingProgress(Math.min(1, t / Math.max(1, target)));
      if (left <= 0){
        pause();
        els.ring.style.filter = 'drop-shadow(0 0 16px rgba(255,0,0,.45))';
        setTimeout(()=> els.ring.style.filter = 'drop-shadow(0 4px 10px rgba(255,211,110,.35))', 600);
        updateButtons();
        return;
      }
    } else {
      renderDisplay(t);
    }
    raf = requestAnimationFrame(tick);
  }

  function addLap(){
    if (mode!=='stopwatch') return;
    const t = totalElapsed();
    const lapTime = t - lastSplit;
    lastSplit = t;
    laps.unshift({ idx: laps.length+1, lapTime, total: t });
    renderLaps();
  }
  function timeToStr(ms){
    const {m,s,tenth} = fmt(ms);
    return `${pad2(m)}:${pad2(s)}.${tenth}`;
  }
  function renderLaps(){
    els.lapsBody.innerHTML = '';
    laps.forEach((L, i) => {
      const row = document.createElement('div');
      row.className = 'laps-row';
      row.innerHTML = `<span>${laps.length - i}</span><span>${timeToStr(L.lapTime)}</span><span>${timeToStr(L.total)}</span>`;
      els.lapsBody.appendChild(row);
    });
    els.lapsClear.disabled = laps.length===0;
  }

  function updateButtons(){
    els.start.disabled = running;
    els.pause.disabled = !running;
    els.reset.disabled = running ? false : (mode==='timer'? target===0 && baseTime===0 : baseTime===0);
    els.lap.disabled = (mode!=='stopwatch') || !running;
  }

  // события
  els.tabs.forEach(btn => btn.addEventListener('click', ()=> switchMode(btn.dataset.mode)));
  els.set1.addEventListener('click', ()=> { els.min.value=1; els.sec.value=0; applyInputsToTarget(); renderDisplay(target); setRingProgress(0); });
  els.set5.addEventListener('click', ()=> { els.min.value=5; els.sec.value=0; applyInputsToTarget(); renderDisplay(target); setRingProgress(0); });
  els.min.addEventListener('change', ()=>{ applyInputsToTarget(); renderDisplay(target); setRingProgress(0); });
  els.sec.addEventListener('change', ()=>{ applyInputsToTarget(); renderDisplay(target); setRingProgress(0); });
  els.start.addEventListener('click', start);
  els.pause.addEventListener('click', pause);
  els.reset.addEventListener('click', reset);
  els.lap.addEventListener('click', addLap);
  els.lapsClear.addEventListener('click', ()=>{ laps=[]; lastSplit=totalElapsed(); renderLaps(); });

  // хоткеи: Space старт/пауза, R — сброс, L — круг
  document.addEventListener('keydown', (e)=>{
    // не мешаем полям ввода таймера
    if (e.target && ['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
    if (e.code==='Space'){ e.preventDefault(); running? pause() : start(); }
    if (e.key.toLowerCase()==='r'){ reset(); }
    if (e.key.toLowerCase()==='l'){ addLap(); }
  });

  // init
  els.ring.style.strokeDasharray = String(CIRC);
  switchMode('timer'); // стартуем с таймера
})();
