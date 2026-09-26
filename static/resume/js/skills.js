/* Core capabilities cylinder — vanilla port of Skills.jsx from
 * DineshS36/portfolio (Apache-2.0, commit 35c3989): continuous ~20°/s
 * rotation, pause on hover, drag/swipe, shift/horizontal wheel, click a card
 * to bring it to the front. Depth drives scale, blur, opacity and stacking. */
(() => {
    'use strict';

    const viewport = document.querySelector('[data-skills]');
    if (!viewport) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = [...viewport.querySelectorAll('.skill-orbital-card')];
    const total = cards.length;
    const angleStep = 360 / total;

    let angle = 0;
    let paused = false;
    let dragging = false;
    let startX = 0;
    let startAngle = 0;
    let activeIndex = -1;

    const layout = () => {
        let closest = 0;
        let minDiff = 360;
        cards.forEach((card, i) => {
            let diff = ((i * angleStep - angle) % 360 + 360) % 360;   // 0..360 from the front
            if (diff > 180) diff -= 360;                             // -180..180
            const rad = (diff * Math.PI) / 180;
            const sin = Math.sin(rad);
            const cos = Math.cos(rad);
            const depth = (cos + 1) / 2;                             // 1 = front, 0 = back
            const scale = 0.64 + depth * 0.41;
            let blur = 0;
            let opacity = 1;
            if (depth < 0.5) {
                const back = (0.5 - depth) / 0.5;
                blur = back * 4;
                opacity = 1 - back * 0.65;
            }
            const style = card.style;
            style.setProperty('--card-sin', sin);
            style.setProperty('--card-cos', cos);
            style.setProperty('--card-rotate-y', `${-diff * 0.85}deg`);
            style.setProperty('--depth-scale', scale);
            style.setProperty('--depth-opacity', opacity);
            style.setProperty('--depth-blur', blur > 0 ? `blur(${blur.toFixed(1)}px)` : 'none');
            style.zIndex = String(Math.round(depth * 100));
            if (Math.abs(diff) < minDiff) { minDiff = Math.abs(diff); closest = i; }
        });
        if (closest !== activeIndex) {
            activeIndex = closest;
            cards.forEach((c, i) => c.classList.toggle('active-front', i === closest));
        }
    };

    let last = performance.now();
    const loop = (now) => {
        const delta = (now - last) / 1000;
        last = now;
        if (!paused && !dragging && !reduceMotion && !document.hidden) {
            angle = (angle + delta * 20) % 360;
        }
        layout();
        requestAnimationFrame(loop);
    };
    layout();
    requestAnimationFrame(loop);

    cards.forEach((card, i) => {
        card.addEventListener('click', () => { angle = i * angleStep; layout(); });
        card.addEventListener('mouseenter', () => { paused = true; });
        card.addEventListener('mouseleave', () => { paused = false; });
    });

    viewport.addEventListener('pointerdown', (e) => {
        dragging = true;
        startX = e.clientX;
        startAngle = angle;
    });
    viewport.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        angle = (startAngle - (e.clientX - startX) * 0.32 + 3600) % 360;
    });
    const stopDrag = () => { dragging = false; };
    viewport.addEventListener('pointerup', stopDrag);
    viewport.addEventListener('pointercancel', stopDrag);
    viewport.addEventListener('pointerleave', stopDrag);

    viewport.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
            e.preventDefault();
            const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
            angle = (angle + delta * 0.2 + 3600) % 360;
        }
    }, { passive: false });
})();
