'use strict';

(() => {
  // ============================================================
  // KAR PROJECTS HUB
  // Compatible avec l'index.html fourni
  // ============================================================

  // ---------- HELPERS ----------
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, value));

  const lerp = (a, b, amount) =>
    a + (b - a) * amount;

  const easeOutCubic = t =>
    1 - Math.pow(1 - t, 3);

  const norm = value =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const pad = value =>
    String(value).padStart(2, '0');

  const reduce =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const coarse =
    window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const mobile =
    coarse || window.innerWidth < 760;

  const wait = ms =>
    new Promise(resolve => {
      const factor = reduce ? 0.15 : S.skip ? 0.08 : 1;
      setTimeout(resolve, ms * factor);
    });

  // ---------- STATE ----------
  const S = {
    entered: false,
    skip: false,

    section: 'hero',

    warp: 0,

    tx: 0,
    ty: 0,

    mx: 0,
    my: 0,

    px: 0,
    py: 0,

    camZ: 8,
    camLerp: 0.004,

    grid: 0,
    wire: 0,
    partT: 0,

    chapter: -1,
    busy: false,
    finalBusy: false,

    repos: 5,
    years: 2
  };

  // ============================================================
  // PROJECT DATA
  // ============================================================

  const GH_USER = 'anormadaise2-ops';

  // KAR AI + KAR Vault exclus
  const EXCLUDED = new Set([
    'karai',
    'karvault'
  ]);

  const TECH = [
    'HTML5',
    'CSS3',
    'JavaScript',
    'Three.js',
    'Python',
    'Flask',
    'Electron',
    'GitHub',
    'Web Audio'
  ];

  const PROJECTS = [
    {
      name: 'KAR INSTALLER',
      status: 'LIVE',
      repo: 'KAR-Installer',
      url: 'https://anormadaise2-ops.github.io/KAR-Installer/',
      description:
        'A modern installation platform. Guided, fast and clean — set up the KAR ecosystem in a few steps.'
    },

    {
      name: 'KAR OSINT',
      status: 'LIVE',
      repo: 'KAR-OSINT-complet',
      url: 'https://anormadaise2-ops.github.io/KAR-OSINT-complet/',
      description:
        'An organised workspace for open-source intelligence tools, built for clarity and speed.'
    },

    {
      name: 'HUBBOOST',
      status: 'LIVE',
      repo: 'HUBBOOST',
      url: 'https://anormadaise2-ops.github.io/HUBBOOST/',
      description:
        'A lightweight hub designed to boost everyday workflows with a fast, focused interface.'
    },

    {
      name: 'KAR BROWSER',
      status: 'IN DEVELOPMENT',
      repo: 'KAR-Browser',
      url: 'https://github.com/anormadaise2-ops/KAR-Browser',
      description:
        'A desktop browser built with Electron and Three.js: cinematic intro, tabs, protection and a living animated background.'
    },

    {
      name: 'KAR STORE',
      status: 'IN DEVELOPMENT',
      repo: 'KAR-STORE',
      url: 'https://github.com/anormadaise2-ops/KAR-STORE',
      description:
        'A single destination for every KAR creation. Currently in development.'
    }
  ].filter(project =>
    !EXCLUDED.has(norm(project.name)) &&
    !EXCLUDED.has(norm(project.repo))
  );

  // ============================================================
  // AUDIO SYSTEM
  // ============================================================

  const MUSIC_SRC =
    'assets/audio/background.mp3';

  const SFX_SRC = {
    click: 'assets/audio/click.mp3',
    hover: 'assets/audio/hover.mp3',
    open: 'assets/audio/open.mp3',
    transition: 'assets/audio/transition.mp3',
    boot: 'assets/audio/boot.mp3'
  };

  const MUSIC_MUL = {
    INTRO: 0.72,
    HERO: 1,
    PROJECTS: 0.9,
    ABOUT: 0.9,
    SOUND: 1,
    CREDITS: 0.8,
    EMOTIONAL: 1.1,
    FINAL: 1.05
  };

  const soundManager = {

    musicEnabled: false,
    sfxEnabled: true,

    musicVolume: 0.28,
    sfxVolume: 0.5,

    musicState: 'INTRO',

    duck: 1,

    music: null,

    currentVolume: 0,

    missing: new Set(),

    cache: {},

    lastHover: 0,

    initialized: false,

    // ----------------------------------------------------------
    // MUSIC
    // ----------------------------------------------------------

    initMusic() {
      if (this.music) {
        return;
      }

      try {
        const existing = $('#backgroundMusic');

        if (existing) {
          this.music = existing;
        } else {
          this.music = new Audio(MUSIC_SRC);
        }

        this.music.loop = true;
        this.music.preload = 'auto';
        this.music.volume = 0;

        this.music.addEventListener(
          'error',
          () => {
            console.warn(
              '[KAR] background.mp3 introuvable ou illisible.'
            );

            this.missing.add('music');
          },
          { once: true }
        );

        // Charge immédiatement le fichier.
        try {
          this.music.load();
        } catch (_) {}

        this.initialized = true;

      } catch (error) {
        console.warn(
          '[KAR] Impossible d initialiser la musique.',
          error
        );
      }
    },

    async enableMusic() {
      this.musicEnabled = true;

      this.initMusic();

      if (
        this.music &&
        !this.missing.has('music')
      ) {
        try {
          await this.music.play();
        } catch (error) {
          /*
           * Chrome/Edge peuvent bloquer l'autoplay.
           * Le prochain clic utilisateur relancera play().
           */
          console.warn(
            '[KAR] Autoplay audio bloque par le navigateur.'
          );
        }
      }

      this.updateUI();
    },

    disableMusic() {
      this.musicEnabled = false;
      this.updateUI();
    },

    toggleMusic() {
      if (this.musicEnabled) {
        this.disableMusic();
      } else {
        this.enableMusic();
      }
    },

    async fadeMusicIn() {
      return this.enableMusic();
    },

    fadeMusicOut() {
      this.disableMusic();
    },

    setMusicVolume(value) {
      this.musicVolume =
        clamp(Number(value) || 0, 0, 0.5);
    },

    // ----------------------------------------------------------
    // SFX
    // ----------------------------------------------------------

    enableSFX() {
      this.sfxEnabled = true;
      this.updateUI();
    },

    disableSFX() {
      this.sfxEnabled = false;
      this.updateUI();
    },

    toggleSFX() {
      if (this.sfxEnabled) {
        this.disableSFX();
      } else {
        this.enableSFX();
      }
    },

    setSFXVolume(value) {
      this.sfxVolume =
        clamp(Number(value) || 0, 0, 1);
    },

    preloadSFX() {
      Object.entries(SFX_SRC).forEach(
        ([name, source]) => {

          if (this.cache[name]) {
            return;
          }

          try {
            const audio = new Audio(source);

            audio.preload = 'auto';

            audio.addEventListener(
              'error',
              () => {
                console.warn(
                  '[KAR] SFX introuvable:',
                  source
                );

                this.missing.add(name);
              },
              { once: true }
            );

            this.cache[name] = audio;

          } catch (error) {
            console.warn(
              '[KAR] Audio SFX indisponible.',
              error
            );
          }
        }
      );
    },

    playSFX(name) {
      if (!this.sfxEnabled) {
        return;
      }

      if (!SFX_SRC[name]) {
        return;
      }

      if (this.missing.has(name)) {
        return;
      }

      if (
        name === 'hover'
      ) {
        const now = performance.now();

        if (
          now - this.lastHover < 100
        ) {
          return;
        }

        this.lastHover = now;
      }

      try {

        if (!this.cache[name]) {
          this.preloadSFX();
        }

        const base = this.cache[name];

        if (!base) {
          return;
        }

        const audio = base.cloneNode(true);

        audio.volume =
          clamp(this.sfxVolume, 0, 1);

        const promise = audio.play();

        if (
          promise &&
          typeof promise.catch === 'function'
        ) {
          promise.catch(() => {});
        }

      } catch (_) {}
    },

    // ----------------------------------------------------------
    // MUSIC TARGET
    // ----------------------------------------------------------

    get target() {

      if (!this.musicEnabled) {
        return 0;
      }

      const multiplier =
        MUSIC_MUL[this.musicState] || 1;

      return clamp(
        this.musicVolume *
        multiplier *
        this.duck,
        0,
        1
      );
    },

    // ----------------------------------------------------------
    // AUDIO TICK
    // ----------------------------------------------------------

    tick() {

      if (!this.music) {
        return;
      }

      this.currentVolume =
        lerp(
          this.currentVolume,
          this.target,
          0.035
        );

      this.music.volume =
        clamp(
          this.currentVolume,
          0,
          1
        );

      if (
        !this.musicEnabled &&
        this.currentVolume < 0.002 &&
        !this.music.paused
      ) {
        this.music.pause();
      }
    },

    // ----------------------------------------------------------
    // UI
    // ----------------------------------------------------------

    updateUI() {

      const musicOn =
        this.musicEnabled;

      const sfxOn =
        this.sfxEnabled;

      const navSound =
        $('#navSound');

      const btnMusic =
        $('#btnMusic');

      const btnSfx =
        $('#btnSfx');

      const immersion =
        $('#immersion');

      if (navSound) {
        navSound.textContent =
          musicOn
            ? 'SOUND ON'
            : 'SOUND OFF';

        navSound.setAttribute(
          'aria-pressed',
          String(musicOn)
        );
      }

      if (btnMusic) {
        btnMusic.textContent =
          musicOn ? 'ON' : 'OFF';

        btnMusic.setAttribute(
          'aria-pressed',
          String(musicOn)
        );
      }

      if (btnSfx) {
        btnSfx.textContent =
          sfxOn ? 'ON' : 'OFF';

        btnSfx.setAttribute(
          'aria-pressed',
          String(sfxOn)
        );
      }

      if (immersion) {
        immersion.textContent =
          musicOn || sfxOn
            ? 'IMMERSION ON.'
            : 'IMMERSION OFF.';
      }
    }
  };

  // Prépare immédiatement la musique.
  // La lecture réelle sera autorisée dès que le navigateur le permet.
  soundManager.initMusic();

  // ============================================================
  // THREE.JS
  // ============================================================

  let renderer = null;
  let scene = null;
  let camera = null;

  let pts = null;
  let posArr = null;
  let colArr = null;
  let speeds = null;
  let phases = null;

  let grid = null;
  let grid2 = null;

  let wire = null;
  let wire2 = null;

  let lastFov = 60;
  let N = 0;

  function initThree() {

    if (
      typeof THREE === 'undefined'
    ) {
      console.warn(
        '[KAR] Three.js non charge.'
      );

      return;
    }

    const canvas =
      $('#gl');

    if (!canvas) {
      console.warn(
        '[KAR] Canvas #gl introuvable.'
      );

      return;
    }

    try {

      renderer =
        new THREE.WebGLRenderer({
          canvas,
          antialias: !mobile,
          alpha: true,
          powerPreference: 'high-performance'
        });

    } catch (error) {

      console.warn(
        '[KAR] WebGL indisponible.',
        error
      );

      renderer = null;

      return;
    }

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        2
      )
    );

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

    scene =
      new THREE.Scene();

    scene.fog =
      new THREE.FogExp2(
        0x050505,
        0.03
      );

    camera =
      new THREE.PerspectiveCamera(
        60,
        window.innerWidth /
          window.innerHeight,
        0.1,
        300
      );

    camera.position.set(
      0,
      0,
      20
    );

    // Particules
    N =
      mobile
        ? 600
        : 1100;

    posArr =
      new Float32Array(
        N * 3
      );

    colArr =
      new Float32Array(
        N * 3
      );

    speeds =
      new Float32Array(N);

    phases =
      new Float32Array(N);

    for (
      let i = 0;
      i < N;
      i++
    ) {

      posArr[i * 3] =
        (Math.random() - 0.5) *
        80;

      posArr[i * 3 + 1] =
        (Math.random() - 0.5) *
        50;

      posArr[i * 3 + 2] =
        -80 +
        Math.random() * 100;

      speeds[i] =
        0.3 +
        Math.random() * 1.8;

      phases[i] =
        Math.random() *
        Math.PI *
        2;
    }

    const geometry =
      new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        posArr,
        3
      )
    );

    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(
        colArr,
        3
      )
    );

    pts =
      new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          size:
            mobile
              ? 0.14
              : 0.1,

          vertexColors: true,
          transparent: true,
          depthWrite: false,

          blending:
            THREE.AdditiveBlending
        })
      );

    scene.add(pts);

    // Grilles
    const createGrid = y => {

      const helper =
        new THREE.GridHelper(
          240,
          80,
          0xffffff,
          0xffffff
        );

      helper.material.transparent =
        true;

      helper.material.opacity =
        0;

      helper.position.y =
        y;

      scene.add(helper);

      return helper;
    };

    grid =
      createGrid(-9);

    grid2 =
      createGrid(14);

    // Wireframes
    const createWireMaterial = () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0
      });

    wire =
      new THREE.Mesh(
        new THREE.IcosahedronGeometry(
          2.6,
          mobile ? 0 : 1
        ),
        createWireMaterial()
      );

    wire2 =
      new THREE.Mesh(
        new THREE.IcosahedronGeometry(
          1.4,
          0
        ),
        createWireMaterial()
      );

    wire.position.z = -2;
    wire2.position.z = -2;

    scene.add(
      wire,
      wire2
    );
  }

  function onResize() {

    if (
      !renderer ||
      !camera
    ) {
      return;
    }

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

    camera.aspect =
      window.innerWidth /
      window.innerHeight;

    camera.updateProjectionMatrix();
  }

  function renderThree(
    dt,
    time
  ) {

    if (
      !renderer ||
      !scene ||
      !camera ||
      !pts
    ) {
      return;
    }

    const boost =
      1 +
      S.warp * 30;

    for (
      let i = 0;
      i < N;
      i++
    ) {

      let z =
        posArr[i * 3 + 2] +
        speeds[i] *
        boost *
        dt;

      if (z > 20) {
        z -= 100;
      }

      posArr[i * 3 + 2] =
        z;

      const c =
        (
          0.3 +
          0.7 *
          (
            0.5 +
            0.5 *
            Math.sin(
              time *
              speeds[i] *
              0.6 +
              phases[i]
            )
          )
        ) *
        S.partT;

      colArr[i * 3] = c;
      colArr[i * 3 + 1] = c;
      colArr[i * 3 + 2] = c;
    }

    pts.geometry
      .attributes
      .position
      .needsUpdate = true;

    pts.geometry
      .attributes
      .color
      .needsUpdate = true;

    pts.rotation.y =
      time * 0.01 +
      S.mx * 0.08;

    pts.rotation.x =
      S.my * 0.04;

    if (grid && grid2) {

      const offset =
        (
          time *
          2.2 *
          (1 + S.warp * 8)
        ) % 3;

      grid.position.z =
        offset;

      grid2.position.z =
        offset;

      grid.material.opacity =
        lerp(
          grid.material.opacity,
          S.grid,
          0.03
        );

      grid2.material.opacity =
        lerp(
          grid2.material.opacity,
          S.grid * 0.6,
          0.03
        );
    }

    if (wire && wire2) {

      const spin =
        0.15 +
        S.warp * 6;

      wire.rotation.y +=
        dt * spin;

      wire.rotation.x +=
        dt * 0.07;

      wire2.rotation.y -=
        dt * spin * 1.3;

      wire2.rotation.z +=
        dt * 0.05;

      wire.position.x =
        S.mx * 0.5;

      wire.position.y =
        -S.my * 0.3 -
        window.scrollY * 0.0004;

      wire.material.opacity =
        lerp(
          wire.material.opacity,
          S.wire,
          0.03
        );

      wire2.material.opacity =
        lerp(
          wire2.material.opacity,
          S.wire * 1.4,
          0.03
        );
    }

    camera.position.z =
      lerp(
        camera.position.z,
        S.camZ - S.warp * 7,
        S.camLerp
      );

    camera.position.x =
      lerp(
        camera.position.x,
        S.mx * 1.6,
        0.05
      );

    camera.position.y =
      lerp(
        camera.position.y,
        -S.my -
        window.scrollY * 0.0007,
        0.05
      );

    camera.lookAt(
      0,
      0,
      0
    );

    const fov =
      60 +
      S.warp * 22;

    if (
      Math.abs(
        fov - lastFov
      ) > 0.05
    ) {

      lastFov = fov;

      camera.fov =
        fov;

      camera.updateProjectionMatrix();
    }

    renderer.render(
      scene,
      camera
    );
  }

  // ============================================================
  // GITHUB API
  // ============================================================

  async function loadGitHub() {

    try {

      const response =
        await fetch(
          'https://api.github.com/users/' +
          GH_USER +
          '/repos?per_page=100&sort=updated'
        );

      if (!response.ok) {
        throw new Error(
          'HTTP ' +
          response.status
        );
      }

      const list =
        await response.json();

      if (
        !Array.isArray(list)
      ) {
        throw new Error(
          'Réponse GitHub invalide'
        );
      }

      const visible =
        list.filter(repo =>
          repo &&
          repo.name &&
          !EXCLUDED.has(
            norm(repo.name)
          )
        );

      S.repos =
        visible.length ||
        S.repos;

      const years =
        visible
          .map(repo =>
            new Date(
              repo.created_at
            ).getFullYear()
          )
          .filter(Number.isFinite);

      if (years.length) {

        S.years =
          Math.max(
            1,
            new Date().getFullYear() -
            Math.min(...years) +
            1
          );
      }

      visible.forEach(repo => {

        const project =
          PROJECTS.find(
            item =>
              norm(item.repo) ===
              norm(repo.name)
          );

        if (!project) {
          return;
        }

        project.updated =
          repo.pushed_at ||
          repo.updated_at ||
          '';

        project.lang =
          repo.language ||
          '';
      });

    } catch (error) {

      console.warn(
        '[KAR] GitHub API indisponible. Valeurs locales utilisées.',
        error
      );
    }

    fillStats();
  }

  // ============================================================
  // STATS
  // ============================================================

  const counted =
    new Set();

  function fillStats() {

    const values = {
      statProjects: PROJECTS.length,
      statRepos: S.repos,
      statTech: TECH.length,
      statYears: S.years
    };

    Object.entries(values).forEach(
      ([id, value]) => {

        const element =
          $('#' + id);

        if (!element) {
          return;
        }

        element.dataset.to =
          String(value);

        if (
          counted.has(id)
        ) {
          countUp(element);
        }
      }
    );
  }

  function countUp(element) {

    if (!element) {
      return;
    }

    counted.add(
      element.id
    );

    const target =
      Number(
        element.dataset.to
      ) || 0;

    const start =
      performance.now();

    const duration =
      reduce
        ? 200
        : 1800;

    function step(now) {

      const progress =
        clamp(
          (now - start) /
          duration,
          0,
          1
        );

      element.textContent =
        String(
          Math.round(
            target *
            easeOutCubic(
              progress
            )
          )
        );

      if (
        progress < 1
      ) {
        requestAnimationFrame(
          step
        );
      }
    }

    requestAnimationFrame(
      step
    );
  }

  // ============================================================
  // CINEMATIC TRANSITIONS
  // ============================================================

  function flash(
    duration = 380
  ) {

    if (reduce) {
      return;
    }

    const element =
      $('#flash');

    if (!element) {
      return;
    }

    element.animate(
      [
        {
          opacity: 0
        },
        {
          opacity: 0.85,
          offset: 0.18
        },
        {
          opacity: 0
        }
      ],
      {
        duration,
        easing: 'ease-out'
      }
    );
  }

  // ============================================================
  // BOOT INTRO
  // ============================================================

  async function runBoot() {

    const get =
      id => $('#' + id);

    // Précharge musique + SFX pendant l'intro.
    soundManager.initMusic();
    soundManager.preloadSFX();

    // Tente la musique immédiatement.
    // Le navigateur peut refuser tant qu'il n'y a pas eu de clic.
    soundManager.musicState =
      'INTRO';

    await soundManager.enableMusic();

    soundManager.playSFX(
      'boot'
    );

    await wait(500);

    get('bDot')?.classList.add(
      'on'
    );

    await wait(800);

    get('bLogo')?.classList.add(
      'on'
    );

    get('bDot')?.classList.remove(
      'on'
    );

    await wait(1200);

    S.grid =
      0.22;

    await wait(1000);

    S.partT =
      1;

    await wait(900);

    get('bHub')?.classList.add(
      'on'
    );

    await wait(900);

    get('bTag')?.classList.add(
      'on'
    );

    await wait(900);

    get('bBar')?.classList.add(
      'on'
    );

    const steps = [
      'INITIALIZING KAR EXPERIENCE',
      'LOADING PROJECT MATRIX',
      'CONNECTING VISUAL ENGINE',
      'INITIALIZING AUDIO',
      'BUILDING EXPERIENCE',
      'READY'
    ];

    for (
      let i = 0;
      i < steps.length;
      i++
    ) {

      const percent =
        Math.round(
          ((i + 1) /
            steps.length) *
          100
        );

      const status =
        get('bStat');

      const percentage =
        get('bPct');

      const fill =
        get('bFill');

      if (status) {
        status.textContent =
          steps[i];
      }

      if (percentage) {
        percentage.textContent =
          percent + '%';
      }

      if (fill) {
        fill.style.transform =
          'scaleX(' +
          ((i + 1) /
            steps.length) +
          ')';
      }

      await wait(360);
    }

    await wait(250);

    get('bBar')?.classList.add(
      'done'
    );

    get('bBtns')?.classList.add(
      'on'
    );

    const skip =
      get('bSkip');

    if (skip) {
      skip.hidden = true;
    }

    const enterOn =
      get('enterOn');

    if (enterOn) {
      enterOn.focus({
        preventScroll: true
      });
    }
  }

  // ============================================================
  // ENTER
  // ============================================================

  async function enter(
    withSound
  ) {

    if (S.entered) {
      return;
    }

    S.entered =
      true;

    S.skip =
      false;

    const enterOn =
      $('#enterOn');

    const enterOff =
      $('#enterOff');

    if (enterOn) {
      enterOn.disabled =
        true;
    }

    if (enterOff) {
      enterOff.disabled =
        true;
    }

    soundManager.preloadSFX();

    if (withSound) {

      soundManager.sfxEnabled =
        true;

      soundManager.musicState =
        'INTRO';

      // Important :
      // appelé directement depuis le clic utilisateur.
      // Le navigateur autorise donc normalement la musique.
      await soundManager.enableMusic();

      soundManager.playSFX(
        'transition'
      );

    } else {

      soundManager.musicEnabled =
        false;

      soundManager.sfxEnabled =
        false;

      soundManager.updateUI();
    }

    const boot =
      $('#boot');

    if (boot) {
      boot.classList.add(
        'glitch'
      );
    }

    flash(420);

    S.warp =
      1.5;

    S.camLerp =
      0.05;

    S.grid =
      0.08;

    S.wire =
      0.2;

    await wait(420);

    if (boot) {
      boot.classList.remove(
        'glitch'
      );

      boot.classList.add(
        'out'
      );
    }

    await wait(900);

    document.documentElement
      .classList
      .remove(
        'locked'
      );

    document.body
      .classList
      .add(
        'ready'
      );

    $('#hero')?.classList.add(
      'in'
    );

    soundManager.musicState =
      'HERO';

    await wait(700);

    if (boot) {
      boot.hidden =
        true;
    }

    initObservers();
  }

  // ============================================================
  // SECTION CONFIG
  // ============================================================

  const SEC = {

    hero: {
      z: 8,
      grid: 0.08,
      wire: 0.2,
      mus: 'HERO'
    },

    projects: {
      z: 11,
      grid: 0.06,
      wire: 0.12,
      mus: 'PROJECTS'
    },

    stats: {
      z: 12,
      grid: 0.05,
      wire: 0.1,
      mus: 'PROJECTS'
    },

    about: {
      z: 10,
      grid: 0.05,
      wire: 0.14,
      mus: 'ABOUT'
    },

    sound: {
      z: 9,
      grid: 0.06,
      wire: 0.16,
      mus: 'SOUND'
    },

    credits: {
      z: 12,
      grid: 0.04,
      wire: 0.1,
      mus: 'CREDITS'
    },

    emotional: {
      z: 17,
      grid: 0,
      wire: 0.05,
      mus: 'EMOTIONAL'
    },

    final: {
      z: 5,
      grid: 0.1,
      wire: 0.3,
      mus: 'FINAL'
    },

    footer: {
      z: 12,
      grid: 0.05,
      wire: 0.1,
      mus: 'FINAL'
    }
  };

  function sectionTransition(
    id
  ) {

    const config =
      SEC[id];

    if (!config) {
      return;
    }

    S.section =
      id;

    S.camZ =
      config.z;

    S.grid =
      config.grid;

    S.wire =
      config.wire;

    soundManager.musicState =
      config.mus;

    S.warp =
      Math.max(
        S.warp,
        0.25
      );

    $$('#nav a[data-sec]')
      .forEach(link => {

        link.classList.toggle(
          'act',
          link.dataset.sec === id
        );
      });
  }

  async function finalTransition() {

    if (S.finalBusy) {
      return;
    }

    S.finalBusy =
      true;

    soundManager.playSFX(
      'transition'
    );

    flash(500);

    S.warp =
      2;

    document.body
      .classList
      .add(
        'fx'
      );

    await wait(900);

    const footer =
      $('#footer');

    if (footer) {

      footer.scrollIntoView({
        behavior:
          reduce
            ? 'auto'
            : 'smooth'
      });
    }

    await wait(600);

    document.body
      .classList
      .remove(
        'fx'
      );

    S.finalBusy =
      false;
  }

  // ============================================================
  // PROJECT CHAPTER
  // ============================================================

  let lastFocus =
    null;

  function fmtDate(date) {

    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return '';
    }

    return parsed
      .toLocaleDateString(
        'en-GB',
        {
          month: 'short',
          year: 'numeric'
        }
      )
      .toUpperCase();
  }

  function fillChapter(index) {

    const project =
      PROJECTS[index];

    if (!project) {
      return;
    }

    const indexElement =
      $('#chIdx');

    const nameElement =
      $('#chName');

    const statusElement =
      $('#chStatus');

    const descriptionElement =
      $('#chDesc');

    const metaElement =
      $('#chMeta');

    const openElement =
      $('#chOpen');

    if (indexElement) {
      indexElement.textContent =
        pad(index + 1);
    }

    if (nameElement) {
      nameElement.textContent =
        project.name;
    }

    if (statusElement) {

      statusElement.textContent =
        project.status;

      statusElement.classList.toggle(
        'live',
        project.status === 'LIVE'
      );
    }

    if (descriptionElement) {
      descriptionElement.textContent =
        project.description;
    }

    if (metaElement) {

      metaElement.textContent =
        [
          project.lang,
          project.updated
            ? 'UPDATED ' +
              fmtDate(
                project.updated
              )
            : ''
        ]
          .filter(Boolean)
          .join(' · ') ||
        'KAR ECOSYSTEM';
    }

    if (openElement) {

      openElement.href =
        project.url;

      openElement.setAttribute(
        'aria-label',
        'Open project ' +
        project.name
      );
    }
  }

  function openChapter(index) {

    if (
      S.chapter >= 0
    ) {
      return;
    }

    if (
      !PROJECTS[index]
    ) {
      return;
    }

    lastFocus =
      document.activeElement;

    S.chapter =
      index;

    fillChapter(index);

    const chapter =
      $('#chapter');

    if (chapter) {

      chapter.classList.add(
        'on'
      );

      chapter.setAttribute(
        'aria-hidden',
        'false'
      );
    }

    document.documentElement
      .classList
      .add(
        'locked'
      );

    soundManager.duck =
      0.6;

    soundManager.playSFX(
      'open'
    );

    S.warp =
      Math.max(
        S.warp,
        0.5
      );

    document.addEventListener(
      'keydown',
      onChapterKey
    );

    setTimeout(() => {

      $('#chClose')?.focus({
        preventScroll: true
      });

    }, 500);
  }

  async function stepChapter(
    direction
  ) {

    if (
      S.chapter < 0 ||
      S.busy
    ) {
      return;
    }

    S.busy =
      true;

    const body =
      $('#chBody');

    soundManager.playSFX(
      'transition'
    );

    S.warp =
      Math.max(
        S.warp,
        0.6
      );

    body?.classList.add(
      'sw'
    );

    await wait(400);

    S.chapter =
      (
        S.chapter +
        direction +
        PROJECTS.length
      ) %
      PROJECTS.length;

    fillChapter(
      S.chapter
    );

    body?.classList.remove(
      'sw'
    );

    await wait(400);

    S.busy =
      false;
  }

  function closeChapter() {

    if (
      S.chapter < 0
    ) {
      return;
    }

    const chapter =
      $('#chapter');

    if (chapter) {

      chapter.classList.remove(
        'on'
      );

      chapter.setAttribute(
        'aria-hidden',
        'true'
      );
    }

    document.documentElement
      .classList
      .remove(
        'locked'
      );

    soundManager.duck =
      1;

    soundManager.playSFX(
      'click'
    );

    document.removeEventListener(
      'keydown',
      onChapterKey
    );

    S.chapter =
      -1;

    S.busy =
      false;

    if (
      lastFocus &&
      typeof lastFocus.focus ===
        'function'
    ) {

      lastFocus.focus({
        preventScroll: true
      });
    }
  }

  function onChapterKey(
    event
  ) {

    if (
      event.key ===
      'Escape'
    ) {

      closeChapter();
      return;
    }

    if (
      event.key ===
      'ArrowRight'
    ) {

      soundManager.playSFX(
        'click'
      );

      stepChapter(1);
      return;
    }

    if (
      event.key ===
      'ArrowLeft'
    ) {

      soundManager.playSFX(
        'click'
      );

      stepChapter(-1);
      return;
    }

    if (
      event.key ===
      'Tab'
    ) {

      const focusable = [
        $('#chClose'),
        $('#chOpen'),
        $('#chPrev'),
        $('#chNext')
      ].filter(Boolean);

      if (
        !focusable.length
      ) {
        return;
      }

      const current =
        focusable.indexOf(
          document.activeElement
        );

      event.preventDefault();

      const next =
        (
          current +
          (event.shiftKey ? -1 : 1) +
          focusable.length
        ) %
        focusable.length;

      focusable[next].focus();
    }
  }

  function createElement(
    tag,
    className,
    text
  ) {

    const element =
      document.createElement(
        tag
      );

    if (className) {
      element.className =
        className;
    }

    if (
      text !== undefined &&
      text !== null
    ) {
      element.textContent =
        text;
    }

    return element;
  }

  function buildProjects() {

    const list =
      $('#projectList');

    if (!list) {
      console.warn(
        '[KAR] #projectList introuvable.'
      );

      return;
    }

    list.innerHTML =
      '';

    PROJECTS.forEach(
      (project, index) => {

        const li =
          document.createElement(
            'li'
          );

        const button =
          createElement(
            'button',
            'prow rv'
          );

        button.type =
          'button';

        button.dataset.project =
          String(index);

        button.style.setProperty(
          '--d',
          (index * 0.08) +
          's'
        );

        button.setAttribute(
          'aria-label',
          'Open chapter ' +
          pad(index + 1) +
          ': ' +
          project.name +
          ', ' +
          project.status
        );

        const status =
          createElement(
            'span',
            'st mono' +
              (
                project.status ===
                'LIVE'
                  ? ' live'
                  : ''
              ),
            project.status
          );

        button.append(
          createElement(
            'span',
            'i mono',
            pad(index + 1)
          ),

          createElement(
            'span',
            'n',
            project.name
          ),

          status,

          createElement(
            'span',
            'a',
            '↗'
          )
        );

        button.addEventListener(
          'click',
          () => {

            soundManager.playSFX(
              'click'
            );

            openChapter(
              index
            );
          }
        );

        li.appendChild(
          button
        );

        list.appendChild(
          li
        );
      }
    );
  }

  // ============================================================
  // CURSOR
  // ============================================================

  let cursorX = 0;
  let cursorY = 0;

  let cursorScale = 1;
  let targetCursorScale = 1;

  function initCursor() {

    if (coarse) {
      return;
    }

    document.body.classList.add(
      'hascur'
    );
  }

  function cursorTick() {

    if (coarse) {
      return;
    }

    cursorX =
      lerp(
        cursorX,
        S.px,
        0.22
      );

    cursorY =
      lerp(
        cursorY,
        S.py,
        0.22
      );

    cursorScale =
      lerp(
        cursorScale,
        targetCursorScale,
        0.14
      );

    const cursor =
      $('#cur');

    if (!cursor) {
      return;
    }

    cursor.style.transform =
      'translate3d(' +
      cursorX +
      'px,' +
      cursorY +
      'px,0) scale(' +
      cursorScale.toFixed(3) +
      ')';
  }

  // ============================================================
  // EMOTIONAL / FINAL SEQUENCES
  // ============================================================

  const sequence =
    {
      emotional: 0,
      final: 0
    };

  async function playEmotional() {

    const token =
      ++sequence.emotional;

    const lines =
      $$('#emotional .el');

    lines.forEach(
      element =>
        element.classList.remove(
          'in'
        )
    );

    await wait(500);

    for (
      const line of lines
    ) {

      if (
        token !==
        sequence.emotional
      ) {
        return;
      }

      line.classList.add(
        'in'
      );

      await wait(1900);
    }
  }

  function resetEmotional() {

    sequence.emotional++;

    $$('#emotional .el')
      .forEach(
        element =>
          element.classList.remove(
            'in'
          )
      );
  }

  async function playFinal() {

    const token =
      ++sequence.final;

    const line =
      $('#finalLine');

    const big =
      $('#finalBig');

    const button =
      $('#btnContinue');

    [
      line,
      big,
      button
    ]
      .filter(Boolean)
      .forEach(
        element =>
          element.classList.remove(
            'in'
          )
      );

    await wait(700);

    if (
      token !==
      sequence.final
    ) {
      return;
    }

    line?.classList.add(
      'in'
    );

    await wait(1800);

    if (
      token !==
      sequence.final
    ) {
      return;
    }

    big?.classList.add(
      'in'
    );

    await wait(1500);

    if (
      token !==
      sequence.final
    ) {
      return;
    }

    button?.classList.add(
      'in'
    );
  }

  function resetFinal() {

    sequence.final++;

    [
      '#finalLine',
      '#finalBig',
      '#btnContinue'
    ]
      .forEach(selector => {

        $(selector)?.classList.remove(
          'in'
        );
      });
  }

  // ============================================================
  // OBSERVERS
  // ============================================================

  let observersReady =
    false;

  function initObservers() {

    if (
      observersReady
    ) {
      return;
    }

    observersReady =
      true;

    // Reveal
    if (
      'IntersectionObserver' in window
    ) {

      const revealObserver =
        new IntersectionObserver(
          entries => {

            entries.forEach(
              entry => {

                if (
                  !entry.isIntersecting
                ) {
                  return;
                }

                entry.target
                  .classList
                  .add('in');

                revealObserver.unobserve(
                  entry.target
                );

                $$(
                  'b[data-to]',
                  entry.target
                ).forEach(
                  countUp
                );
              }
            );
          },
          {
            threshold: 0.15
          }
        );

      $$('.rv').forEach(
        element =>
          revealObserver.observe(
            element
          )
      );

      // Section tracking
      const sectionObserver =
        new IntersectionObserver(
          entries => {

            entries.forEach(
              entry => {

                if (
                  !entry.isIntersecting
                ) {
                  return;
                }

                const id =
                  entry.target.id;

                if (
                  id &&
                  id !== S.section
                ) {

                  sectionTransition(
                    id
                  );
                }
              }
            );
          },
          {
            rootMargin:
              '-45% 0px -45% 0px'
          }
        );

      $$(
        'main > section, main > footer'
      ).forEach(
        element =>
          sectionObserver.observe(
            element
          )
      );

      // Emotional
      const emotional =
        $('#emotional');

      if (emotional) {

        const observer =
          new IntersectionObserver(
            entries => {

              entries.forEach(
                entry => {

                  if (
                    entry.isIntersecting &&
                    entry.intersectionRatio >= 0.5
                  ) {

                    playEmotional();

                  } else if (
                    !entry.isIntersecting
                  ) {

                    resetEmotional();
                  }
                }
              );
            },
            {
              threshold: [
                0,
                0.5
              ]
            }
          );

        observer.observe(
          emotional
        );
      }

      // Final
      const final =
        $('#final');

      if (final) {

        const observer =
          new IntersectionObserver(
            entries => {

              entries.forEach(
                entry => {

                  if (
                    entry.isIntersecting &&
                    entry.intersectionRatio >= 0.5
                  ) {

                    playFinal();

                  } else if (
                    !entry.isIntersecting
                  ) {

                    resetFinal();
                  }
                }
              );
            },
            {
              threshold: [
                0,
                0.5
              ]
            }
          );

        observer.observe(
          final
        );
      }

    } else {

      // Fallback vieux navigateur
      $$('.rv').forEach(
        element =>
          element.classList.add(
            'in'
          )
      );
    }
  }

  // ============================================================
  // UI EVENTS
  // ============================================================

  function bindUI() {

    const enterOn =
      $('#enterOn');

    const enterOff =
      $('#enterOff');

    const skip =
      $('#bSkip');

    const navSound =
      $('#navSound');

    const btnMusic =
      $('#btnMusic');

    const btnSfx =
      $('#btnSfx');

    const chClose =
      $('#chClose');

    const chPrev =
      $('#chPrev');

    const chNext =
      $('#chNext');

    const chOpen =
      $('#chOpen');

    const btnContinue =
      $('#btnContinue');

    // ENTER SOUND ON
    enterOn?.addEventListener(
      'click',
      () => {
        enter(true);
      }
    );

    // ENTER SILENT
    enterOff?.addEventListener(
      'click',
      () => {
        enter(false);
      }
    );

    // SKIP
    skip?.addEventListener(
      'click',
      () => {

        S.skip =
          true;

        // Si la musique a été bloquée par
        // l'autoplay, le clic sur SKIP
        // devient également une interaction
        // permettant de lancer la musique.
        if (
          !S.entered
        ) {

          soundManager
            .musicState =
            'INTRO';

          soundManager
            .enableMusic();
        }
      }
    );

    // NAV SOUND
    navSound?.addEventListener(
      'click',
      () => {

        soundManager.toggleMusic();

        soundManager.playSFX(
          'click'
        );
      }
    );

    // SOUND SECTION
    btnMusic?.addEventListener(
      'click',
      () => {

        soundManager.toggleMusic();

        soundManager.playSFX(
          'click'
        );
      }
    );

    btnSfx?.addEventListener(
      'click',
      () => {

        const wasEnabled =
          soundManager.sfxEnabled;

        soundManager.toggleSFX();

        // Si on vient d'activer les SFX,
        // joue le clic après activation.
        if (!wasEnabled) {
          soundManager.playSFX(
            'click'
          );
        }
      }
    );

    // CHAPTER
    chClose?.addEventListener(
      'click',
      closeChapter
    );

    chPrev?.addEventListener(
      'click',
      () => {

        soundManager.playSFX(
          'click'
        );

        stepChapter(-1);
      }
    );

    chNext?.addEventListener(
      'click',
      () => {

        soundManager.playSFX(
          'click'
        );

        stepChapter(1);
      }
    );

    chOpen?.addEventListener(
      'click',
      () => {

        soundManager.playSFX(
          'click'
        );
      }
    );

    btnContinue?.addEventListener(
      'click',
      finalTransition
    );

    // Liens
    $$('#nav a, #footer a')
      .forEach(
        link => {

          link.addEventListener(
            'click',
            () => {

              soundManager.playSFX(
                'click'
              );
            }
          );
        }
      );

    // ----------------------------------------------------------
    // HOVER SOUND
    // ----------------------------------------------------------

    let lastHovered =
      null;

    document.addEventListener(
      'pointerover',
      event => {

        const target =
          event.target.closest
            ? event.target.closest(
                'a,button'
              )
            : null;

        if (
          target ===
          lastHovered
        ) {
          return;
        }

        lastHovered =
          target;

        if (target) {

          soundManager.playSFX(
            'hover'
          );

          targetCursorScale =
            target.classList.contains(
              'prow'
            )
              ? 5
              : 2.8;

        } else {

          targetCursorScale =
            1;
        }
      }
    );

    // ----------------------------------------------------------
    // POINTER
    // ----------------------------------------------------------

    window.addEventListener(
      'pointermove',
      event => {

        S.px =
          event.clientX;

        S.py =
          event.clientY;

        S.tx =
          (
            event.clientX /
            window.innerWidth -
            0.5
          ) * 2;

        S.ty =
          (
            event.clientY /
            window.innerHeight -
            0.5
          ) * 2;
      },
      {
        passive: true
      }
    );

    // ----------------------------------------------------------
    // SCROLL
    // ----------------------------------------------------------

    window.addEventListener(
      'scroll',
      () => {

        $('#nav')?.classList.toggle(
          'sc',
          window.scrollY > 40
        );
      },
      {
        passive: true
      }
    );

    // ----------------------------------------------------------
    // RESIZE
    // ----------------------------------------------------------

    let resizeFrame =
      0;

    window.addEventListener(
      'resize',
      () => {

        cancelAnimationFrame(
          resizeFrame
        );

        resizeFrame =
          requestAnimationFrame(
            onResize
          );
      }
    );

    // ----------------------------------------------------------
    // TAB / VISIBILITY
    // ----------------------------------------------------------

    document.addEventListener(
      'visibilitychange',
      () => {

        if (
          document.hidden
        ) {

          soundManager.duck =
            0.25;

        } else {

          soundManager.duck =
            S.chapter >= 0
              ? 0.6
              : 1;
        }
      }
    );

    // ----------------------------------------------------------
    // PREMIER CLIC GLOBAL
    // ----------------------------------------------------------
    //
    // Si Chrome a bloqué l'autoplay au lancement,
    // le premier clic n'importe où dans le site peut
    // lancer la musique.
    //

    const unlockAudio =
      async () => {

        if (
          !soundManager.musicEnabled
        ) {
          return;
        }

        try {
          await soundManager.enableMusic();
        } catch (_) {}
      };

    document.addEventListener(
      'pointerdown',
      unlockAudio,
      {
        once: false,
        passive: true
      }
    );

    document.addEventListener(
      'keydown',
      unlockAudio,
      {
        once: false
      }
    );
  }

  // ============================================================
  // ANIMATION LOOP
  // ============================================================

  let lastTime =
    performance.now();

  function frame(now) {

    requestAnimationFrame(
      frame
    );

    const dt =
      Math.min(
        (now - lastTime) /
          1000,
        0.05
      );

    lastTime =
      now;

    S.mx =
      lerp(
        S.mx,
        S.tx,
        0.05
      );

    S.my =
      lerp(
        S.my,
        S.ty,
        0.05
      );

    S.warp *=
      Math.pow(
        0.96,
        dt * 60
      );

    cursorTick();

    soundManager.tick();

    if (
      renderer &&
      !document.hidden
    ) {

      renderThree(
        dt,
        now / 1000
      );
    }
  }

  // ============================================================
  // INIT
  // ============================================================

  function init() {

    document.documentElement
      .classList
      .add(
        'locked'
      );

    // Audio préparé immédiatement
    soundManager.initMusic();
    soundManager.preloadSFX();

    buildProjects();

    fillStats();

    soundManager.updateUI();

    bindUI();

    initThree();

    initCursor();

    if (!renderer) {

      // Fallback sans WebGL
      S.partT =
        1;
    }

    requestAnimationFrame(
      frame
    );

    loadGitHub();

    runBoot();
  }

  // ============================================================
  // START
  // ============================================================

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      {
        once: true
      }
    );

  } else {

    init();
  }

})();