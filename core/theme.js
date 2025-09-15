// Переключение темы: сохраняем выбор и обновляем иконку
(() => {
  const STORAGE_KEY = 'mini-theme';
  const root = document.documentElement;
  const btn = document.getElementById('theme-toggle');

  function apply(theme){
    root.setAttribute('data-theme', theme);
    try{ localStorage.setItem(STORAGE_KEY, theme); }catch{}
  }
  function current(){
    try{
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    }catch{}
    // системное предпочтение
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  // init
  apply(current());

  if (btn){
    btn.addEventListener('click', () => {
      const next = (root.getAttribute('data-theme') === 'light') ? 'dark' : 'light';
      apply(next);
      // микроанимация кнопки
      btn.animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}], {duration:260, easing:'cubic-bezier(.22,.61,.36,1)'});
    });
  }
})();
