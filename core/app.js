// Гладкие переходы + глобальная проверка банкротства и модал "Ты проиграл! Ты лох."
(() => {
  const ANIM_MS = 450;
  const STORAGE_KEY = 'mini-casino-v1';
  const START_BALANCE = 1000;

  // ===== Занавес переходов
  const veil = document.createElement('div');
  veil.className = 'route-veil';
  document.documentElement.appendChild(veil);

  window.addEventListener('pageshow', () => {
    document.body.classList.add('route-enter');
    veil.classList.add('route-veil--enter');
    setTimeout(() => {
      document.body.classList.remove('route-enter');
      veil.classList.remove('route-veil--enter');
    }, ANIM_MS);
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.hash) return;
    if (a.target && a.target !== '_self') return;

    e.preventDefault();
    document.body.classList.add('route-exit');
    veil.classList.add('route-veil--exit');
    setTimeout(() => { window.location.href = a.href; }, ANIM_MS);
  });

  // ===== Модал банкротства
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal__backdrop"></div>
    <div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title" class="modal__title">Ты проиграл! Ты лох.</h2>
      <p class="modal__text">Баланс исчерпан. Начни заново и попробуй взять реванш.</p>
      <div class="modal__actions">
        <button class="btn btn--primary" id="modal-restart">Начать заново</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const restartBtn = modal.querySelector('#modal-restart');
  restartBtn.addEventListener('click', () => {
    const state = { balance: START_BALANCE, history: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    hideModal();
    location.reload();
  });
  function showModal(){ modal.classList.add('is-open'); }
  function hideModal(){ modal.classList.remove('is-open'); }

  // ===== Общий API для игр
  function getState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { balance: START_BALANCE, history: [] };
    }catch{
      return { balance: START_BALANCE, history: [] };
    }
  }
  function setState(s){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }
  function checkBankrupt(){
    const s = getState();
    if (!s || !Number.isFinite(s.balance) || s.balance <= 0){
      showModal();
      return true;
    }
    return false;
  }

  window.Casino = { getState, setState, checkBankrupt, START_BALANCE, STORAGE_KEY };
})();
