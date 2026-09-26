/* Site-wide chrome: dark-mode toggle, slide-in menu, custom scrollbar. */
(() => {
    'use strict';

    const doc = document.documentElement;
    const body = document.body;

    // Dark mode. The initial theme is applied by the inline script in <head>.
    document.querySelector('.theme-toggle').addEventListener('click', () => {
        const next = doc.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        doc.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked: not persisted */ }
    });

    // Menu
    const openBtn = document.querySelector('.menu-toggle');
    const menu = document.getElementById('site-menu');
    const setMenu = (open) => {
        body.classList.toggle('menu-open', open);
        openBtn.setAttribute('aria-expanded', String(open));
        if (open) menu.querySelector('a').focus();
        else openBtn.focus();
    };
    openBtn.addEventListener('click', () => setMenu(true));
    document.querySelector('.menu-close').addEventListener('click', () => setMenu(false));
    document.querySelector('.menu-scrim').addEventListener('click', () => setMenu(false));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && body.classList.contains('menu-open')) setMenu(false);
    });

    // Custom scrollbar (the native one is hidden in site.css).
    const bar = document.querySelector('.scrollbar');
    const thumb = bar.querySelector('.scrollbar-thumb');
    let dragging = false;
    let grabOffset = 0;

    const metrics = () => {
        const max = doc.scrollHeight - window.innerHeight;
        const track = bar.clientHeight;
        const size = Math.max(28, track * (window.innerHeight / doc.scrollHeight));
        return { max, track, size };
    };

    const paint = () => {
        bar.hidden = doc.scrollHeight - window.innerHeight <= 0;
        if (bar.hidden) return;
        const { max, track, size } = metrics();
        thumb.style.height = `${size}px`;
        thumb.style.transform = `translateY(${(window.scrollY / max) * (track - size)}px)`;
    };

    thumb.addEventListener('pointerdown', (e) => {
        dragging = true;
        grabOffset = e.clientY - thumb.getBoundingClientRect().top;
        bar.classList.add('dragging');
        thumb.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    thumb.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const { max, track, size } = metrics();
        const y = e.clientY - bar.getBoundingClientRect().top - grabOffset;
        const ratio = Math.min(1, Math.max(0, y / (track - size)));
        window.scrollTo({ top: ratio * max, behavior: 'instant' });
    });
    const stopDrag = () => { dragging = false; bar.classList.remove('dragging'); };
    thumb.addEventListener('pointerup', stopDrag);
    thumb.addEventListener('pointercancel', stopDrag);

    // At most one paint per frame: several scroll events can land in one frame,
    // and each paint reads layout right after the previous one wrote it.
    let queued = false;
    const schedulePaint = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; paint(); });
    };
    window.addEventListener('scroll', schedulePaint, { passive: true });
    window.addEventListener('resize', schedulePaint);
    new ResizeObserver(schedulePaint).observe(body);
    paint();
})();
