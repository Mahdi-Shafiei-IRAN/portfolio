/* Engineering journey — vanilla port of Timeline.jsx from DineshS36/portfolio
 * (Apache-2.0, commit 35c3989): auto-advancing stage carousel (pauses on hover),
 * arrows, jump pills and ←/→ keys. The four canvases are drawn in the upstream
 * TimelineVisualizers style, with content rewritten for Mahdi's stages. */
(() => {
    'use strict';

    const root = document.querySelector('[data-timeline]');
    if (!root) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const track = root.querySelector('.timeline-cards-track');
    const slides = [...root.querySelectorAll('.timeline-card-slide')];
    const pills = [...root.querySelectorAll('[data-jump]')];
    const metaText = root.querySelector('.meta-pill-text');
    const pulse = root.querySelector('.meta-pulse-dot');
    const stageWrapper = root.querySelector('.timeline-stage-wrapper');
    const total = slides.length;
    const pad = (n) => String(n).padStart(2, '0');

    let active = 0;
    let paused = false;

    const render = () => {
        track.style.transform = `translateX(-${active * 100}%)`;
        slides.forEach((s, i) => s.classList.toggle('is-active', i === active));
        pills.forEach((p, i) => p.classList.toggle('is-active', i === active));
        metaText.textContent = `STAGE ${pad(active + 1)}/${pad(total)} • ${paused ? 'INTERACTIVE' : 'AUTO-RUNNING'}`;
        pulse.classList.toggle('is-paused', paused);
    };
    const go = (i) => { active = (i + total) % total; render(); };

    root.querySelector('[data-stage-next]').addEventListener('click', () => go(active + 1));
    root.querySelector('[data-stage-prev]').addEventListener('click', () => go(active - 1));
    pills.forEach((p) => p.addEventListener('click', () => go(Number(p.dataset.jump))));
    stageWrapper.addEventListener('mouseenter', () => { paused = true; render(); });
    stageWrapper.addEventListener('mouseleave', () => { paused = false; render(); });
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (document.querySelector('.project-modal-overlay')) return;
        if (e.key === 'ArrowRight') go(active + 1);
        else if (e.key === 'ArrowLeft') go(active - 1);
    });
    if (!reduceMotion) {
        setInterval(() => { if (!paused && !document.hidden) go(active + 1); }, 4500);
    }
    render();

    // ------------------------------------------------------ canvas helpers
    const MONO = '"Space Mono", monospace';

    const headerBar = (ctx, width, left, mid, right, midColor, rightColor) => {
        const y = 16;
        ctx.fillStyle = 'rgba(16, 16, 24, 0.85)';
        ctx.fillRect(16, y, width - 32, 28);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.strokeRect(16, y, width - 32, 28);
        ctx.font = `9px ${MONO}`;
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(left, 28, y + 18);
        if (mid) {
            ctx.fillStyle = midColor;
            ctx.fillText(mid, Math.min(185, width * 0.45), y + 18);
        }
        ctx.textAlign = 'right';
        ctx.fillStyle = rightColor;
        ctx.fillText(right, width - 28, y + 18);
    };

    const footer = (ctx, width, height, left, right, rightColor) => {
        const y = height - 16;
        ctx.font = `8.5px ${MONO}`;
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#888888';
        ctx.fillText(left, 16, y);
        ctx.textAlign = 'right';
        ctx.fillStyle = rightColor;
        ctx.fillText(right, width - 16, y);
    };

    // Stage 01 — Django request lifecycle (drawn like the upstream DOM tree).
    const drawDjango = (ctx, width, height, frame) => {
        const nodes = [
            { label: 'HTTP REQUEST', x: 0.5, y: 0.18, children: [1] },
            { label: 'URLCONF → VIEW', x: 0.5, y: 0.42, children: [2, 3, 4] },
            { label: 'ORM · MODEL', x: 0.2, y: 0.68, children: [] },
            { label: 'FORM · CLEAN', x: 0.5, y: 0.68, children: [] },
            { label: 'TEMPLATE', x: 0.8, y: 0.68, children: [] },
        ];
        const middleware = [
            'SecurityMiddleware → headers set',
            'SessionMiddleware → session loaded',
            'CsrfViewMiddleware → token checked',
            'AuthenticationMiddleware → request.user',
        ];
        ctx.lineWidth = 1;
        nodes.forEach((node) => {
            node.children.forEach((ci) => {
                const child = nodes[ci];
                ctx.beginPath();
                ctx.moveTo(node.x * width, node.y * height + 13);
                ctx.lineTo(child.x * width, child.y * height - 13);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
                ctx.stroke();
            });
        });
        nodes.forEach((node, i) => {
            const nx = node.x * width;
            const ny = node.y * height;
            const boxW = Math.min(i < 2 ? 124 : 96, width * (i < 2 ? 0.34 : 0.26));
            const boxH = 26;
            ctx.fillStyle = i === 0 ? 'rgba(28, 30, 42, 0.95)' : 'rgba(14, 14, 20, 0.9)';
            ctx.strokeStyle = i === 0 ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.18)';
            ctx.beginPath();
            ctx.roundRect(nx - boxW / 2, ny - boxH / 2, boxW, boxH, 6);
            ctx.fill();
            ctx.stroke();
            ctx.font = `9px ${MONO}`;
            ctx.fillStyle = i === 0 ? '#38bdf8' : '#e2e8f0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.label, nx, ny);
        });
        const rule = middleware[Math.floor(frame / 120) % middleware.length];
        footer(ctx, width, height, `MIDDLEWARE: ${rule}`, '200 OK • RESPONSE READY', '#38bdf8');
    };

    // Stage 02 — REST API request log (drawn like the upstream socket log).
    const drawApi = (ctx, width, height) => {
        headerBar(ctx, width, 'ENDPOINT: /api/v1/projects/', '', 'DRF • JSON', '', '#10b981');
        const rows = [
            { who: 'CLIENT', text: 'GET /api/v1/projects/?page=2', tail: '→', color: '#ffffff' },
            { who: 'DRF', text: 'ProjectSerializer(many=True)', tail: '200', color: '#38bdf8' },
            { who: 'REDIS', text: 'cache.get("projects:page:2")', tail: 'HIT', color: '#f59e0b' },
            { who: 'POSTGRES', text: 'SELECT … LIMIT 20 OFFSET 20', tail: '20 rows', color: '#f59e0b' },
        ];
        const baseY = 56;
        const lineH = Math.min(38, (height - 95) / 4);
        rows.forEach((row, i) => {
            const y = baseY + i * lineH;
            ctx.fillStyle = i === 1 ? 'rgba(24, 26, 36, 0.85)' : 'rgba(12, 12, 16, 0.7)';
            ctx.strokeStyle = i === 1 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(16, y, width - 32, lineH - 6, 6);
            ctx.fill();
            ctx.stroke();
            const ty = y + (lineH - 6) / 2 + 3;
            ctx.font = `8.5px ${MONO}`;
            ctx.textBaseline = 'alphabetic';
            ctx.textAlign = 'left';
            ctx.fillStyle = row.color;
            ctx.fillText(`[${row.who}]`, 26, ty);
            ctx.fillStyle = '#cccccc';
            ctx.fillText(row.text, 26 + 85, ty);
            ctx.textAlign = 'right';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.fillText(row.tail, width - 26, ty);
        });
        const pipeY = height - 20;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.moveTo(16, pipeY);
        ctx.lineTo(width - 16, pipeY);
        ctx.stroke();
        ctx.font = `8px ${MONO}`;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#888888';
        ctx.fillText('DJANGO REST FRAMEWORK • POSTGRESQL', 16, pipeY + 14);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('PAGINATED • CACHED', width - 16, pipeY + 14);
    };

    // Stage 03 — server terminal typing deploy commands (upstream stream window).
    const commands = [
        '$ docker compose -p portfolio up -d --build',
        '$ nginx -t && systemctl reload nginx',
        '$ certbot --nginx -d example.com',
        '$ docker compose logs -f web',
        '$ curl -I https://example.com  →  HTTP/2 200',
    ];
    const drawDocker = (ctx, width, height, frame) => {
        headerBar(ctx, width, 'HOST: UBUNTU SERVER', '[docker compose]', 'NGINX: ACTIVE', '#818cf8', '#10b981');
        const winY = 54;
        const winH = height - 98;
        ctx.fillStyle = 'rgba(10, 10, 14, 0.9)';
        ctx.fillRect(16, winY, width - 32, winH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.strokeRect(16, winY, width - 32, winH);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(16, winY, width - 32, 22);
        ctx.font = `8px ${MONO}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#777777';
        ctx.fillText('SSH SESSION • DEPLOY LOG', 26, winY + 15);

        const full = commands[Math.floor(frame / 240) % commands.length];
        const shown = full.slice(0, Math.min(full.length, Math.floor((frame % 240) / 2)));
        ctx.font = `11px ${MONO}`;
        ctx.fillStyle = '#ffffff';
        const words = shown.split(' ');
        let line = '';
        let lineY = winY + 44;
        for (let i = 0; i < words.length; i++) {
            const test = `${line}${words[i]} `;
            if (ctx.measureText(test).width > width - 70 && i > 0) {
                ctx.fillText(line, 28, lineY);
                line = `${words[i]} `;
                lineY += 20;
            } else {
                line = test;
            }
        }
        ctx.fillText(line, 28, lineY);
        if (Math.floor(frame / 18) % 2 === 0 && shown.length < full.length) {
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(28 + ctx.measureText(line).width + 2, lineY - 9, 6, 12);
        }

        const y = height - 18;
        ctx.font = `8.5px ${MONO}`;
        ctx.fillStyle = '#888888';
        ctx.fillText('CONTAINERS: web • db', 16, y);
        const barW = Math.max(60, width - 320);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(170, y - 8, barW, 4);
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'right';
        ctx.fillText('STATUS: RUNNING', width - 16, y);
    };

    // Stage 04 — one-command installer pipeline (upstream ATS-parser layout).
    const drawInstaller = (ctx, width, height) => {
        headerBar(ctx, width, 'INSTALL: ONE COMMAND', 'HOST NGINX: SHARED', 'POSTGRESQL', '#10b981', 'rgba(255, 255, 255, 0.7)');
        const steps = ['DOCKER ENGINE', 'HOST NGINX + CERTBOT', 'APP STACK (web • db)', 'STATIC: HASHED + GZIP'];
        const cardY = 54;
        const cardH = height - 90;
        ctx.fillStyle = 'rgba(10, 10, 14, 0.9)';
        ctx.fillRect(16, cardY, width - 32, cardH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.strokeRect(16, cardY, width - 32, cardH);

        const baseY = cardY + 22;
        const spacing = Math.min(28, (cardH - 30) / 4);
        const rightLimit = width > 340 ? width - 105 : width - 75;
        steps.forEach((name, i) => {
            const y = baseY + i * spacing;
            ctx.font = `8px ${MONO}`;
            ctx.textBaseline = 'alphabetic';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(name, 28, y);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('DONE', rightLimit, y);
            const barW = Math.max(60, rightLimit - 30);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(28, y + 4, barW, 4);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(28, y + 4, barW, 4);
        });

        if (width > 320) {
            const gx = width - 58;
            const gy = cardY + cardH / 2;
            const r = Math.min(30, cardH * 0.28);
            ctx.beginPath();
            ctx.arc(gx, gy, r, 0, Math.PI * 2);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3.5;
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.font = `10.5px ${MONO}`;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('LIVE', gx, gy - 3);
            ctx.font = `6.5px ${MONO}`;
            ctx.fillStyle = '#888888';
            ctx.fillText('DEPLOYED', gx, gy + 9);
        }
        footer(ctx, width, height, 'STATIC: 96 MB → 317 KB • ISOLATED STACKS', 'VERIFIED', '#10b981');
    };

    const DRAW = { django: drawDjango, api: drawApi, docker: drawDocker, installer: drawInstaller };

    root.querySelectorAll('canvas[data-visualizer]').forEach((canvas) => {
        const draw = DRAW[canvas.dataset.visualizer];
        if (!draw) return;
        const ctx = canvas.getContext('2d');
        const parent = canvas.parentElement;
        let width = parent.clientWidth || 380;
        let height = parent.clientHeight || 280;

        const resize = () => {
            width = parent.clientWidth || 380;
            height = parent.clientHeight || 280;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        new ResizeObserver(resize).observe(parent);

        let frame = 0;
        const loop = () => {
            requestAnimationFrame(loop);
            if (document.hidden) return;
            frame++;
            ctx.clearRect(0, 0, width, height);
            draw(ctx, width, height, frame);
        };
        loop();
    });
})();
