/* Featured work — vanilla port of Work.jsx + ProjectModal.jsx from
 * DineshS36/portfolio (Apache-2.0, commit 35c3989). Project data comes from
 * the Django DB (json_script "projects-data"); the modal is built with DOM
 * APIs (textContent), never innerHTML, so admin content can't inject markup. */
(() => {
    'use strict';

    const dataEl = document.getElementById('projects-data');
    if (!dataEl) return;
    const projects = JSON.parse(dataEl.textContent);
    const core = window.ResumeCore || {};
    const hasGsap = typeof window.gsap !== 'undefined';

    // h('div.a.b', {attr: v}, child, …) — tiny element builder.
    const h = (spec, attrs, ...children) => {
        const [tag, ...classes] = spec.split('.');
        const el = document.createElement(tag || 'div');
        if (classes.length) el.className = classes.join(' ');
        Object.entries(attrs || {}).forEach(([k, v]) => {
            if (v === false || v == null) return;
            if (k === 'text') el.textContent = v;
            else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
            else el.setAttribute(k, v === true ? '' : v);
        });
        children.flat().forEach((c) => { if (c != null && c !== false) el.append(c); });
        return el;
    };

    const LOCK_SVG = () => {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('class', 'lock-icon');
        svg.setAttribute('aria-hidden', 'true');
        const rect = document.createElementNS(ns, 'rect');
        Object.entries({ x: 3, y: 11, width: 18, height: 11, rx: 2, ry: 2 }).forEach(([k, v]) => rect.setAttribute(k, v));
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', 'M7 11V7a5 5 0 0 1 10 0v4');
        svg.append(rect, path);
        return svg;
    };

    let overlay = null;
    let state = null;

    const hasArchitecture = (p) => p.architectureFlow.length || p.architectureDetails.length || p.metrics.length;

    function overviewTab(p) {
        const images = p.images;
        let gallery = null;
        if (images.length) {
            const main = h('img.project-modal-image', { src: images[state.image], alt: `${p.title} screenshot ${state.image + 1}` });
            const mainWrap = h('div.project-modal-gallery-main', {}, main);
            if (images.length > 1) {
                mainWrap.append(
                    h('button.project-modal-nav-btn.hoverable', { type: 'button', 'aria-label': 'Previous image', disabled: state.image === 0, text: '‹', onclick: () => showImage(state.image - 1) }),
                    h('button.project-modal-nav-btn.hoverable', { type: 'button', 'aria-label': 'Next image', disabled: state.image === images.length - 1, text: '›', onclick: () => showImage(state.image + 1) }),
                );
            }
            gallery = h('div.project-modal-gallery', {}, mainWrap,
                images.length > 1 ? h('div.project-modal-thumbs', {},
                    images.map((src, i) => h(`button.project-modal-thumb.hoverable${i === state.image ? '.active' : ''}`,
                        { type: 'button', 'aria-label': `Show image ${i + 1}`, onclick: () => showImage(i) },
                        h('img', { src, alt: '' })))) : null);
        }

        const actions = h('div.project-modal-actions');
        if (p.liveUrl) actions.append(h('a.project-modal-action-btn.hoverable.font-mono.uppercase.primary-btn', { href: p.liveUrl, target: '_blank', rel: 'noreferrer', text: 'Launch Live App ↗' }));
        if (p.githubUrl) actions.append(h('a.project-modal-action-btn.hoverable.font-mono.uppercase', { href: p.githubUrl, target: '_blank', rel: 'noreferrer', text: 'GitHub Repo' }));
        if (hasArchitecture(p)) actions.append(h('button.project-modal-action-btn.hoverable.font-mono.uppercase.secondary-btn', { type: 'button', text: 'View Architecture →', onclick: () => setTab('architecture') }));

        const content = h('div.project-modal-content', {},
            p.problem ? h('div.case-study-callout-card', {},
                h('div.callout-header.font-mono.uppercase', {}, h('span.callout-glow-dot'), ' The Engineering Challenge'),
                h('p.callout-text', { text: p.problem })) : null,
            p.description ? h('p.project-modal-description.text-gray', { text: p.description }) : null,
            p.features.length ? h('div.project-modal-section', {},
                h('p.project-modal-section-title.font-mono.uppercase', { text: 'Core Capabilities' }),
                h('ul.project-modal-list', {}, p.features.map((f) => h('li', { text: f })))) : null,
            p.techStack.length ? h('div.project-modal-section', {},
                h('p.project-modal-section-title.font-mono.uppercase', { text: 'Technologies & Tools' }),
                h('div.project-modal-pills', {}, p.techStack.map((t) => h('span.project-modal-pill', { text: t })))) : null,
            actions);

        return h(`div.project-modal-body${gallery ? '' : '.no-gallery'}`, { 'data-lenis-prevent': 'true' }, gallery, content);
    }

    function architectureTab(p) {
        const section = (badge, heading, sub, body) => h('div.case-study-section', {},
            h('div.case-study-section-header', {},
                h('span.section-badge.font-mono.uppercase', { text: badge }),
                h('h4.case-study-heading', { text: heading }),
                sub ? h('p.case-study-subheading.text-gray', { text: sub }) : null),
            body);

        return h('div.project-modal-architecture-body', { 'data-lenis-prevent': 'true' },
            p.architectureFlow.length ? section('01 • Pipeline Flow', 'System Architecture',
                'How a request moves through the system, from the edge down to storage.',
                h('div.architecture-pipeline-grid', { 'data-lenis-prevent': 'true' },
                    p.architectureFlow.map((node, i) => h('div.architecture-node-wrapper', {},
                        h('div.architecture-node-card', {},
                            h('div.node-step.font-mono', { text: node.step }),
                            h('h5.node-title.uppercase.font-mono', { text: node.title }),
                            node.tech ? h('div.node-tech-badge.font-mono', { text: node.tech }) : null,
                            node.desc ? h('p.node-desc.text-gray', { text: node.desc }) : null),
                        i < p.architectureFlow.length - 1 ? h('div.architecture-connector', { 'aria-hidden': 'true' },
                            h('span.connector-pulse'), h('span.connector-arrow', { text: '→' })) : null)))) : null,
            p.architectureDetails.length ? section('02 • Engineering Strategy', 'Architectural Decisions & Trade-Offs', '',
                h('div.architecture-decisions-grid', {}, p.architectureDetails.map((d) => h('div.decision-card', {},
                    h('div.decision-card-icon.font-mono', { text: '✦' }),
                    h('h5.decision-card-title.uppercase.font-mono', { text: d.title }),
                    d.desc ? h('p.decision-card-desc.text-gray', { text: d.desc }) : null)))) : null,
            p.metrics.length ? section('03 • Verification', 'Observed System Benchmarks', '',
                h('div.metrics-tiles-grid', {}, p.metrics.map((m) => h('div.metric-tile', {},
                    h('div.metric-value.font-mono.text-glow-intense', { text: m.value }),
                    h('div.metric-label.font-mono.uppercase.text-gray', { text: m.label }))))) : null);
    }

    function prototypeTab(p) {
        const loading = h('div.prototype-loading-overlay.font-mono', {}, h('div.prototype-spinner'), h('span', { text: 'Connecting to secure live preview...' }));
        const frame = h('iframe.prototype-iframe', {
            src: p.liveUrl, title: `${p.title} Live Prototype`,
            sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups',
            onload: () => loading.remove(),
        });
        const viewport = h(`div.prototype-viewport-container.device-${state.device}`, {}, loading, frame);
        const deviceBtn = (key, label) => h(`button.device-toggle-btn.hoverable${state.device === key ? '.active' : ''}`,
            { type: 'button', text: label, onclick: () => { state.device = key; renderBody(); } });

        return h('div.project-modal-prototype-body', { 'data-lenis-prevent': 'true' },
            h('div.prototype-browser-bar.font-mono', {},
                h('div.browser-dots', { 'aria-hidden': 'true' }, h('span.dot.dot-red'), h('span.dot.dot-yellow'), h('span.dot.dot-green')),
                h('div.browser-address-bar', {}, LOCK_SVG(), h('span.address-text', { text: p.liveUrl })),
                h('div.prototype-controls', {},
                    deviceBtn('desktop', 'Desktop'),
                    deviceBtn('mobile', 'Mobile (390px)'),
                    h('a.launch-external-btn.hoverable', { href: p.liveUrl, target: '_blank', rel: 'noreferrer', title: 'Open live site in new tab', text: '↗ Open Tab' }))),
            viewport);
    }

    function renderBody() {
        const p = projects[state.index];
        const old = overlay.querySelector('[data-modal-body]');
        const tab = state.tab === 'architecture' ? architectureTab(p)
            : state.tab === 'prototype' ? prototypeTab(p) : overviewTab(p);
        tab.setAttribute('data-modal-body', '');
        old.replaceWith(tab);
        overlay.querySelectorAll('.project-modal-tab-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.tab === state.tab);
        });
    }

    function setTab(tab) { state.tab = tab; renderBody(); }

    function showImage(i) {
        const images = projects[state.index].images;
        state.image = Math.max(0, Math.min(images.length - 1, i));
        renderBody();
        const img = overlay.querySelector('.project-modal-image');
        if (img && hasGsap) gsap.fromTo(img, { autoAlpha: 0.001, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' });
    }

    function onKey(e) {
        if (!overlay) return;
        if (e.key === 'Escape') close();
        if (state.tab === 'overview') {
            if (e.key === 'ArrowLeft') showImage(state.image - 1);
            if (e.key === 'ArrowRight') showImage(state.image + 1);
        }
    }

    function open(index) {
        if (overlay) return;
        const p = projects[index];
        state = { index, tab: 'overview', image: 0, device: 'desktop' };

        const tabs = [['overview', '01', 'OVERVIEW & GALLERY']];
        if (hasArchitecture(p)) tabs.push(['architecture', '02', 'SYSTEM ARCHITECTURE']);
        if (p.liveUrl) tabs.push(['prototype', '03', 'LIVE PROTOTYPE']);

        const panel = h('div.project-modal-panel', { 'data-lenis-prevent': 'true' },
            h('div.project-modal-header', {},
                h('div', {},
                    h('p.project-modal-tag.font-mono.uppercase', { text: p.category || 'Case Study • Production System' }),
                    h('h3.project-modal-title.text-glow-intense.uppercase', { text: p.title }),
                    p.tagline ? h('p.project-modal-subtitle.text-gray', { text: p.tagline }) : null),
                h('button.project-modal-close.hoverable', { type: 'button', 'aria-label': 'Close modal', onclick: close },
                    h('span', { 'aria-hidden': 'true', text: '✕' }))),
            h('div.project-modal-tab-bar.font-mono', {}, tabs.map(([key, num, label]) =>
                h('button.project-modal-tab-btn.hoverable', { type: 'button', 'data-tab': key, onclick: () => setTab(key) },
                    h('span.tab-number', { text: num }), h('span.tab-label', { text: label })))),
            h('div', { 'data-modal-body': '' }));

        overlay = h('div.project-modal-overlay', {
            role: 'dialog', 'aria-modal': 'true', 'aria-label': `${p.title} case study`, 'data-lenis-prevent': 'true',
            onmousedown: (e) => { if (e.target === overlay) close(); },
            onwheel: (e) => e.stopPropagation(),
            ontouchmove: (e) => e.stopPropagation(),
        }, panel);
        document.body.append(overlay);
        renderBody();

        state.prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        if (core.stopLenis) core.stopLenis();
        window.addEventListener('keydown', onKey);
        panel.querySelector('.project-modal-close').focus({ preventScroll: true });

        if (hasGsap && !core.reduceMotion) {
            gsap.timeline()
                .set(overlay, { autoAlpha: 0 })
                .set(panel, { y: 24, autoAlpha: 0, scale: 0.98 })
                .to(overlay, { autoAlpha: 1, duration: 0.22, ease: 'power2.out' })
                .to(panel, { autoAlpha: 1, y: 0, scale: 1, duration: 0.38, ease: 'power3.out' }, '-=0.08');
        }
    }

    function close() {
        if (!overlay) return;
        const card = document.querySelector(`[data-project="${state.index}"]`);
        window.removeEventListener('keydown', onKey);
        overlay.remove();
        overlay = null;
        document.body.style.overflow = state.prevOverflow || '';
        if (core.startLenis) core.startLenis();
        if (card) card.focus({ preventScroll: true });
    }

    document.querySelectorAll('[data-project]').forEach((card) => {
        const index = Number(card.dataset.project);
        card.addEventListener('click', () => open(index));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(index); }
        });
    });
})();
