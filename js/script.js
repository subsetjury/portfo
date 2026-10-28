/* =====================================================================
   script.js · Portfolio Nguyễn Văn An (Steampunk ⇄ Cyberpunk)
   ---------------------------------------------------------------------
   Không cần sửa HTML/CSS. Script tự:
   - chèn <canvas> bánh răng ăn khớp vào .hero-bg
   - chèn terminal tương tác vào cuối #about
   - biến mỗi .skill thành "đồng hồ đo" (gauge) + thanh năng lượng
   - làm timeline có đường tiến trình + mốc sáng theo vị trí cuộn
   - chèn CSS bổ sung (thẻ <style id="js-enhancements">); muốn gọn thì
     có thể chuyển khối CSS đó sang style.css.
   Chế độ tối được bật bằng html[data-theme="dark"] (khớp style.css).
   ===================================================================== */
(() => {
  'use strict';

  /* ---------- Tiện ích ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* bỏ qua */ } },
  };

  // Trạng thái dùng chung giữa các module
  const app = { gears: null, scrollFns: [] };

  /* ---------- CSS bổ sung (canvas, terminal, gauge, timeline) ---------- */
  function injectStyles() {
    const css = `
/* Canvas bánh răng */
.gear-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
html:not([data-theme="dark"]) .has-gear-canvas .blob { display: none; } /* tránh trùng bánh răng CSS ở chế độ sáng */

/* Đồng hồ kỹ năng */
.skill.has-gauge { display: grid; grid-template-columns: 64px 1fr; gap: 14px; align-items: center; }
.skill-body { min-width: 0; }
.gauge { width: 64px; height: 42px; overflow: visible; }
.gauge .g-track { fill: none; stroke: var(--line); stroke-opacity: .35; stroke-width: 5; }
.gauge .g-arc { fill: none; stroke: var(--primary); stroke-width: 5; stroke-dasharray: 0 100; transition: stroke-dasharray 1.4s ease; }
.gauge .g-tick { stroke: var(--ink); stroke-opacity: .55; stroke-width: 1.2; }
.gauge .g-needle { transform-origin: 32px 34px; transform: rotate(-90deg); transition: transform 1.4s cubic-bezier(.3, 1.5, .5, 1); }
.gauge .g-pin { stroke: var(--secondary); stroke-width: 2; stroke-linecap: round; transform-origin: 32px 34px; }
.gauge .g-hub { fill: var(--secondary); }
.skill:hover .g-pin { animation: quiver .22s linear infinite; }
html[data-theme="dark"] .gauge .g-arc, html[data-theme="dark"] .gauge .g-pin { filter: drop-shadow(0 0 3px var(--primary)); }
@keyframes quiver { 25% { transform: rotate(1.8deg); } 75% { transform: rotate(-1.8deg); } }

/* Timeline tương tác */
.timeline-progress { position: absolute; left: 11px; top: 6px; width: 4px; height: 0; z-index: 1; pointer-events: none;
  background: var(--secondary); box-shadow: var(--glow); }
.timeline-item { opacity: .55; cursor: pointer; outline-offset: 6px;
  transition: opacity .4s ease, color .6s ease; }
.timeline-item.is-passed { opacity: 1; }
.timeline-item .dot { transition: scale .35s ease, background-color .6s ease, border-color .6s ease, box-shadow .6s ease; z-index: 2; }
.timeline-item.is-active .dot { scale: 1.35; animation: dotPulse 1.8s ease-in-out infinite; }
.timeline-item.is-active h3 { color: var(--hl); }
@keyframes dotPulse { 0% { box-shadow: 0 0 0 0 var(--primary); } 70%, 100% { box-shadow: 0 0 0 12px transparent; } }

/* Terminal */
.terminal { --t-bg: #1b1008; --t-fg: #f3c871; --t-dim: #a98a55; --t-ok: #9fdcab; --t-err: #ff8a6b; --t-acc: #7fd6c2;
  margin-top: 32px; border: 2px solid var(--line); border-radius: var(--radius); background: var(--t-bg); color: var(--t-fg);
  box-shadow: var(--shadow); overflow: hidden;
  font-family: ui-monospace, "JetBrains Mono", "Cascadia Code", Consolas, "Courier New", monospace; font-size: .92rem; }
html[data-theme="dark"] .terminal { --t-bg: #04030c; --t-fg: #00f0ff; --t-dim: #6a74b8; --t-ok: #fcee0a; --t-err: #ff2bd6; --t-acc: #ff2bd6; }
html[data-theme="dark"] .term-body { text-shadow: 0 0 6px rgba(0, 240, 255, .4); }
.term-bar { display: flex; align-items: center; gap: 12px; padding: 8px 14px; background: rgba(255, 255, 255, .07);
  border-bottom: 1px solid var(--t-dim); font-size: .82rem; color: var(--t-dim); }
.term-dots { display: flex; gap: 6px; }
.term-dots i { width: 10px; height: 10px; border-radius: 50%; background: var(--t-dim); opacity: .8; }
.term-title { flex: 1; text-align: center; }
.term-body { height: 270px; overflow-y: auto; padding: 14px 16px; line-height: 1.55;
  background-image: repeating-linear-gradient(0deg, rgba(255, 255, 255, .03) 0 1px, transparent 1px 3px); }
.term-line { white-space: pre-wrap; word-break: break-word; }
.term-line .t-prompt { color: var(--t-acc); margin-right: .6ch; }
.t-dim { color: var(--t-dim); } .t-ok { color: var(--t-ok); } .t-err { color: var(--t-err); } .t-acc { color: var(--t-acc); }
.term-row { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-top: 1px dashed var(--t-dim); }
.term-row:focus-within { box-shadow: inset 0 0 0 1px var(--t-fg); }
.term-prompt { color: var(--t-acc); white-space: nowrap; }
.term-input { flex: 1; min-width: 0; background: transparent; border: 0; color: inherit; font: inherit; caret-color: var(--t-fg); }
.term-input:focus-visible { outline: none; }
.term-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px 14px; }
.term-chip { padding: 2px 10px; border: 1px solid var(--t-dim); border-radius: var(--radius); color: var(--t-fg); font: inherit; font-size: .82rem; }
.term-chip:hover { background: var(--t-fg); color: var(--t-bg); }
@media (max-width: 520px) { .term-input { font-size: 16px; } .term-body { height: 240px; } }
`;
    const style = document.createElement('style');
    style.id = 'js-enhancements';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* =====================================================================
     1. GIAO DIỆN SÁNG / TỐI
     ===================================================================== */
  const isDark = () => root.dataset.theme === 'dark';

  function setTheme(mode, save = true) {
    root.dataset.theme = mode;
    if (save) store.set('theme', mode);
    const btn = $('#themeToggle');
    if (btn) {
      const dark = mode === 'dark';
      btn.textContent = dark ? '☀️' : '🌙';
      btn.title = dark ? 'Chuyển sang Steampunk (sáng)' : 'Chuyển sang Cyberpunk (tối)';
      btn.setAttribute('aria-pressed', String(dark));
    }
    document.dispatchEvent(new CustomEvent('themechange', { detail: { dark: mode === 'dark' } }));
  }

  function initTheme() {
    setTheme(store.get('theme') === 'dark' ? 'dark' : 'light', false);
    const btn = $('#themeToggle');
    if (btn) btn.addEventListener('click', () => setTheme(isDark() ? 'light' : 'dark'));
  }

  /* =====================================================================
     2. ĐIỀU HƯỚNG, THANH TIẾN TRÌNH, NÚT LÊN ĐẦU TRANG
     ===================================================================== */
  function initNav() {
    const btn = $('#menuToggle');
    const menu = $('#navMenu');
    if (btn && menu) {
      const setOpen = (open) => {
        btn.setAttribute('aria-expanded', String(open));
        btn.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
        btn.textContent = open ? '✕' : '☰';
        menu.classList.toggle('open', open);
      };
      btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
      menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
      document.addEventListener('click', (e) => { if (!e.target.closest('.navbar')) setOpen(false); });
      window.addEventListener('resize', () => { if (window.innerWidth > 900) setOpen(false); });
    }

    const links = $$('.nav-link');
    const sections = links.map((a) => $(a.getAttribute('href')));
    const progress = $('#scrollProgress');
    const header = $('#header');
    const toTop = $('#toTop');

    function update() {
      const y = window.scrollY;
      const max = root.scrollHeight - window.innerHeight;
      if (progress) progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      if (header) header.classList.toggle('scrolled', y > 10);
      if (toTop) toTop.classList.toggle('show', y > 500);

      const probe = window.innerHeight * 0.35;
      let idx = 0;
      sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= probe) idx = i; });
      if (window.innerHeight + y >= root.scrollHeight - 4) idx = sections.length - 1;
      links.forEach((a, i) => {
        a.classList.toggle('active', i === idx);
        if (i === idx) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      app.scrollFns.forEach((fn) => fn());
    }

    let ticking = false;
    const schedule = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
    update();
  }

  /* =====================================================================
     3. HIỆU ỨNG GÕ CHỮ + BỘ ĐẾM SỐ
     ===================================================================== */
  async function initTyping() {
    const el = $('#typingText');
    if (!el) return;
    const words = ['Front-end Developer', 'sinh viên Công nghệ thông tin', 'người mê Python & Java', 'Web Developer tương lai'];
    if (reduceMotion) { el.textContent = words[0]; return; }
    let w = 0;
    while (true) {
      const word = words[w % words.length];
      for (let i = 1; i <= word.length; i++) { el.textContent = word.slice(0, i); await sleep(70); }
      await sleep(1600);
      for (let i = word.length - 1; i >= 0; i--) { el.textContent = word.slice(0, i); await sleep(35); }
      await sleep(350);
      w++;
    }
  }

  function animateNumber(el, to, dur = 1200, onTick) {
    if (reduceMotion) { el.textContent = to; if (onTick) onTick(to); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      el.textContent = v;
      if (onTick) onTick(v);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function onVisible(els, cb, threshold = 0.4) {
    if (!('IntersectionObserver' in window)) { els.forEach((e, i) => cb(e, i)); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        cb(en.target, els.indexOf(en.target));
      });
    }, { threshold });
    els.forEach((e) => io.observe(e));
  }

  function initCounters() {
    onVisible($$('.counter'), (el) => animateNumber(el, +el.dataset.target || 0, 1400), 0.6);
  }

  /* =====================================================================
     4. CANVAS BÁNH RĂNG ĂN KHỚP (Steampunk: đồng thau · Cyberpunk: neon)
     ===================================================================== */
  function initGearCanvas() {
    const host = $('.hero-bg');
    if (!host) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'gear-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.classList.add('has-gear-canvas');
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // t: số răng · parent: bánh dẫn · a: góc (độ) từ bánh dẫn tới bánh này
    // fx, fy: vị trí gốc theo tỉ lệ (chỉ bánh không có parent)
    const gears = [
      { t: 26, fx: 0.06, fy: 0.14, dir: 1 },
      { t: 13, parent: 0, a: 38 },
      { t: 19, parent: 1, a: 100 },
      { t: 30, fx: 0.95, fy: 0.88, dir: -1 },
      { t: 15, parent: 3, a: 205 },
      { t: 11, parent: 4, a: 255 },
    ].map((g) => ({ ...g, rot: Math.random() * Math.PI, x: 0, y: 0, c: 0 }));

    let W = 0, H = 0, m = 8, palette = ['#b4762a', '#8a3b1e', '#2e7d6b'], lineCol = '#5b3a1d';
    let speed = 1, scrollVel = 0, lastY = window.scrollY;
    let running = false, visible = true, last = 0;

    function readPalette() {
      const cs = getComputedStyle(root);
      const v = (n) => cs.getPropertyValue(n).trim();
      palette = [v('--primary'), v('--secondary'), v('--accent')];
      lineCol = v('--line');
    }

    function layout() {
      const rect = host.getBoundingClientRect();
      W = rect.width; H = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      m = clamp(Math.min(W, H) / 80, 5, 10); // "module" – kích thước răng
      gears.forEach((g, i) => {
        const r = (g.t * m) / 2;
        if (g.parent == null) { g.x = g.fx * W; g.y = g.fy * H; return; }
        const p = gears[g.parent];
        const phi = (g.a * Math.PI) / 180;
        const dist = r + (p.t * m) / 2;
        g.x = p.x + dist * Math.cos(phi);
        g.y = p.y + dist * Math.sin(phi);
        // Hằng số pha để răng bánh này luôn lọt vào rãnh của bánh dẫn
        g.c = phi + Math.PI - Math.PI / g.t + (phi * p.t) / g.t;
        void i;
      });
      draw();
    }

    function gearPath(g) {
      const r = (g.t * m) / 2, ro = r + m * 0.9, ri = r - m * 1.15, p = (Math.PI * 2) / g.t;
      ctx.beginPath();
      for (let k = 0; k < g.t; k++) {
        const a = g.rot + k * p;
        const pts = [[ri, a - 0.3 * p], [ro, a - 0.17 * p], [ro, a + 0.17 * p], [ri, a + 0.3 * p]];
        pts.forEach(([rad, ang], j) => {
          const x = rad * Math.cos(ang), y = rad * Math.sin(ang);
          if (k === 0 && j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.arc(0, 0, ri, a + 0.3 * p, a + 0.7 * p);
      }
      ctx.closePath();
      // Lỗ trục
      const hr = ri * 0.22;
      ctx.moveTo(hr, 0);
      ctx.arc(0, 0, hr, 0, Math.PI * 2);
      // Lỗ giữa các nan hoa (bánh lớn)
      if (g.t >= 16) {
        const n = 5, r1 = ri * 0.38, r2 = ri * 0.8;
        for (let i = 0; i < n; i++) {
          const a0 = g.rot + (i * Math.PI * 2) / n + 0.12, a1 = a0 + (Math.PI * 2) / n - 0.24;
          ctx.moveTo(r2 * Math.cos(a0), r2 * Math.sin(a0));
          ctx.arc(0, 0, r2, a0, a1);
          ctx.lineTo(r1 * Math.cos(a1), r1 * Math.sin(a1));
          ctx.arc(0, 0, r1, a1, a0, true);
          ctx.closePath();
        }
      }
      return { ri, hr, r };
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const dark = isDark();
      gears.forEach((g, i) => {
        const col = palette[i % 3];
        ctx.save();
        ctx.translate(g.x, g.y);
        const { ri, hr, r } = gearPath(g);
        if (dark) {
          ctx.globalAlpha = 0.07; ctx.fillStyle = col; ctx.fill('evenodd');
          ctx.globalAlpha = 0.7; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
          ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.stroke();
          ctx.shadowBlur = 0; ctx.globalAlpha = 0.3; ctx.setLineDash([4, 6]);
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.globalAlpha = 0.28; ctx.fillStyle = col; ctx.fill('evenodd');
          ctx.globalAlpha = 0.55; ctx.strokeStyle = lineCol; ctx.lineWidth = 2; ctx.stroke();
          ctx.globalAlpha = 0.7; ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(0, 0, hr * 0.55, 0, Math.PI * 2); ctx.fill(); // trục
          ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, ri * 0.92, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      });
    }

    function frame(now) {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      // Vận tốc cuộn (px/s) làm bánh răng quay nhanh/ngược chiều
      const y = window.scrollY;
      const inst = dt > 0 ? (y - lastY) / dt : 0;
      lastY = y;
      scrollVel += (inst - scrollVel) * 0.1;
      const extra = clamp(scrollVel * 0.0006, -2.5, 2.5);
      gears.forEach((g) => {
        if (g.parent == null) g.rot += (g.dir * 0.15 * speed + g.dir * extra) * dt;
        else { const p = gears[g.parent]; g.rot = g.c - (p.rot * p.t) / g.t; }
      });
      draw();
      requestAnimationFrame(frame);
    }
    const start = () => {
      if (running || reduceMotion || !visible || document.hidden) return;
      running = true; last = performance.now(); lastY = window.scrollY;
      requestAnimationFrame(frame);
    };
    const stop = () => { running = false; };

    readPalette();
    layout();
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(host); else window.addEventListener('resize', layout);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); }).observe(host);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    document.addEventListener('themechange', () => { readPalette(); draw(); });
    start();

    app.gears = {
      get speed() { return speed; },
      set speed(v) { speed = v; if (v > 0 || scrollVel) start(); },
    };
  }

  /* =====================================================================
     5. ĐỒNG HỒ KỸ NĂNG (gauge + thanh năng lượng)
     ===================================================================== */
  function buildGauge(level) {
    const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return [32 + r * Math.sin(a), 34 - r * Math.cos(a)]; };
    let ticks = '';
    for (let i = 0; i <= 10; i++) {
      const deg = -90 + i * 18;
      const [x1, y1] = pt(i % 5 === 0 ? 26.5 : 28.5, deg);
      const [x2, y2] = pt(31.5, deg);
      ticks += `<line class="g-tick" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }
    const wrap = document.createElement('div');
    wrap.innerHTML = `<svg class="gauge" viewBox="0 0 64 42" role="img" aria-label="Mức thành thạo ${level}%">
      <path class="g-track" d="M8 34A24 24 0 0 1 56 34" pathLength="100"/>
      <path class="g-arc" d="M8 34A24 24 0 0 1 56 34" pathLength="100"/>
      ${ticks}
      <g class="g-needle"><line class="g-pin" x1="32" y1="34" x2="32" y2="14"/></g>
      <circle class="g-hub" cx="32" cy="34" r="3.2"/>
    </svg>`;
    return wrap.firstElementChild;
  }

  function initSkills() {
    const skills = $$('.skill');
    skills.forEach((skill) => {
      const level = +skill.dataset.level || 0;
      const fill = $('.bar-fill', skill);
      if (fill) fill.style.width = '0%'; // ghi đè CSS để thanh chạy từ 0 khi hiện ra

      const body = document.createElement('div');
      body.className = 'skill-body';
      while (skill.firstChild) body.appendChild(skill.firstChild);
      skill.classList.add('has-gauge');
      skill.append(buildGauge(level), body);
      $('.skill-top span:last-child', body).textContent = '0%';
    });

    onVisible(skills, (skill, i) => {
      const level = +skill.dataset.level || 0;
      const delay = reduceMotion ? 0 : i * 90;
      setTimeout(() => {
        const fill = $('.bar-fill', skill);
        if (fill) fill.style.width = level + '%';
        $('.g-arc', skill).style.strokeDasharray = `${level} 100`;
        $('.g-needle', skill).style.transform = `rotate(${-90 + level * 1.8}deg)`;
        const label = $('.skill-top span:last-child', skill);
        animateNumber(label, level, 1400, (v) => { label.textContent = v + '%'; });
      }, delay);
    }, 0.35);
  }

  /* =====================================================================
     6. TIMELINE: đường tiến trình + mốc sáng theo vị trí cuộn
     ===================================================================== */
  function initTimeline() {
    const tl = $('.timeline');
    if (!tl) return;
    const items = $$('.timeline-item', tl);
    const prog = document.createElement('span');
    prog.className = 'timeline-progress';
    prog.setAttribute('aria-hidden', 'true');
    tl.prepend(prog);

    function update() {
      const rect = tl.getBoundingClientRect();
      const mid = window.innerHeight * 0.5;
      prog.style.height = clamp(mid - rect.top - 6, 0, Math.max(rect.height - 12, 0)) + 'px';
      let active = -1;
      items.forEach((it, i) => {
        const passed = it.getBoundingClientRect().top + 16 <= mid;
        it.classList.toggle('is-passed', passed);
        if (passed) active = i;
      });
      items.forEach((it, i) => it.classList.toggle('is-active', i === active));
    }

    const focusItem = (it) => it.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    items.forEach((it) => {
      it.tabIndex = 0;
      it.addEventListener('click', () => focusItem(it));
      it.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focusItem(it); } });
    });
    app.scrollFns.push(update);
    update();
  }

  /* =====================================================================
     7. LỌC DỰ ÁN + MODAL CHI TIẾT
     ===================================================================== */
  function initProjects() {
    const btns = $$('.filter-btn');
    const cards = $$('.project-card');
    btns.forEach((b) => b.setAttribute('aria-pressed', String(b.classList.contains('active'))));
    btns.forEach((b) => b.addEventListener('click', () => {
      const f = b.dataset.filter;
      btns.forEach((x) => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-pressed', String(on)); });
      cards.forEach((c) => {
        const show = f === 'all' || c.dataset.category === f;
        const wasHidden = c.classList.contains('hide');
        c.classList.toggle('hide', !show);
        if (show && wasHidden && !reduceMotion) {
          c.animate([{ opacity: 0, transform: 'translateY(16px) scale(.97)' }, { opacity: 1, transform: 'none' }],
            { duration: 350, easing: 'ease-out' });
        }
      });
    }));

    const modal = $('#projectModal');
    const grid = $('#projectsGrid');
    if (!modal || !grid) return;
    const el = { img: $('#modalImg'), title: $('#modalTitle'), desc: $('#modalDesc'), tech: $('#modalTech'), link: $('#modalLink'), close: $('#modalClose') };
    let lastFocus = null;
    const isOpen = () => modal.classList.contains('active');
    modal.setAttribute('aria-modal', 'true');

    function open(card, trigger) {
      const img = $('img', card);
      el.img.src = img.getAttribute('src');
      el.img.alt = img.alt;
      el.title.textContent = card.dataset.title;
      el.desc.textContent = card.dataset.desc;
      el.tech.textContent = card.dataset.tech;
      el.link.href = card.dataset.link || '#';
      lastFocus = trigger || document.activeElement;
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      setTimeout(() => el.close.focus(), 60);
    }
    function close() {
      if (!isOpen()) return;
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('.detail-btn');
      if (b) open(b.closest('.project-card'), b);
    });
    el.close.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { // giữ focus trong modal
        const f = [el.close, el.link];
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
  }

  /* =====================================================================
     8. FORM LIÊN HỆ
     ===================================================================== */
  function initForm() {
    const form = $('#contactForm');
    if (!form) return;
    const ok = $('#formSuccess');
    const rules = {
      name: (v) => (v.trim().length >= 2 ? '' : 'Vui lòng nhập họ và tên (ít nhất 2 ký tự).'),
      email: (v) => (!v.trim() ? 'Vui lòng nhập email.' : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Email chưa đúng định dạng.'),
      message: (v) => (v.trim().length >= 10 ? '' : 'Nội dung cần ít nhất 10 ký tự.'),
    };
    const check = (field) => {
      const input = form.elements[field];
      const msg = rules[field](input.value);
      $('#' + field + 'Error').textContent = msg;
      input.setAttribute('aria-invalid', String(!!msg));
      return !msg;
    };
    Object.keys(rules).forEach((f) => form.elements[f].addEventListener('input', () => { check(f); ok.textContent = ''; }));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const results = Object.keys(rules).map((f) => [f, check(f)]);
      const bad = results.find(([, v]) => !v);
      if (bad) { form.elements[bad[0]].focus(); return; }
      const btn = $('button[type="submit"]', form);
      const label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Đang gửi...';
      // TODO: thay đoạn giả lập này bằng fetch() tới Formspree/EmailJS/backend của bạn.
      await sleep(900);
      const name = form.elements.name.value.trim();
      form.reset();
      btn.disabled = false; btn.textContent = label;
      ok.textContent = `Cảm ơn ${name}! Tin nhắn đã được ghi nhận (bản demo, chưa gửi tới máy chủ).`;
      setTimeout(() => { ok.textContent = ''; }, 7000);
    });
  }

  /* =====================================================================
     9. TERMINAL TƯƠNG TÁC (gõ "help")
     ===================================================================== */
  function initTerminal() {
    const container = $('#about .container');
    if (!container) return;

    const term = document.createElement('section');
    term.className = 'terminal';
    term.setAttribute('aria-label', 'Terminal tương tác');
    term.innerHTML = `
      <div class="term-bar"><span class="term-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="term-title">an@portfolio: ~</span><span aria-hidden="true">gõ help</span></div>
      <div class="term-body" role="log" aria-live="polite"></div>
      <form class="term-row" autocomplete="off">
        <label class="term-prompt" for="termInput">an@portfolio:~$</label>
        <input class="term-input" id="termInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false">
      </form>
      <div class="term-chips"></div>`;
    container.appendChild(term);

    const body = $('.term-body', term);
    const input = $('.term-input', term);
    const form = $('.term-row', term);
    const chipsBox = $('.term-chips', term);
    const PROMPT = 'an@portfolio:~$';
    const L = (t, c = '') => ({ t, c });
    const bar = (n, w = 20) => { const f = Math.round((n / 100) * w); return '█'.repeat(f) + '░'.repeat(w - f); };
    const history = [];
    let hIdx = 0, chain = Promise.resolve(), touched = false;

    const SECTIONS = {
      home: 'home', 'trang-chu': 'home', about: 'about', 'gioi-thieu': 'about', goal: 'goal', 'muc-tieu': 'goal',
      skills: 'skills', 'ky-nang': 'skills', experience: 'experience', 'hoc-van': 'experience',
      projects: 'projects', 'du-an': 'projects', awards: 'awards', 'chung-chi': 'awards', contact: 'contact', 'lien-he': 'contact',
    };
    const scrollTo = (id) => { const t = document.getElementById(id); if (t) t.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); return !!t; };

    const cmds = {
      help: { d: 'Xem danh sách lệnh', run: () => [L('Các lệnh có sẵn:', 't-acc'),
        ...Object.entries(cmds).map(([k, v]) => `  ${k.padEnd(10)} ${v.d}`),
        L('Mẹo: Tab để hoàn thành lệnh · ↑/↓ xem lại lệnh · Ctrl+L xóa màn hình', 't-dim')] },
      whoami: { d: 'Tôi là ai?', run: () => [text($('h1')), L(text($('.about-card .role')), 't-acc'), text($('.hero-desc'))] },
      about: { d: 'Giới thiệu bản thân', run: () => [text($('.about-card p:not(.role)')), ...$$('.info-list li').map((li) => '• ' + text(li))] },
      goal: { d: 'Mục tiêu nghề nghiệp', run: () => $$('#goal p').map((p) => text(p)) },
      skills: { d: 'Mức độ kỹ năng', run: () => {
        const rows = $$('.skill').map((s) => {
          const lv = +s.dataset.level || 0;
          return `${text($('.skill-top span:first-child', s)).padEnd(24).slice(0, 24)} ${bar(lv)} ${lv}%`;
        });
        return [...rows, L('Công cụ: ' + $$('.tags li', $$('.skill-group').pop()).map(text).join(', '), 't-dim')];
      } },
      projects: { d: 'Danh sách dự án', run: () => [...$$('.project-card').map((c, i) =>
        `[${i + 1}] ${c.dataset.title}  (${c.dataset.category}) · ${c.dataset.tech}`), L('Dùng: open <số|tên> để xem chi tiết', 't-dim')] },
      open: { d: 'Mở chi tiết dự án: open 1', run: (args) => {
        const q = args.join(' ').toLowerCase();
        if (!q) return [L('Cú pháp: open <số|tên dự án>', 't-err')];
        const cards = $$('.project-card');
        const card = /^\d+$/.test(q) ? cards[+q - 1] : cards.find((c) => c.dataset.title.toLowerCase().includes(q));
        if (!card) return [L(`Không tìm thấy dự án "${q}".`, 't-err')];
        if (card.classList.contains('hide')) $('.filter-btn[data-filter="all"]')?.click();
        scrollTo('projects');
        setTimeout(() => $('.detail-btn', card).click(), reduceMotion ? 50 : 700);
        return [L(`Đang mở "${card.dataset.title}"...`, 't-ok')];
      } },
      filter: { d: 'Lọc dự án: filter web|python|java|all', run: (args) => {
        const b = $(`.filter-btn[data-filter="${(args[0] || '').toLowerCase()}"]`);
        if (!b) return [L('Cú pháp: filter <all|web|python|java>', 't-err')];
        b.click(); scrollTo('projects');
        return [L(`Đã lọc: ${b.textContent}`, 't-ok')];
      } },
      timeline: { d: 'Học vấn & kinh nghiệm', run: () => $$('.timeline-item').flatMap((it) =>
        [L(`${text($('time', it))} · ${text($('h3', it))}`, 't-acc'), L('   ' + text($('.meta', it)), 't-dim')]) },
      awards: { d: 'Chứng chỉ, giải thưởng, sở thích', run: () => $$('.award-card').flatMap((c) =>
        [L(text($('h3', c)), 't-acc'), ...$$('li', c).map((li) => '  - ' + text(li))]) },
      contact: { d: 'Thông tin liên hệ', run: () => [...$$('.contact-info li').map(text), L('Gõ goto contact để mở form.', 't-dim')] },
      goto: { d: 'Cuộn tới mục: goto skills', run: (args) => {
        const id = SECTIONS[(args[0] || '').toLowerCase()];
        if (!id) return [L('Các mục: ' + [...new Set(Object.values(SECTIONS))].join(', '), 't-err')];
        scrollTo(id);
        return [L(`→ ${id}`, 't-ok')];
      } },
      theme: { d: 'Đổi giao diện: theme dark|light', run: (args) => {
        const a = (args[0] || '').toLowerCase();
        const dark = a ? ['dark', 'cyberpunk', 'toi'].includes(a) : !isDark();
        if (a && !['dark', 'cyberpunk', 'toi', 'light', 'steampunk', 'sang'].includes(a)) return [L('Cú pháp: theme <dark|light>', 't-err')];
        setTheme(dark ? 'dark' : 'light');
        return [L(dark ? 'Cyberpunk online. ▓▒░' : 'Steampunk: hơi nước đã sẵn sàng. ⚙', 't-ok')];
      } },
      gears: { d: 'Tốc độ bánh răng: gears fast|slow|stop|reset', run: (args) => {
        if (!app.gears) return [L('Không tìm thấy canvas bánh răng.', 't-err')];
        const map = { fast: 3, slow: 0.4, stop: 0, reset: 1 };
        const a = (args[0] || '').toLowerCase();
        if (a in map) app.gears.speed = map[a];
        else if (a) return [L('Cú pháp: gears <fast|slow|stop|reset>', 't-err')];
        return [L(`Tốc độ bánh răng: x${app.gears.speed}` + (reduceMotion ? ' (hệ thống đang bật giảm chuyển động)' : ''), 't-ok')];
      } },
      date: { d: 'Ngày giờ hiện tại', run: () => [new Date().toLocaleString('vi-VN')] },
      echo: { d: 'In lại nội dung', run: (args) => [args.join(' ')] },
      history: { d: 'Các lệnh đã gõ', run: () => history.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`) },
      clear: { d: 'Xóa màn hình', run: () => { body.textContent = ''; return []; } },
      sudo: { d: '???', run: () => [L('an không có trong tệp sudoers. Sự việc này sẽ được báo cáo. 😏', 't-err')] },
    };
    const ALIAS = { ls: 'help', cd: 'goto', exp: 'timeline', experience: 'timeline', project: 'projects', skill: 'skills', cls: 'clear' };

    /* In ra màn hình */
    function addLine(item, instant) {
      const l = typeof item === 'string' ? L(item) : item;
      const div = document.createElement('div');
      div.className = 'term-line ' + l.c;
      div.textContent = l.t;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      return instant || reduceMotion ? null : sleep(18);
    }
    async function emit(lines, instant = false) { for (const l of lines) await addLine(l, instant); }

    function echoCommand(cmd) {
      const div = document.createElement('div');
      div.className = 'term-line';
      const p = document.createElement('span');
      p.className = 't-prompt'; p.textContent = PROMPT;
      div.append(p, document.createTextNode(cmd));
      body.appendChild(div);
    }

    async function run(raw) {
      const cmd = raw.trim();
      echoCommand(cmd);
      if (!cmd) return;
      const [first, ...args] = cmd.split(/\s+/);
      const name = ALIAS[first.toLowerCase()] || first.toLowerCase();
      const c = cmds[name];
      if (!c) { await emit([L(`${first}: không có lệnh này. Gõ "help" để xem danh sách.`, 't-err')]); return; }
      try { await emit(await c.run(args)); } catch (err) { await emit([L('Lỗi: ' + err.message, 't-err')]); }
    }
    function submit(cmd) {
      const v = cmd.trim();
      if (v && history[history.length - 1] !== v) history.push(v);
      hIdx = history.length;
      chain = chain.then(() => run(cmd));
      return chain;
    }

    /* Nhập liệu */
    form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; submit(v); });
    input.addEventListener('focus', () => { touched = true; });
    input.addEventListener('keydown', (e) => {
      touched = true;
      if (e.key === 'ArrowUp') { e.preventDefault(); if (hIdx > 0) input.value = history[--hIdx]; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); hIdx = Math.min(hIdx + 1, history.length); input.value = history[hIdx] || ''; }
      else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); body.textContent = ''; }
      else if (e.key === 'Tab') {
        e.preventDefault();
        const parts = input.value.split(/\s+/);
        const last = parts[parts.length - 1].toLowerCase();
        const arg = {
          goto: Object.keys(SECTIONS), cd: Object.keys(SECTIONS), theme: ['dark', 'light'],
          gears: ['fast', 'slow', 'stop', 'reset'], filter: ['all', 'web', 'python', 'java'],
        };
        const pool = parts.length === 1 ? [...Object.keys(cmds), ...Object.keys(ALIAS)] : arg[parts[0].toLowerCase()] || [];
        const hits = pool.filter((n) => n.startsWith(last));
        if (hits.length === 1) { parts[parts.length - 1] = hits[0]; input.value = parts.join(' ') + ' '; }
        else if (hits.length > 1) emit([L(hits.join('  '), 't-dim')], true);
      }
    });
    term.addEventListener('click', () => { if (!String(getSelection())) input.focus({ preventScroll: true }); });

    /* Nút gợi ý nhanh */
    ['help', 'whoami', 'skills', 'projects', 'timeline', 'contact', 'theme', 'gears fast'].forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'term-chip'; b.textContent = c;
      b.addEventListener('click', () => { touched = true; submit(c); });
      chipsBox.appendChild(b);
    });

    /* Lời chào + demo tự gõ khi cuộn tới */
    emit([L('Portfolio Terminal v1.0 — gõ "help" để bắt đầu.', 't-acc'),
      L('Thử: skills · projects · open 1 · theme · gears fast', 't-dim')], true);
    onVisible([term], async () => {
      if (touched || reduceMotion) return;
      input.readOnly = true;
      for (const ch of 'whoami') { input.value += ch; await sleep(90); }
      await sleep(250);
      input.readOnly = false;
      const v = input.value; input.value = '';
      submit(v);
    }, 0.6);
  }

  /* =====================================================================
     KHỞI TẠO
     ===================================================================== */
  function init() {
    injectStyles();
    initTheme();
    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();
    initTimeline();      // đăng ký trước để initNav gọi update() lần đầu
    initNav();
    initTyping();
    initCounters();
    initGearCanvas();
    initSkills();
    initProjects();
    initForm();
    initTerminal();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
