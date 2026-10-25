/* Article extras: copy buttons on code, scroll progress fallback. */
document.querySelectorAll('.prose pre').forEach(pre => {
  const wrap = document.createElement('div');
  wrap.className = 'code-block';
  pre.replaceWith(wrap);
  wrap.append(pre);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy';
  btn.textContent = 'Copy';
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pre.innerText); btn.textContent = 'Copied'; }
    catch { btn.textContent = 'Copy failed'; }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
  });
  wrap.append(btn);
});

const bar = document.querySelector('.progress');
if (bar && !CSS.supports('animation-timeline: scroll()')) {
  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}
