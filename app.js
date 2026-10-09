/* =========================================================
   KAR PROJECTS HUB — APP.JS
   Compatible / robuste / sans dépendance obligatoire
   ========================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------
     CONFIGURATION
  --------------------------------------------------------- */

  const CONFIG = {
    audio: {
      record:
        "assets/audio/Record (mp3cut.net).mp3",

      // Fichiers audio optionnels : s'ils n'existent pas,
      // le script continue normalement.
      background: [
        "assets/audio/background.mp3",
        "assets/audio/background.ogg",
        "assets/audio/music.mp3"
      ],

      click: [
        "assets/audio/click.mp3",
        "assets/audio/click.ogg"
      ],

      hover: [
        "assets/audio/hover.mp3",
        "assets/audio/hover.ogg"
      ],

      transition: [
        "assets/audio/transition.mp3",
        "assets/audio/transition.ogg"
      ]
    },

    voice: {
      language: "fr-FR",
      rate: 1,
      pitch: 1,
      volume: 1
    },

    storage: {
      theme: "kar_theme",
      music: "kar_music_enabled",
      sound: "kar_sound_enabled",
      voice: "kar_voice_enabled"
    }
  };

  /* ---------------------------------------------------------
     UTILITAIRES
  --------------------------------------------------------- */

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  const exists = (selector) => !!$(selector);

  const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

  function safeStorageGet(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /* ---------------------------------------------------------
     ÉTAT GLOBAL
  --------------------------------------------------------- */

  const state = {
    musicEnabled:
      safeStorageGet(CONFIG.storage.music, "true") !== "false",

    soundEnabled:
      safeStorageGet(CONFIG.storage.sound, "true") !== "false",

    voiceEnabled:
      safeStorageGet(CONFIG.storage.voice, "true") !== "false",

    currentAudio: null,

    recorder: null,

    recordedChunks: [],

    recording: false,

    voices: [],

    initialized: false
  };

  /* ---------------------------------------------------------
     AUDIO
  --------------------------------------------------------- */

  const audioCache = new Map();

  function createAudio(src, volume = 1, loop = false) {
    if (!src) return null;

    try {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = clamp(volume, 0, 1);
      audio.loop = loop;
      return audio;
    } catch {
      return null;
    }
  }

  function findWorkingAudio(list) {
    if (!Array.isArray(list)) return null;

    for (const src of list) {
      if (!src) continue;

      if (!audioCache.has(src)) {
        const audio = createAudio(src);
        if (audio) {
          audioCache.set(src, audio);
        }
      }

      if (audioCache.has(src)) {
        return audioCache.get(src);
      }
    }

    return null;
  }

  function playSound(type = "click") {
    if (!state.soundEnabled) return;

    const sources = CONFIG.audio[type];

    if (!sources) return;

    const original = findWorkingAudio(sources);

    if (!original) return;

    try {
      const audio = original.cloneNode(true);
      audio.volume = 0.45;

      const promise = audio.play();

      if (promise && typeof promise.catch === "function") {
        promise.catch(() => {});
      }

      setTimeout(() => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {}
      }, 5000);
    } catch {}
  }

  function playRecordAudio() {
    if (!state.soundEnabled) return;

    try {
      const audio = new Audio(CONFIG.audio.record);
      audio.volume = 1;

      const promise = audio.play();

      if (promise && typeof promise.catch === "function") {
        promise.catch(() => {});
      }

      state.currentAudio = audio;

      audio.addEventListener("ended", () => {
        if (state.currentAudio === audio) {
          state.currentAudio = null;
        }
      });
    } catch (error) {
      console.warn("Impossible de lire le fichier audio :", error);
    }
  }

  function stopCurrentAudio() {
    if (!state.currentAudio) return;

    try {
      state.currentAudio.pause();
      state.currentAudio.currentTime = 0;
    } catch {}

    state.currentAudio = null;
  }

  function createBackgroundAudio() {
    if (!state.musicEnabled) return null;

    const audio = findWorkingAudio(CONFIG.audio.background);

    if (!audio) return null;

    audio.loop = true;
    audio.volume = 0.18;

    return audio;
  }

  function startBackgroundMusic() {
    if (!state.musicEnabled) return;

    const audio = createBackgroundAudio();

    if (!audio) return;

    state.backgroundAudio = audio;

    const promise = audio.play();

    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {
        /*
          Les navigateurs bloquent souvent l'audio automatique.
          On attend donc le premier clic.
        */
      });
    }
  }

  function stopBackgroundMusic() {
    const audio = state.backgroundAudio;

    if (!audio) return;

    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {}
  }

  /* ---------------------------------------------------------
     DÉMARRAGE AUDIO APRÈS INTERACTION
  --------------------------------------------------------- */

  let userInteracted = false;

  function unlockAudio() {
    if (userInteracted) return;

    userInteracted = true;

    if (state.musicEnabled) {
      startBackgroundMusic();
    }
  }

  document.addEventListener("click", unlockAudio, {
    once: true,
    passive: true
  });

  document.addEventListener("keydown", unlockAudio, {
    once: true,
    passive: true
  });

  /* ---------------------------------------------------------
     SYNTHÈSE VOCALE
  --------------------------------------------------------- */

  function loadVoices() {
    if (!("speechSynthesis" in window)) return;

    state.voices = speechSynthesis.getVoices() || [];
  }

  if ("speechSynthesis" in window) {
    loadVoices();

    speechSynthesis.onvoiceschanged = loadVoices;
  }

  function speak(text, options = {}) {
    if (!state.voiceEnabled) return;

    if (!("speechSynthesis" in window)) {
      console.warn("La synthèse vocale n'est pas disponible.");
      return;
    }

    if (!text) return;

    try {
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(
        String(text)
      );

      utterance.lang =
        options.lang ||
        CONFIG.voice.language;

      utterance.rate =
        options.rate ??
        CONFIG.voice.rate;

      utterance.pitch =
        options.pitch ??
        CONFIG.voice.pitch;

      utterance.volume =
        options.volume ??
        CONFIG.voice.volume;

      const frenchVoice =
        state.voices.find(
          voice =>
            voice.lang &&
            voice.lang.toLowerCase().startsWith("fr")
        );

      if (frenchVoice) {
        utterance.voice = frenchVoice;
      }

      speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn("Erreur synthèse vocale :", error);
    }
  }

  function stopSpeaking() {
    if (!("speechSynthesis" in window)) return;

    try {
      speechSynthesis.cancel();
    } catch {}
  }

  /* ---------------------------------------------------------
     ENREGISTREMENT MICRO
  --------------------------------------------------------- */

  function getSupportedMimeType() {
    if (!window.MediaRecorder) return "";

    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4"
    ];

    for (const type of types) {
      try {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      } catch {}
    }

    return "";
  }

  async function startRecording() {
    if (state.recording) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      alert(
        "Ton navigateur ne permet pas l'accès au microphone."
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        });

      const mimeType = getSupportedMimeType();

      state.recordedChunks = [];

      state.recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      state.recording = true;

      state.recorder.addEventListener(
        "dataavailable",
        event => {
          if (event.data && event.data.size > 0) {
            state.recordedChunks.push(event.data);
          }
        }
      );

      state.recorder.addEventListener(
        "stop",
        () => {
          stream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch {}
          });

          state.recording = false;

          const blob = new Blob(
            state.recordedChunks,
            {
              type:
                mimeType ||
                "audio/webm"
            }
          );

          state.lastRecording = blob;

          createRecordingPlayer(blob);

          updateRecordingUI(false);
        }
      );

      state.recorder.start();

      updateRecordingUI(true);

      playSound("click");

    } catch (error) {
      console.error(error);

      alert(
        "Impossible d'accéder au microphone.\n\n" +
        "Vérifie que ton navigateur a l'autorisation d'utiliser le micro."
      );
    }
  }

  function stopRecording() {
    if (!state.recorder) return;

    try {
      if (
        state.recorder.state !== "inactive"
      ) {
        state.recorder.stop();
      }
    } catch {}

    state.recording = false;
  }

  function createRecordingPlayer(blob) {
    const url = URL.createObjectURL(blob);

    let container =
      $("#recordings") ||
      $("#recording-list") ||
      $(".recordings") ||
      $("#audioRecordings");

    if (!container) {
      container = document.createElement("div");
      container.id = "recordings";

      document.body.appendChild(container);
    }

    const wrapper =
      document.createElement("div");

    wrapper.className = "kar-recording";

    const audio =
      document.createElement("audio");

    audio.controls = true;
    audio.src = url;

    const download =
      document.createElement("a");

    download.href = url;
    download.download =
      `KAR-Recording-${Date.now()}.webm`;

    download.textContent =
      "Télécharger l'enregistrement";

    download.className =
      "recording-download";

    wrapper.appendChild(audio);
    wrapper.appendChild(download);

    container.prepend(wrapper);
  }

  function updateRecordingUI(recording) {
    $$(
      "[data-record], #recordButton, #record-btn, .record-button"
    ).forEach(button => {
      button.classList.toggle(
        "recording",
        recording
      );

      button.setAttribute(
        "aria-pressed",
        recording ? "true" : "false"
      );

      const text =
        button.querySelector(
          "[data-record-text]"
        );

      if (text) {
        text.textContent = recording
          ? "Arrêter"
          : "Enregistrer";
      }
    });
  }

  /* ---------------------------------------------------------
     BOUTON ENREGISTREMENT
  --------------------------------------------------------- */

  function setupRecordingButtons() {
    const buttons = $$(
      "[data-record], #recordButton, #record-btn, .record-button"
    );

    buttons.forEach(button => {
      if (button.dataset.karRecordingReady) {
        return;
      }

      button.dataset.karRecordingReady = "true";

      button.addEventListener("click", event => {
        event.preventDefault();

        if (state.recording) {
          stopRecording();
        } else {
          startRecording();
        }
      });
    });
  }

  /* ---------------------------------------------------------
     RECHERCHE
  --------------------------------------------------------- */

  function setupSearch() {
    const inputs = $$(
      'input[type="search"], [data-search], #search, #searchInput, #projectSearch'
    );

    inputs.forEach(input => {
      if (input.dataset.karSearchReady) return;

      input.dataset.karSearchReady = "true";

      input.addEventListener("input", () => {
        filterProjects(input.value);
      });
    });
  }

  function filterProjects(value) {
    const query =
      String(value || "")
        .trim()
        .toLowerCase();

    const cards = $$(
      "[data-project], .project-card, .project, .project-item, .card[data-project]"
    );

    let visible = 0;

    cards.forEach(card => {
      const text =
        card.textContent
          .toLowerCase();

      const matches =
        !query ||
        text.includes(query);

      card.style.display =
        matches ? "" : "none";

      if (matches) visible++;
    });

    const counters = $$(
      "[data-results-count], #resultsCount"
    );

    counters.forEach(counter => {
      counter.textContent =
        String(visible);
    });

    const empty = $(
      "[data-no-results], #noResults"
    );

    if (empty) {
      empty.style.display =
        cards.length > 0 && visible === 0
          ? ""
          : "none";
    }
  }

  /* ---------------------------------------------------------
     NAVIGATION
  --------------------------------------------------------- */

  function setupNavigation() {
    $$(
      "[data-scroll], [data-target], [data-section]"
    ).forEach(button => {
      if (button.dataset.karNavigationReady) return;

      button.dataset.karNavigationReady = "true";

      button.addEventListener("click", event => {
        const target =
          button.dataset.scroll ||
          button.dataset.target ||
          button.dataset.section;

        if (!target) return;

        const element =
          document.querySelector(target) ||
          document.getElementById(
            target.replace(/^#/, "")
          );

        if (!element) return;

        event.preventDefault();

        playSound("click");

        element.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    });

    $$("a[href^='#']").forEach(link => {
      if (link.dataset.karAnchorReady) return;

      link.dataset.karAnchorReady = "true";

      link.addEventListener("click", event => {
        const id =
          link.getAttribute("href");

        if (!id || id === "#") return;

        const element = $(id);

        if (!element) return;

        event.preventDefault();

        playSound("click");

        element.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    });
  }

  /* ---------------------------------------------------------
     BOUTONS DE PROJETS
  --------------------------------------------------------- */

  function setupProjectButtons() {
    $$(
      "[data-project-url], [data-url], [data-open]"
    ).forEach(button => {
      if (button.dataset.karProjectReady) return;

      button.dataset.karProjectReady = "true";

      button.addEventListener("click", () => {
        playSound("click");
      });
    });
  }

  /* ---------------------------------------------------------
     SONS DES BOUTONS
  --------------------------------------------------------- */

  function setupButtonSounds() {
    $$(
      "button, .button, .btn, [role='button'], a"
    ).forEach(element => {
      if (element.dataset.karSoundReady) return;

      element.dataset.karSoundReady = "true";

      element.addEventListener(
        "mouseenter",
        () => playSound("hover")
      );

      element.addEventListener(
        "click",
        () => playSound("click")
      );
    });
  }

  /* ---------------------------------------------------------
     THÈME
  --------------------------------------------------------- */

  function setupTheme() {
    const savedTheme =
      safeStorageGet(
        CONFIG.storage.theme,
        "dark"
      );

    document.documentElement.dataset.theme =
      savedTheme;

    $$(
      "[data-theme], #themeToggle, #theme-toggle"
    ).forEach(button => {
      if (button.dataset.karThemeReady) return;

      button.dataset.karThemeReady = "true";

      button.addEventListener("click", event => {
        event.preventDefault();

        const current =
          document.documentElement.dataset.theme ||
          "dark";

        const next =
          current === "dark"
            ? "light"
            : "dark";

        document.documentElement.dataset.theme =
          next;

        safeStorageSet(
          CONFIG.storage.theme,
          next
        );

        playSound("click");
      });
    });
  }

  /* ---------------------------------------------------------
     CONTRÔLES AUDIO
  --------------------------------------------------------- */

  function setupAudioControls() {
    $$(
      "[data-music], #musicToggle, #music-toggle"
    ).forEach(button => {
      if (button.dataset.karMusicReady) return;

      button.dataset.karMusicReady = "true";

      button.addEventListener("click", event => {
        event.preventDefault();

        state.musicEnabled =
          !state.musicEnabled;

        safeStorageSet(
          CONFIG.storage.music,
          String(state.musicEnabled)
        );

        if (state.musicEnabled) {
          startBackgroundMusic();
        } else {
          stopBackgroundMusic();
        }

        playSound("click");
      });
    });

    $$(
      "[data-sound], #soundToggle, #sound-toggle"
    ).forEach(button => {
      if (button.dataset.karSoundReady2) return;

      button.dataset.karSoundReady2 = "true";

      button.addEventListener("click", event => {
        event.preventDefault();

        state.soundEnabled =
          !state.soundEnabled;

        safeStorageSet(
          CONFIG.storage.sound,
          String(state.soundEnabled)
        );

        if (state.soundEnabled) {
          playSound("click");
        }
      });
    });
  }

  /* ---------------------------------------------------------
     CONTRÔLE VOIX
  --------------------------------------------------------- */

  function setupVoiceControls() {
    $$(
      "[data-voice], #voiceToggle, #voice-toggle"
    ).forEach(button => {
      if (button.dataset.karVoiceReady) return;

      button.dataset.karVoiceReady = "true";

      button.addEventListener("click", event => {
        event.preventDefault();

        state.voiceEnabled =
          !state.voiceEnabled;

        safeStorageSet(
          CONFIG.storage.voice,
          String(state.voiceEnabled)
        );

        playSound("click");

        if (state.voiceEnabled) {
          speak(
            "La voix KAR est maintenant activée."
          );
        } else {
          stopSpeaking();
        }
      });
    });

    $$(
      "[data-speak]"
    ).forEach(element => {
      if (element.dataset.karSpeakReady) return;

      element.dataset.karSpeakReady = "true";

      element.addEventListener("click", () => {
        const text =
          element.dataset.speak ||
          element.textContent;

        speak(text);

        playSound("click");
      });
    });
  }

  /* ---------------------------------------------------------
     MODALES
  --------------------------------------------------------- */

  function setupModals() {
    $$(
      "[data-modal-open]"
    ).forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();

        const id =
          button.dataset.modalOpen;

        const modal =
          document.getElementById(id);

        if (!modal) return;

        modal.classList.add("active");
        modal.classList.add("open");

        playSound("click");
      });
    });

    $$(
      "[data-modal-close], .modal-close"
    ).forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();

        const modal =
          button.closest(".modal") ||
          button.closest("[role='dialog']");

        if (!modal) return;

        modal.classList.remove("active");
        modal.classList.remove("open");

        playSound("click");
      });
    });

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;

      $$(".modal.active, .modal.open").forEach(
        modal => {
          modal.classList.remove("active");
          modal.classList.remove("open");
        }
      );
    });
  }

  /* ---------------------------------------------------------
     MENU MOBILE
  --------------------------------------------------------- */

  function setupMobileMenu() {
    const buttons = $$(
      "[data-menu], #menuToggle, #menu-toggle, .menu-toggle, .hamburger"
    );

    buttons.forEach(button => {
      if (button.dataset.karMenuReady) return;

      button.dataset.karMenuReady = "true";

      button.addEventListener("click", event => {
        event.preventDefault();

        document.body.classList.toggle(
          "menu-open"
        );

        button.classList.toggle("active");

        playSound("click");
      });
    });
  }

  /* ---------------------------------------------------------
     ANIMATION AU SCROLL
  --------------------------------------------------------- */

  function setupScrollAnimations() {
    const elements = $$(
      "[data-animate], .reveal, .fade-in, .slide-up"
    );

    if (!elements.length) return;

    if (!("IntersectionObserver" in window)) {
      elements.forEach(
        element =>
          element.classList.add("visible")
      );

      return;
    }

    const observer =
      new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            entry.target.classList.add(
              "visible",
              "show",
              "active"
            );

            observer.unobserve(
              entry.target
            );
          });
        },
        {
          threshold: 0.1
        }
      );

    elements.forEach(
      element =>
        observer.observe(element)
    );
  }

  /* ---------------------------------------------------------
     PARALLAXE
  --------------------------------------------------------- */

  function setupParallax() {
    const elements = $$(
      "[data-parallax]"
    );

    if (!elements.length) return;

    let ticking = false;

    function update() {
      const scrollY =
        window.scrollY || 0;

      elements.forEach(element => {
        const speed =
          Number(
            element.dataset.parallax
          ) || 0.15;

        element.style.transform =
          `translate3d(0, ${scrollY * speed}px, 0)`;
      });

      ticking = false;
    }

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;

        ticking = true;

        requestAnimationFrame(update);
      },
      {
        passive: true
      }
    );
  }

  /* ---------------------------------------------------------
     CURSEUR
  --------------------------------------------------------- */

  function setupCursorEffects() {
    const cursor =
      $("#cursor") ||
      $(".custom-cursor");

    if (!cursor) return;

    document.addEventListener(
      "mousemove",
      event => {
        cursor.style.left =
          `${event.clientX}px`;

        cursor.style.top =
          `${event.clientY}px`;
      },
      {
        passive: true
      }
    );

    $$(
      "button, a, .btn, [role='button']"
    ).forEach(element => {
      element.addEventListener(
        "mouseenter",
        () => cursor.classList.add("hover")
      );

      element.addEventListener(
        "mouseleave",
        () => cursor.classList.remove("hover")
      );
    });
  }

  /* ---------------------------------------------------------
     PARTICULES SIMPLES
  --------------------------------------------------------- */

  function setupParticles() {
    const canvas =
      $("#particles") ||
      $("#particleCanvas") ||
      $("canvas[data-particles]");

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    let particles = [];

    function resize() {
      const dpr =
        window.devicePixelRatio || 1;

      canvas.width =
        window.innerWidth * dpr;

      canvas.height =
        window.innerHeight * dpr;

      canvas.style.width =
        `${window.innerWidth}px`;

      canvas.style.height =
        `${window.innerHeight}px`;

      ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );

      const count =
        Math.min(
          100,
          Math.max(
            25,
            Math.floor(
              window.innerWidth / 15
            )
          )
        );

      particles =
        Array.from(
          { length: count },
          () => ({
            x:
              Math.random() *
              window.innerWidth,

            y:
              Math.random() *
              window.innerHeight,

            size:
              Math.random() * 2 + 0.5,

            speed:
              Math.random() * 0.5 + 0.1,

            opacity:
              Math.random() * 0.6 + 0.1
          })
        );
    }

    function animate() {
      ctx.clearRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
      );

      particles.forEach(p => {
        p.y -= p.speed;

        if (p.y < -10) {
          p.y =
            window.innerHeight + 10;

          p.x =
            Math.random() *
            window.innerWidth;
        }

        ctx.globalAlpha =
          p.opacity;

        ctx.beginPath();

        ctx.arc(
          p.x,
          p.y,
          p.size,
          0,
          Math.PI * 2
        );

        ctx.fill();
      });

      ctx.globalAlpha = 1;

      requestAnimationFrame(animate);
    }

    resize();

    window.addEventListener(
      "resize",
      resize
    );

    animate();
  }

  /* ---------------------------------------------------------
     THREE.JS
  --------------------------------------------------------- */

  function setupThreeJS() {
    if (
      typeof THREE === "undefined"
    ) {
      return;
    }

    const canvas =
      $("#three-canvas") ||
      $("#threeCanvas") ||
      $("canvas[data-three]");

    if (!canvas) return;

    try {
      const scene =
        new THREE.Scene();

      const camera =
        new THREE.PerspectiveCamera(
          60,
          window.innerWidth /
            window.innerHeight,
          0.1,
          1000
        );

      const renderer =
        new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true
        });

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

      camera.position.z = 5;

      const geometry =
        new THREE.IcosahedronGeometry(
          1.5,
          1
        );

      const material =
        new THREE.MeshBasicMaterial({
          wireframe: true,
          transparent: true,
          opacity: 0.35
        });

      const mesh =
        new THREE.Mesh(
          geometry,
          material
        );

      scene.add(mesh);

      function resize() {
        camera.aspect =
          window.innerWidth /
          window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
          window.innerWidth,
          window.innerHeight
        );
      }

      window.addEventListener(
        "resize",
        resize
      );

      function animate() {
        requestAnimationFrame(
          animate
        );

        mesh.rotation.x += 0.0015;
        mesh.rotation.y += 0.002;

        renderer.render(
          scene,
          camera
        );
      }

      animate();

    } catch (error) {
      console.warn(
        "Three.js n'a pas pu être initialisé :",
        error
      );
    }
  }

  /* ---------------------------------------------------------
     VR / WEBXR
  --------------------------------------------------------- */

  function setupVR() {
    const button =
      $(
        "[data-vr], #vrButton, #vr-button"
      );

    if (!button) return;

    if (!navigator.xr) {
      button.disabled = true;
      button.title =
        "WebXR n'est pas disponible dans ce navigateur.";
      return;
    }

    button.addEventListener(
      "click",
      async () => {
        try {
          const supported =
            await navigator.xr.isSessionSupported(
              "immersive-vr"
            );

          if (!supported) {
            alert(
              "La VR immersive n'est pas disponible sur cet appareil."
            );
            return;
          }

          if (window.THREE?.XR) {
            alert(
              "WebXR est disponible."
            );
          }

        } catch (error) {
          console.warn(error);
        }
      }
    );
  }

  /* ---------------------------------------------------------
     RACCOURCIS CLAVIER
  --------------------------------------------------------- */

  function setupKeyboard() {
    document.addEventListener(
      "keydown",
      event => {

        // Échap = fermer / arrêter
        if (event.key === "Escape") {
          stopSpeaking();
        }

        // Ctrl + K = recherche
        if (
          event.ctrlKey &&
          event.key.toLowerCase() === "k"
        ) {
          const search =
            $(
              'input[type="search"], #search, #searchInput, [data-search]'
            );

          if (search) {
            event.preventDefault();
            search.focus();
          }
        }

        // Ctrl + M = musique
        if (
          event.ctrlKey &&
          event.key.toLowerCase() === "m"
        ) {
          event.preventDefault();

          state.musicEnabled =
            !state.musicEnabled;

          safeStorageSet(
            CONFIG.storage.music,
            String(state.musicEnabled)
          );

          if (state.musicEnabled) {
            startBackgroundMusic();
          } else {
            stopBackgroundMusic();
          }
        }
      }
    );
  }

  /* ---------------------------------------------------------
     LIENS EXTERNES
  --------------------------------------------------------- */

  function setupExternalLinks() {
    $$("a[href]").forEach(link => {
      const href =
        link.getAttribute("href");

      if (!href) return;

      if (
        href.startsWith("http://") ||
        href.startsWith("https://")
      ) {
        link.setAttribute(
          "rel",
          "noopener noreferrer"
        );
      }
    });
  }

  /* ---------------------------------------------------------
     DATE / ANNÉE AUTOMATIQUE
  --------------------------------------------------------- */

  function setupYear() {
    $$(
      "[data-year], #year, .current-year"
    ).forEach(element => {
      element.textContent =
        String(new Date().getFullYear());
    });
  }

  /* ---------------------------------------------------------
     BOUTONS "PARLER"
  --------------------------------------------------------- */

  function setupSpeakButtons() {
    $$(
      "[data-speech], [data-speak-text]"
    ).forEach(button => {
      if (button.dataset.karSpeechReady) {
        return;
      }

      button.dataset.karSpeechReady = "true";

      button.addEventListener(
        "click",
        () => {
          const text =
            button.dataset.speech ||
            button.dataset.speakText ||
            button.textContent;

          speak(text);

          playSound("click");
        }
      );
    });
  }

  /* ---------------------------------------------------------
     DÉTECTION DES ÉLÉMENTS
  --------------------------------------------------------- */

  function reportCompatibility() {
    const features = {
      Audio:
        typeof Audio !== "undefined",

      Speech:
        "speechSynthesis" in window,

      Microphone:
        !!navigator.mediaDevices?.getUserMedia,

      MediaRecorder:
        "MediaRecorder" in window,

      WebGL:
        (() => {
          try {
            const canvas =
              document.createElement(
                "canvas"
              );

            return !!(
              canvas.getContext(
                "webgl"
              ) ||
              canvas.getContext(
                "experimental-webgl"
              )
            );
          } catch {
            return false;
          }
        })(),

      WebXR:
        !!navigator.xr
    };

    window.KARFeatures = features;

    console.info(
      "KAR Projects Hub — fonctionnalités :",
      features
    );
  }

  /* ---------------------------------------------------------
     API GLOBALE
  --------------------------------------------------------- */

  window.KAR = {
    state,

    speak,

    stopSpeaking,

    playSound,

    playRecordAudio,

    stopCurrentAudio,

    startRecording,

    stopRecording,

    filterProjects,

    startBackgroundMusic,

    stopBackgroundMusic
  };

  /* ---------------------------------------------------------
     INITIALISATION
  --------------------------------------------------------- */

  async function init() {
    if (state.initialized) return;

    state.initialized = true;

    setupSearch();
    setupNavigation();
    setupProjectButtons();

    setupRecordingButtons();

    setupButtonSounds();

    setupTheme();
    setupAudioControls();
    setupVoiceControls();

    setupSpeakButtons();

    setupModals();
    setupMobileMenu();

    setupScrollAnimations();
    setupParallax();

    setupCursorEffects();

    setupParticles();
    setupThreeJS();
    setupVR();

    setupKeyboard();
    setupExternalLinks();
    setupYear();

    reportCompatibility();

    /*
      On tente la musique après l'initialisation.
      Le navigateur peut la bloquer tant que l'utilisateur
      n'a pas interagi avec la page.
    */
    if (state.musicEnabled) {
      startBackgroundMusic();
    }

    console.info(
      "KAR Projects Hub : APP.JS chargé avec succès."
    );
  }

  /* ---------------------------------------------------------
     DOM READY
  --------------------------------------------------------- */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );
  } else {
    init();
  }

})();