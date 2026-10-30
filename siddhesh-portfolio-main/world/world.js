/* ===================================================================
   world.js  ·  Connected 3D world for the portfolio
   - Everything from "Ideas into reality." onward is one Three.js scene.
   - The camera travels a path driven by scroll position.
   - All readable content stays in HTML. This file reads it (skills,
     pipeline stages, layers, journey) and mirrors it in 3D.
   - Three.js loads lazily, only when the visitor nears this section.
   - Without WebGL (or with "Flat view") the HTML works on its own.
   =================================================================== */
(() => {
  'use strict';

  const root = document.getElementById('world');
  if (!root) return;

  const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const THREE_LOCAL = 'world/vendor/three.min.js';

  const $ = (s, c = root) => c.querySelector(s);
  const $$ = (s, c = root) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const deskMQ = window.matchMedia('(min-width: 900px)');
  const isSmall = () => !deskMQ.matches;

  /* ==================================================================
     1. HTML-driven state (works with or without WebGL)
     ================================================================== */
  const hooks = { skill: null };
  const detail = { name: $('#skName'), meta: $('#skMeta'), note: $('#skNote') };
  const chips = $$('.chip');
  let selectedChip = null;

  function selectChip(btn, fromCanvas) {
    chips.forEach((c) => c.setAttribute('aria-pressed', c === btn ? 'true' : 'false'));
    selectedChip = btn;
    const tag = btn.dataset.tag === 'used' ? 'Used in my projects' : 'Studied in coursework';
    const group = btn.closest('.skill-group').dataset.group;
    detail.name.textContent = btn.textContent;
    detail.meta.textContent = group + ' · ' + tag;
    detail.note.textContent = btn.dataset.note;
    if (hooks.skill) hooks.skill(btn);
    if (fromCanvas && !deskMQ.matches) {
      /* on small screens keep the detail visible after tapping a node */
      detail.name.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  $$('.skill-group').forEach((g) => {
    g.style.setProperty('--gc', g.dataset.color);
    $$('.chip', g).forEach((b) => b.addEventListener('click', () => selectChip(b, false)));
  });

  /* ---- CI/CD pipeline player ---- */
  const stageBtns = $$('#pipeStages button');
  const stageCount = stageBtns.length;
  const pipeCaption = $('#pipeCaption');
  const playBtn = $('#pipePlay');
  const pipe = { t: 0, playing: false, active: -1, last: 0, timer: 0 };

  function setStage(i) {
    pipe.active = i;
    stageBtns.forEach((b, k) => {
      b.classList.toggle('is-active', k === i);
      if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    if (i >= 0 && pipeCaption) {
      const b = stageBtns[i];
      pipeCaption.textContent = 'Step ' + (i + 1) + ' of ' + stageCount + ': ' +
        $('strong', b).textContent + '. ' + $('span', b).textContent;
    }
  }
  function finishPipe() {
    pipe.playing = false;
    pipe.t = stageCount - 1;
    setStage(stageCount - 1);
    playBtn.textContent = 'Replay the pipeline';
  }
  function pipeTick(ts) {
    if (!pipe.playing) return;
    const dt = Math.min((ts - pipe.last) / 1000, 0.1);
    pipe.last = ts;
    pipe.t += dt / 1.2; /* about 1.2 seconds per stage */
    const idx = Math.floor(pipe.t + 0.02);
    if (idx !== pipe.active && idx < stageCount) setStage(idx);
    if (pipe.t >= stageCount - 1) { finishPipe(); return; }
    requestAnimationFrame(pipeTick);
  }
  function playPipe() {
    window.clearTimeout(pipe.timer);
    pipe.t = 0;
    pipe.playing = true;
    playBtn.textContent = 'Playing…';
    setStage(0);
    if (reduce) {
      /* reduced motion: step through without continuous movement */
      let i = 0;
      const step = () => {
        i++;
        pipe.t = i;
        if (i >= stageCount) { finishPipe(); return; }
        setStage(i);
        pipe.timer = window.setTimeout(step, 1400);
      };
      pipe.timer = window.setTimeout(step, 1400);
    } else {
      pipe.last = performance.now();
      requestAnimationFrame(pipeTick);
    }
  }
  if (playBtn) playBtn.addEventListener('click', playPipe);
  stageBtns.forEach((b, i) => b.addEventListener('click', () => {
    window.clearTimeout(pipe.timer);
    pipe.playing = false;
    pipe.t = i;
    setStage(i);
    if (playBtn) playBtn.textContent = 'Play the pipeline';
  }));

  /* ---- Layer stacks (data analysis + portfolio) ---- */
  const stackState = {};
  $$('.layer-list').forEach((list) => {
    const key = list.dataset.stack;
    const btns = $$('button', list);
    stackState[key] = { sel: -1, exploded: false, count: btns.length, btns };
    btns.forEach((b, i) => b.addEventListener('click', () => selectLayer(key, i)));
  });
  function selectLayer(key, i) {
    const st = stackState[key];
    st.sel = i;
    st.btns.forEach((b, k) => b.classList.toggle('is-active', k === i));
  }
  $$('[data-explode]').forEach((b) => b.addEventListener('click', () => {
    const st = stackState[b.dataset.explode];
    st.exploded = !st.exploded;
    b.setAttribute('aria-pressed', String(st.exploded));
    b.textContent = st.exploded ? 'Stack the layers' : 'Separate the layers';
  }));

  /* ---- Journey progress (scroll-driven, independent of WebGL) ---- */
  const journeySec = $('#journey');
  const journeyItems = $$('#journeyList li');
  const journey = { p: 0, active: -1 };
  function updateJourney() {
    if (!journeySec || !journeyItems.length) return;
    const r = journeySec.getBoundingClientRect();
    const vh = window.innerHeight;
    journey.p = clamp((vh * 0.55 - r.top) / Math.max(r.height - vh * 0.2, 1));
    const a = Math.min(journeyItems.length - 1, Math.floor(journey.p * journeyItems.length));
    if (a !== journey.active) {
      journey.active = a;
      journeyItems.forEach((li, k) => {
        li.classList.toggle('is-active', k === a);
        li.classList.toggle('is-passed', k < a);
      });
    }
  }

  /* ---- Rail visibility + flat view ---- */
  const rail = $('#worldRail');
  let inView = false;
  const flatBtn = $('#flatToggle');
  let flat = false;
  if (flatBtn) flatBtn.addEventListener('click', () => {
    flat = !flat;
    root.classList.toggle('world--flat', flat);
    flatBtn.setAttribute('aria-pressed', String(flat));
    flatBtn.textContent = flat ? '3D view' : 'Flat view';
    if (!flat && !three.ready && !three.loading) startThree();
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });

  let threeStarted = false;
  const three = { ready: false, loading: false };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === root) {
          inView = e.isIntersecting;
          if (rail) rail.classList.toggle('is-on', inView);
          if (inView) requestRender();
        }
      });
    }, { rootMargin: '0px', threshold: 0 });
    io.observe(root);

    /* Lazy-load Three.js shortly before the world scrolls into view */
    const io2 = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !threeStarted) { io2.disconnect(); startThree(); }
    }, { rootMargin: '0px 0px 1800px 0px' });
    io2.observe(root);
  } else {
    inView = true;
    startThree();
  }

  window.addEventListener('scroll', () => { updateJourney(); requestRender(); }, { passive: true });

  /* ==================================================================
     2. Loading Three.js (CDN first, local copy second, HTML-only last)
     ================================================================== */
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = res;
      s.onerror = () => rej(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }
  function webglAvailable() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  function fallback(reason) {
    root.dataset.state = 'static';
    root.dataset.reason = reason || '';
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }
  async function startThree() {
    if (threeStarted) return;
    threeStarted = true;
    if (!webglAvailable()) { fallback('no-webgl'); return; }
    three.loading = true;
    root.dataset.state = 'loading';
    try {
      if (!window.THREE) {
        try { await loadScript(THREE_CDN); } catch (e) { await loadScript(THREE_LOCAL); }
      }
      init3D(window.THREE);
      three.ready = true;
      root.dataset.state = 'ready';
    } catch (err) {
      console.warn('[world] 3D unavailable, showing the flat layout.', err);
      fallback('error');
    }
    three.loading = false;
  }

  /* ==================================================================
     3. The 3D world
     ================================================================== */
  let requestRender = () => {};

  function init3D(THREE) {
    const canvas = $('#worldCanvas');
    const small0 = isSmall();
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small0, alpha: false, powerPreference: 'high-performance' });
    let maxDpr = small0 ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    const BG = 0x02050d;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.FogExp2(BG, 0.011);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fallback('context-lost'); });

    const COL = { cyan: 0x38e8ff, blue: 0x4f8bff, violet: 0xa98bff, navy: 0x0a1530, white: 0xe8eefc };
    scene.add(new THREE.AmbientLight(0x3a4f80, 0.9));
    const key = new THREE.DirectionalLight(0x9fc2ff, 0.8); key.position.set(10, 20, 15); scene.add(key);

    /* ---- helpers ---- */
    function label(text, color, scale) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 128;
      const g = c.getContext('2d');
      g.font = '600 46px Inter, system-ui, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = color || '#e8eefc';
      g.fillText(text, 256, 64);
      const tex = new THREE.CanvasTexture(c);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
      const s = scale || 4;
      sp.scale.set(s, s / 4, 1);
      return sp;
    }
    function glowMat(color, intensity) {
      return new THREE.MeshStandardMaterial({ color: COL.navy, emissive: color, emissiveIntensity: intensity, roughness: 0.4, metalness: 0.5 });
    }
    function lineMat(color, opacity) {
      return new THREE.LineBasicMaterial({ color, transparent: true, opacity: opacity == null ? 0.5 : opacity });
    }

    /* ---- environment: floor grid, towers, particles ---- */
    const grid = new THREE.GridHelper(520, 130, 0x2b4a86, 0x15264a);
    grid.position.set(0, -9, -110);
    grid.material.transparent = true; grid.material.opacity = 0.55;
    scene.add(grid);

    const towerCount = small0 ? 70 : 150;
    const towerGeo = new THREE.BoxGeometry(1, 1, 1);
    const towers = new THREE.InstancedMesh(towerGeo, new THREE.MeshStandardMaterial({ color: 0x0b1630, roughness: 0.85, metalness: 0.3 }), towerCount);
    const strips = new THREE.InstancedMesh(towerGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), towerCount * 3);
    const dummy = new THREE.Object3D();
    const tmpC = new THREE.Color();
    const stripCols = [COL.cyan, COL.blue, COL.violet];
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < towerCount; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side * (26 + rnd() * 34);
      const z = 30 - rnd() * 290;
      const w = 3 + rnd() * 5, d = 3 + rnd() * 5, h = 6 + rnd() * 30;
      dummy.position.set(x, -9 + h / 2, z); dummy.scale.set(w, h, d); dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix(); towers.setMatrixAt(i, dummy.matrix);
      for (let k = 0; k < 3; k++) {
        const sy = -9 + h * (0.15 + rnd() * 0.75);
        dummy.position.set(x - side * (w / 2 + 0.02), sy, z); dummy.scale.set(0.06, 0.25 + rnd() * 0.5, d * 0.7);
        dummy.updateMatrix(); strips.setMatrixAt(i * 3 + k, dummy.matrix);
        strips.setColorAt(i * 3 + k, tmpC.setHex(stripCols[Math.floor(rnd() * 3)]));
      }
    }
    towers.instanceMatrix.needsUpdate = true; strips.instanceMatrix.needsUpdate = true;
    if (strips.instanceColor) strips.instanceColor.needsUpdate = true;
    scene.add(towers, strips);

    const pCount = small0 ? 500 : 1400;
    const pPos = new Float32Array(pCount * 3), pCol = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (rnd() - 0.5) * 90; pPos[i * 3 + 1] = -8 + rnd() * 26; pPos[i * 3 + 2] = 30 - rnd() * 270;
      tmpC.setHex(stripCols[Math.floor(rnd() * 3)]);
      pCol[i * 3] = tmpC.r; pCol[i * 3 + 1] = tmpC.g; pCol[i * 3 + 2] = tmpC.b;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(particles);

    /* ---- portal (gateway + contact) ---- */
    function makePortal(z, radius, rings) {
      const g = new THREE.Group(); g.position.set(0, 0, z);
      const list = [];
      for (let i = 0; i < rings; i++) {
        const m = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.12, 10, 72), new THREE.MeshBasicMaterial({ color: i % 2 ? COL.violet : COL.cyan, transparent: true, opacity: 0.85 - i * 0.1 }));
        m.position.z = -i * 5; g.add(m); list.push(m);
      }
      scene.add(g);
      return { g, list };
    }
    const gate = makePortal(0, 7, 4);
    const finale = makePortal(-232, 6.5, 3);
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 40, 8, 1, true), new THREE.MeshBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0.35 }));
    beacon.position.set(0, 11, -236); scene.add(beacon);

    /* ---- B · identity ---- */
    const ident = new THREE.Group(); ident.position.set(0, 0, -34); scene.add(ident);
    const idCore = new THREE.Mesh(new THREE.IcosahedronGeometry(3, 1), new THREE.MeshBasicMaterial({ color: COL.cyan, wireframe: true, transparent: true, opacity: 0.6 }));
    const idInner = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3), glowMat(COL.violet, 1.1));
    ident.add(idCore, idInner);
    const idRings = [0, 1, 2].map((i) => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(4.2 + i * 0.9, 0.04, 8, 90), new THREE.MeshBasicMaterial({ color: i === 1 ? COL.violet : COL.blue, transparent: true, opacity: 0.7 }));
      r.rotation.set(Math.PI / 2 + i * 0.5, i * 0.7, 0); ident.add(r); return r;
    });

    /* ---- C · skill universe ---- */
    const skillRoot = new THREE.Group(); skillRoot.position.set(0, 0, -62); scene.add(skillRoot);
    const skillSpin = new THREE.Group(); skillRoot.add(skillSpin);
    const skillNodes = [];
    const groups = $$('.skill-group');
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), new THREE.MeshBasicMaterial({ color: COL.white, wireframe: true, transparent: true, opacity: 0.5 }));
    skillSpin.add(core);
    groups.forEach((g, gi) => {
      const color = new THREE.Color(g.dataset.color);
      const ang = (gi / groups.length) * Math.PI * 2 + 0.4;
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14), new THREE.MeshStandardMaterial({ color: COL.navy, emissive: color, emissiveIntensity: 0.9 }));
      hub.position.set(Math.cos(ang) * 9, Math.sin(ang) * 6.5, (gi % 2 ? 2 : -2));
      skillSpin.add(hub);
      const tag = label(g.dataset.group, g.dataset.color, 5.2); tag.position.copy(hub.position).add(new THREE.Vector3(0, 1.35, 0)); skillSpin.add(tag);
      const spoke = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), hub.position.clone()]);
      skillSpin.add(new THREE.Line(spoke, lineMat(color, 0.25)));
      const btns = $$('.chip', g), k = btns.length, pts = [];
      btns.forEach((btn, j) => {
        const y = 1 - ((j + 0.5) / k) * 2, r = Math.sqrt(1 - y * y), phi = j * 2.39996;
        const p = new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r).multiplyScalar(3.1).add(hub.position);
        const used = btn.dataset.tag === 'used';
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshStandardMaterial({ color: used ? color : COL.navy, emissive: color, emissiveIntensity: used ? 0.7 : 0.15, wireframe: !used, roughness: 0.4 }));
        m.position.copy(p); skillSpin.add(m);
        pts.push(hub.position.clone(), p);
        skillNodes.push({ mesh: m, btn, hover: false, sel: false, s: 1 });
      });
      skillSpin.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat(color, 0.35)));
    });
    hooks.skill = (btn) => skillNodes.forEach((n) => { n.sel = n.btn === btn; });
    /* hub ring links */
    skillSpin.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(groups.map((g, gi) => {
      const a = (gi / groups.length) * Math.PI * 2 + 0.4; return new THREE.Vector3(Math.cos(a) * 9, Math.sin(a) * 6.5, gi % 2 ? 2 : -2);
    })), lineMat(COL.blue, 0.2)));

    /* ---- D1 · CI/CD pipeline ---- */
    const pipeRoot = new THREE.Group(); pipeRoot.position.set(0, 0, -92); scene.add(pipeRoot);
    const pipeGeos = [new THREE.DodecahedronGeometry(0.8), new THREE.TorusGeometry(0.6, 0.2, 12, 24), new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.BoxGeometry(1.4, 0.9, 0.9), new THREE.SphereGeometry(0.75, 20, 14), new THREE.OctahedronGeometry(0.85)];
    const pipeNodes = stageBtns.map((b, i) => {
      const m = new THREE.Mesh(pipeGeos[i % pipeGeos.length], glowMat(i === stageCount - 1 ? COL.violet : COL.cyan, 0.25));
      const l = label($('strong', b).textContent, '#e8eefc', 4.4); l.position.set(0, -1.5, 0); m.add(l);
      pipeRoot.add(m); return m;
    });
    /* final stage shows two pods and a service ring */
    const podGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    [-0.55, 0.55].forEach((x) => { const p = new THREE.Mesh(podGeo, new THREE.MeshBasicMaterial({ color: COL.white })); p.position.set(x, 1.3, 0); pipeNodes[stageCount - 1].add(p); });
    const svc = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.04, 8, 48), new THREE.MeshBasicMaterial({ color: COL.violet })); pipeNodes[stageCount - 1].add(svc);
    const pipeLineGeo = new THREE.BufferGeometry();
    pipeLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(stageCount * 3), 3));
    pipeRoot.add(new THREE.Line(pipeLineGeo, lineMat(COL.blue, 0.7)));
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    pipeRoot.add(pulse);
    function layoutPipe() {
      const sm = isSmall(), arr = pipeLineGeo.attributes.position.array;
      pipeNodes.forEach((n, i) => {
        if (sm) { const row = i < 3 ? 0 : 1, col = i < 3 ? i : i - 3; n.position.set((col - 1) * 4, row ? -1.8 : 1.8, 0); }
        else n.position.set((i - (stageCount - 1) / 2) * 3.0, Math.sin(i * 0.9) * 0.5, 0);
        arr[i * 3] = n.position.x; arr[i * 3 + 1] = n.position.y; arr[i * 3 + 2] = 0;
      });
      pipeLineGeo.attributes.position.needsUpdate = true;
    }

    /* ---- D2 / D3 · layer stacks ---- */
    function makeStack(key, z, shape, color, withDots) {
      const st = stackState[key]; if (!st) return null;
      const g = new THREE.Group(); g.position.set(0, 0, z); g.rotation.x = 0.3; scene.add(g);
      const layers = st.btns.map((b, i) => {
        const lg = new THREE.Group();
        const geo = shape === 'disc' ? new THREE.CylinderGeometry(3.2, 3.2, 0.1, 44) : new THREE.BoxGeometry(6.2, 0.1, 3.9);
        const mat = new THREE.MeshStandardMaterial({ color: COL.navy, emissive: color, emissiveIntensity: 0.18, transparent: true, opacity: 0.5, roughness: 0.3, metalness: 0.4 });
        const plate = new THREE.Mesh(geo, mat); lg.add(plate);
        lg.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat(color, 0.9)));
        if (withDots) {
          const n = 26, pp = new Float32Array(n * 3), cc = new Float32Array(n * 3);
          for (let k = 0; k < n; k++) {
            const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 2.7, cls = rnd() > 0.5;
            pp[k * 3] = Math.cos(a) * r; pp[k * 3 + 1] = 0.12; pp[k * 3 + 2] = Math.sin(a) * r;
            tmpC.setHex(cls ? COL.cyan : COL.violet); cc[k * 3] = tmpC.r; cc[k * 3 + 1] = tmpC.g; cc[k * 3 + 2] = tmpC.b;
          }
          const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); dg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
          lg.add(new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.16, vertexColors: true })));
        }
        const l = label($('strong', b).textContent, '#e8eefc', 4); l.position.set(shape === 'disc' ? 5.4 : 5.6, 0.1, 0); lg.add(l);
        g.add(lg);
        return { lg, plate, mat };
      });
      return { key, g, layers, gap: 0.8, count: layers.length };
    }
    const stacks = [makeStack('data', -120, 'disc', COL.cyan, true), makeStack('site', -148, 'box', COL.violet, false)].filter(Boolean);

    /* ---- E · journey path ---- */
    const jRoot = new THREE.Group(); scene.add(jRoot);
    const jCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-13, -2, -178), new THREE.Vector3(-6, 0, -181), new THREE.Vector3(1, 1, -186),
      new THREE.Vector3(8, 0, -191), new THREE.Vector3(11, -1, -197), new THREE.Vector3(4, 1, -202), new THREE.Vector3(-5, 0, -205), new THREE.Vector3(-12, -1, -209)
    ]);
    jRoot.add(new THREE.Mesh(new THREE.TubeGeometry(jCurve, 160, 0.09, 8, false), new THREE.MeshBasicMaterial({ color: COL.blue, transparent: true, opacity: 0.45 })));
    const jNodes = journeyItems.map((li, i) => {
      const t = journeyItems.length > 1 ? i / (journeyItems.length - 1) : 0;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 12), glowMat(COL.cyan, 0.2)); m.position.copy(jCurve.getPoint(t)); jRoot.add(m);
      return { m, t };
    });
    const jMarker = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); jRoot.add(jMarker);

    /* ==============================================================
       Camera path: one keyframe per scene, blended by scroll position
       ============================================================== */
    const KF = [
      { id: 'gateway', c: [0, 0, -6], dist: 26, nopan: true, tilt: 0.04 },
      { id: 'identity', c: [0, 0, -34], w: 12, h: 12, tilt: 0.12 },
      { id: 'skill-universe', c: [0, 0, -62], w: 27, h: 22, tilt: 0.1 },
      { id: 'proj-pipeline', c: [0, 0, -92], w: 16, h: 6, hs: 9, ws: 11, tilt: 0.1 },
      { id: 'proj-data', c: [0, 0, -120], w: 11, h: 9, tilt: 0.2 },
      { id: 'proj-site', c: [0, 0, -148], w: 11, h: 8, tilt: 0.2 },
      { id: 'journey', c: [0, 0, -193], w: 30, h: 14, dist: 36, tilt: 0.7 },
      { id: 'contact', c: [0, 0, -232], w: 16, h: 16, tilt: 0.06 }
    ].map((k) => ({ ...k, el: document.getElementById(k.id) })).filter((k) => k.el);

    const tanH = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    function frameFor(k) {
      const d = deskMQ.matches, a = camera.aspect, th = tanH();
      const w = (!d && k.ws) || k.w || 10, h = (!d && k.hs) || k.h || 10;
      let dist = k.dist || Math.max(w / (2 * th * a * (d ? 0.55 : 0.92)), h / (2 * th * (d ? 0.85 : 0.42))) * 1.15;
      dist = Math.max(dist, 9);
      const panX = k.nopan || !d ? 0 : dist * th * a * 0.4;
      const panY = k.nopan || d ? 0 : dist * th * 0.45;
      const look = new THREE.Vector3(k.c[0] - panX, k.c[1] - panY, k.c[2]);
      const pos = new THREE.Vector3(look.x, look.y + dist * k.tilt, k.c[2] + dist);
      return { pos, look };
    }
    let frames = [];
    const camPos = new THREE.Vector3(0, 1, 24), camLook = new THREE.Vector3(0, 0, 0);
    let camInit = false;

    function sceneProgress() {
      const vh = window.innerHeight, y = window.scrollY;
      const anchors = KF.map((k) => { const r = k.el.getBoundingClientRect(); return y + r.top + r.height / 2 - vh / 2; });
      if (y <= anchors[0]) return { i: 0, u: 0, near: 0 };
      for (let i = 0; i < anchors.length - 1; i++) {
        if (y < anchors[i + 1]) {
          const raw = (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
          return { i, u: smooth(clamp((raw - 0.25) / 0.5)), near: raw < 0.5 ? i : i + 1 };
        }
      }
      return { i: anchors.length - 1, u: 0, near: anchors.length - 1 };
    }

    /* ==============================================================
       Pointer picking (canvas receives events; panels block them)
       ============================================================== */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const tip = $('#worldTip');
    const pointer = { x: 0, y: 0, px: 0, py: 0, has: false, dirty: false };
    let hovered = null;

    function pickables(sceneId) {
      if (sceneId === 'skill-universe') return skillNodes.map((n) => ({ obj: n.mesh, kind: 'skill', ref: n }));
      if (sceneId === 'proj-pipeline') return pipeNodes.map((m, i) => ({ obj: m, kind: 'stage', ref: i }));
      const st = stacks.find((s) => 'proj-' + s.key === sceneId);
      if (st) return st.layers.map((l, i) => ({ obj: l.plate, kind: 'layer', ref: { key: st.key, i } }));
      return [];
    }
    function pick(cx, cy, sceneId) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const list = pickables(sceneId);
      const hits = ray.intersectObjects(list.map((p) => p.obj), false);
      return hits.length ? list.find((p) => p.obj === hits[0].object) : null;
    }
    function tipFor(h) {
      if (!h) return null;
      if (h.kind === 'skill') return h.ref.btn.textContent;
      if (h.kind === 'stage') return $('strong', stageBtns[h.ref]).textContent;
      return $('strong', stackState[h.ref.key].btns[h.ref.i]).textContent;
    }
    canvas.addEventListener('pointermove', (e) => {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.has = true; pointer.dirty = true;
      pointer.px = (e.clientX / window.innerWidth - 0.5) * 2; pointer.py = (e.clientY / window.innerHeight - 0.5) * 2;
      requestRender();
    });
    canvas.addEventListener('pointerleave', () => { pointer.has = false; pointer.dirty = true; requestRender(); });
    canvas.addEventListener('click', (e) => {
      const sp = sceneProgress(), id = KF[sp.near].id;
      const h = pick(e.clientX, e.clientY, id);
      if (!h) return;
      if (h.kind === 'skill') selectChip(h.ref.btn, true);
      else if (h.kind === 'stage') { window.clearTimeout(pipe.timer); pipe.playing = false; pipe.t = h.ref; setStage(h.ref); if (playBtn) playBtn.textContent = 'Play the pipeline'; }
      else selectLayer(h.ref.key, h.ref.i);
    });

    /* ==============================================================
       Sizing, render loop, performance guard
       ============================================================== */
    function resize() {
      const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      layoutPipe();
      frames = KF.map(frameFor);
      requestRender();
    }
    window.addEventListener('resize', resize);
    if (window.ScrollTrigger) window.ScrollTrigger.addEventListener('refresh', () => requestRender());
    resize();

    let raf = 0, last = performance.now(), time = 0, slow = 0, dirty = true;
    requestRender = () => { dirty = true; if (!raf && inView && !flat && !document.hidden) raf = requestAnimationFrame(loop); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) requestRender(); });

    function loop(now) {
      raf = 0;
      if (!inView || flat || document.hidden) return;
      const dt = Math.min((now - last) / 1000, 0.1); last = now;
      if (!reduce) time += dt;

      /* performance guard: if frames stay slow, lower resolution once */
      if (!reduce) {
        slow = dt > 0.04 ? slow + 1 : Math.max(0, slow - 1);
        if (slow > 90 && maxDpr > 1) { maxDpr = 1; renderer.setPixelRatio(1); renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); slow = 0; }
      }

      /* camera */
      const sp = sceneProgress();
      const A = frames[sp.i], B = frames[Math.min(sp.i + 1, frames.length - 1)];
      const tp = A.pos.clone().lerp(B.pos, sp.u), tl = A.look.clone().lerp(B.look, sp.u);
      if (!camInit || reduce) { camPos.copy(tp); camLook.copy(tl); camInit = true; }
      else { const k = 1 - Math.exp(-dt * 5); camPos.lerp(tp, k); camLook.lerp(tl, k); }
      camera.position.copy(camPos);
      if (!reduce && pointer.has) { camera.position.x += pointer.px * 0.9; camera.position.y -= pointer.py * 0.5; }
      camera.lookAt(camLook);

      /* ambient motion */
      if (!reduce) {
        gate.list.forEach((r, i) => { r.rotation.z += dt * (0.12 + i * 0.05) * (i % 2 ? -1 : 1); });
        finale.list.forEach((r, i) => { r.rotation.z += dt * (0.1 + i * 0.06) * (i % 2 ? -1 : 1); });
        idCore.rotation.y += dt * 0.25; idInner.rotation.x += dt * 0.5;
        idRings.forEach((r, i) => { r.rotation.z += dt * (0.2 + i * 0.1); });
        skillSpin.rotation.y += dt * 0.06;
        particles.position.y = Math.sin(time * 0.3) * 0.4;
        beacon.material.opacity = 0.28 + Math.sin(time * 1.6) * 0.08;
        stacks.forEach((s) => { s.g.rotation.y += dt * 0.25; });
      }

      /* hover + skill node feedback */
      const near = KF[sp.near].id;
      if (pointer.dirty) {
        pointer.dirty = false;
        hovered = pointer.has ? pick(pointer.x, pointer.y, near) : null;
        canvas.style.cursor = hovered ? 'pointer' : '';
        const t = tipFor(hovered);
        if (t) { tip.textContent = t; tip.hidden = false; } else tip.hidden = true;
      }
      if (hovered && !tip.hidden) { tip.style.left = pointer.x + 'px'; tip.style.top = pointer.y + 'px'; }
      skillNodes.forEach((n) => {
        const target = n.sel ? 2 : (hovered && hovered.ref === n ? 1.6 : 1);
        n.s += (target - n.s) * Math.min(1, dt * 10);
        n.mesh.scale.setScalar(n.s);
        n.mesh.material.emissiveIntensity = n.sel ? 1.4 : (n.btn.dataset.tag === 'used' ? 0.7 : 0.15) + (n.s > 1.05 ? 0.4 : 0);
      });

      /* pipeline */
      const pt = pipe.t, pi = Math.min(Math.floor(pt), stageCount - 1), pf = pt - pi;
      pipeNodes.forEach((n, i) => {
        const on = i === pipe.active || (hovered && hovered.kind === 'stage' && hovered.ref === i);
        n.material.emissiveIntensity += ((on ? 1.5 : 0.25) - n.material.emissiveIntensity) * Math.min(1, dt * 8);
        n.scale.setScalar(1 + (on ? 0.25 : 0));
        if (!reduce) n.rotation.y += dt * 0.5;
      });
      const a = pipeNodes[pi].position, b = pipeNodes[Math.min(pi + 1, stageCount - 1)].position;
      pulse.position.lerpVectors(a, b, reduce ? 0 : smooth(clamp(pf)));
      pulse.visible = pipe.playing || pipe.active >= 0;

      /* layer stacks */
      stacks.forEach((s) => {
        const st = stackState[s.key];
        const target = st.exploded ? 1.9 : 0.8;
        s.gap += (target - s.gap) * (reduce ? 1 : Math.min(1, dt * 5));
        s.layers.forEach((l, i) => {
          l.lg.position.y = (i - (s.count - 1) / 2) * s.gap;
          const on = st.sel === i || (hovered && hovered.kind === 'layer' && hovered.ref.key === s.key && hovered.ref.i === i);
          l.mat.emissiveIntensity += ((on ? 0.9 : 0.18) - l.mat.emissiveIntensity) * Math.min(1, dt * 8);
          l.mat.opacity = on ? 0.75 : 0.5;
        });
      });

      /* journey */
      const jt = clamp(journey.p);
      jMarker.position.copy(jCurve.getPoint(jt));
      jNodes.forEach((n, i) => {
        const lit = i <= journey.active;
        n.m.material.emissiveIntensity += ((lit ? 1.2 : 0.2) - n.m.material.emissiveIntensity) * Math.min(1, dt * 6);
      });

      renderer.render(scene, camera);
      dirty = false;

      /* keep animating while visible, unless reduced motion (render only on input) */
      if (!reduce || pipe.playing) raf = requestAnimationFrame(loop);
    }

    updateJourney();
    requestRender();
  }
})();
