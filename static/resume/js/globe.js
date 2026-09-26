/* "Explore" wireframe globe on the hero — vanilla port of HeroGlobeButton.jsx
 * from DineshS36/portfolio (Apache-2.0, commit 35c3989). */
(() => {
    'use strict';

    const cta = document.querySelector('.hero-globe-cta');
    if (!cta) return;
    const canvas = cta.querySelector('.globe-canvas');
    const ctx = canvas.getContext('2d');
    const target = cta.dataset.href;

    const size = 150;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const radius = 54;
    const centerX = size / 2;
    const centerY = size / 2;
    let rotY = 0;
    const rotX = 0.35;
    let targetSpeed = 0.009;
    let currentSpeed = 0.009;

    const rings = [];
    const latCount = 7;
    const lonCount = 8;
    const pointsPerRing = 48;

    for (let i = 1; i < latCount; i++) {
        const phi = (Math.PI * i) / latCount - Math.PI / 2;
        const r = radius * Math.cos(phi);
        const y = radius * Math.sin(phi);
        const ring = [];
        for (let j = 0; j < pointsPerRing; j++) {
            const theta = (Math.PI * 2 * j) / pointsPerRing;
            ring.push({ x: r * Math.cos(theta), y, z: r * Math.sin(theta) });
        }
        rings.push(ring);
    }
    for (let i = 0; i < lonCount; i++) {
        const theta = (Math.PI * i) / lonCount;
        const meridian = [];
        for (let j = 0; j < pointsPerRing; j++) {
            const phi = (Math.PI * 2 * j) / pointsPerRing;
            meridian.push({
                x: radius * Math.sin(phi) * Math.cos(theta),
                y: radius * Math.cos(phi),
                z: radius * Math.sin(phi) * Math.sin(theta),
            });
        }
        rings.push(meridian);
    }

    const satellites = [
        { theta: 0, phi: 0, speed: 0.02 },
        { theta: Math.PI / 2, phi: 0.4, speed: -0.025 },
        { theta: Math.PI, phi: -0.3, speed: 0.018 },
        { theta: (3 * Math.PI) / 2, phi: 0.2, speed: -0.015 },
    ];

    const render = () => {
        ctx.clearRect(0, 0, size, size);
        currentSpeed += (targetSpeed - currentSpeed) * 0.08;
        rotY += currentSpeed;
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);

        rings.forEach((ring, idx) => {
            ctx.beginPath();
            ring.forEach((pt, i) => {
                const x1 = pt.x * cosY - pt.z * sinY;
                const z1 = pt.z * cosY + pt.x * sinY;
                const y2 = pt.y * cosX - z1 * sinX;
                if (i === 0) ctx.moveTo(centerX + x1, centerY + y2);
                else ctx.lineTo(centerX + x1, centerY + y2);
            });
            ctx.closePath();
            ctx.strokeStyle = idx % 2 === 0 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.28)';
            ctx.lineWidth = 0.75;
            ctx.stroke();
        });

        satellites.forEach((node) => {
            node.theta += node.speed;
            const x = radius * Math.cos(node.phi) * Math.cos(node.theta);
            const y = radius * Math.sin(node.phi);
            const z = radius * Math.cos(node.phi) * Math.sin(node.theta);
            const x1 = x * cosY - z * sinY;
            const z1 = z * cosY + x * sinY;
            const y2 = y * cosX - z1 * sinX;
            const z2 = z1 * cosX + y * sinX;
            const alpha = Math.max(0.1, (z2 + radius) / (radius * 2));
            ctx.beginPath();
            ctx.arc(centerX + x1, centerY + y2, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        requestAnimationFrame(render);
    };
    render();

    canvas.addEventListener('mouseenter', () => { targetSpeed = 0.038; });
    canvas.addEventListener('mouseleave', () => { targetSpeed = 0.009; });

    const hasGsap = typeof window.gsap !== 'undefined';
    const reduce = window.ResumeCore && window.ResumeCore.reduceMotion;
    if (hasGsap && !reduce) {
        gsap.to(cta, { y: '-=10', duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }

    // Event-horizon collapse, then on to About.
    const enter = (e) => {
        e.preventDefault();
        if (!hasGsap || reduce) { window.location.href = target; return; }
        gsap.timeline({ onComplete: () => { window.location.href = target; } })
            .to(cta, { scale: 1.25, filter: 'brightness(2)', duration: 0.18, ease: 'power2.out' })
            .to(cta, { scale: 0, opacity: 0, filter: 'blur(12px)', duration: 0.4, ease: 'power4.in' });
    };
    cta.addEventListener('click', enter);
    cta.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') enter(e); });
})();
