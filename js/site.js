/* Runs on every page: theme toggle. */
const root = document.documentElement;
document.getElementById('theme')?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch {}
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  try { if (localStorage.getItem('theme')) return; } catch {}
  root.dataset.theme = e.matches ? 'dark' : 'light';
});
