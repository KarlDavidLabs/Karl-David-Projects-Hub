/**
 * ============================================================================
 * KAR PROJECTS HUB - ULTIMATE APPLICATION SCRIPT
 * ============================================================================
 * Architecture : Modulaire, sécurisée, performante et adaptée à GitHub Pages
 * Compatibilité : HTML/CSS existants, Three.js, Motion (optionnel)
 * Signature   : By Appia · Karl David
 * ============================================================================
 */

(function () {
    'use strict';

    // --- 1. CONFIGURATION & ÉTAT GLOBAL ---
    const CONFIG = {
        version: '2.5.0',
        author: 'Appia · Karl David',
        audioBasePath: 'assets/audio/',
        sounds: {
            boot: 'boot.mp3',
            background: 'background.mp3',
            chord: 'chord.mp3',
            click: 'click.mp3',
            fx: 'fx.mp3',
            hover: 'hover.mp3',
            open: 'open.mp3',
            welcome: 'Record (mp3cut.net).mp3',
            toggle: 'toogle.mp3', // Attention à l'orthographe exacte confirmée
            transition: 'transition.mp3',
            whoosh: 'whoosh.mp3'
        },
        defaultTheme: 'standard',
        storageKeys: {
            theme: 'kar_theme',
            settings: 'kar_settings'
        }
    };

    const state = {
        theme: CONFIG.defaultTheme,
        audioEnabled: true,
        bgMusicEnabled: false,
        voiceEnabled: true,
        volume: 0.5,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        highQuality: true,
        isMobileMenuOpen: false,
        activeCategory: 'all',
        searchQuery: ''
    };

    // --- 2. GESTION DU STOCKAGE LOCAL (SÉCURISÉ) ---
    const Storage = {
        get(key, fallback) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : fallback;
            } catch (e) {
                console.warn(`[KAR Storage] Impossible de lire ${key}:`, e);
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.warn(`[KAR Storage] Impossible d'écrire ${key}:`, e);
            }
        }
    };

    // --- 3. SYSTÈME DE NOTIFICATIONS ---
    const Notifications = {
        container: null,
        init() {
            this.container = document.getElementById('kar-notifications-container');
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'kar-notifications-container';
                this.container.className = 'kar-notifications-container';
                document.body.appendChild(this.container);
            }
        },
        show(message, type = 'info', duration = 3500) {
            if (!this.container) this.init();
            const notif = document.createElement('div');
            notif.className = `kar-notification kar-notification-${type}`;
            notif.setAttribute('role', 'status');
            notif.setAttribute('aria-live', 'polite');
            notif.textContent = message;

            this.container.appendChild(notif);
            requestAnimationFrame(() => notif.classList.add('is-visible'));

            setTimeout(() => {
                notif.classList.remove('is-visible');
                setTimeout(() => notif.remove(), 300);
            }, duration);
        }
    };

    // --- 4. GESTIONNAIRE AUDIO CENTRALISÉ ---
    class AudioManager {
        constructor() {
            this.sounds = {};
            this.bgMusic = null;
            this.isInitialized = false;
            this.lastHoverTime = 0;
        }

        init() {
            if (this.isInitialized) return;
            
            // Charger les préférences audio
            const savedSettings = Storage.get(CONFIG.storageKeys.settings, {});
            if (typeof savedSettings.audioEnabled === 'boolean') state.audioEnabled = savedSettings.audioEnabled;
            if (typeof savedSettings.bgMusicEnabled === 'boolean') state.bgMusicEnabled = savedSettings.bgMusicEnabled;
            if (typeof savedSettings.voiceEnabled === 'boolean') state.voiceEnabled = savedSettings.voiceEnabled;
            if (typeof savedSettings.volume === 'number') state.volume = savedSettings.volume;

            // Pré-chargement sécurisé des effets sonores
            Object.entries(CONFIG.sounds).forEach(([key, filename]) => {
                const audio = new Audio(`${CONFIG.audioBasePath}${filename}`);
                audio.volume = state.volume;
                audio.preload = 'auto';
                audio.onerror = () => {
                    console.warn(`[KAR Audio] Fichier introuvable ou erreur de chargement : ${filename}`);
                };
                if (key === 'background') {
                    audio.loop = true;
                    this.bgMusic = audio;
                } else {
                    this.sounds[key] = audio;
                }
            });

            this.isInitialized = true;
        }

        play(soundKey) {
            if (!state.audioEnabled) return;
            const sound = this.sounds[soundKey];
            if (sound) {
                try {
                    sound.currentTime = 0;
                    sound.volume = state.volume;
                    sound.play().catch(err => {
                        // Empêche les erreurs de blocage autoplay du navigateur de polluer la console
                        console.debug(`[KAR Audio] Lecture bloquée ou impossible pour ${soundKey}:`, err);
                    });
                } catch (e) {
                    console.error(`[KAR Audio] Erreur lors de la lecture de ${soundKey}:`, e);
                }
            }
        }

        playHover() {
            const now = performance.now();
            if (now - this.lastHoverTime > 150) { // Anti-spam sur les survols rapides
                this.play('hover');
                this.lastHoverTime = now;
            }
        }

        toggleBgMusic(forceState) {
            if (!this.bgMusic) return;
            state.bgMusicEnabled = forceState !== undefined ? forceState : !state.bgMusicEnabled;
            
            if (state.bgMusicEnabled && state.audioEnabled) {
                this.bgMusic.volume = state.volume * 0.5; // Musique un peu plus douce
                this.bgMusic.play().catch(() => {
                    state.bgMusicEnabled = false;
                    Notifications.show("Lecture audio d'arrière-plan bloquée par le navigateur.", "info");
                });
            } else {
                this.bgMusic.pause();
            }
            this.saveSettings();
        }

        playWelcomeVoice() {
            if (!state.audioEnabled || !state.voiceEnabled) return;
            const welcomeSound = this.sounds['welcome'];
            if (welcomeSound) {
                welcomeSound.currentTime = 0;
                welcomeSound.volume = state.volume;
                welcomeSound.play().catch(() => {
                    // Repli Web Speech API si le fichier audio échoue
                    this.speakFallback("Bienvenue sur KAR Projects Hub. Interface initialisée avec succès.");
                });
            } else {
                this.speakFallback("Bienvenue sur KAR Projects Hub.");
            }
        }

        speakFallback(text) {
            if (!('speechSynthesis' in window) || !state.voiceEnabled) return;
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'fr-FR';
            utterance.volume = state.volume;
            const voices = window.speechSynthesis.getVoices();
            const frenchVoice = voices.find(v => v.lang.startsWith('fr'));
            if (frenchVoice) utterance.voice = frenchVoice;
            window.speechSynthesis.speak(utterance);
        }

        setVolume(val) {
            state.volume = Math.max(0, Math.min(1, val));
            Object.values(this.sounds).forEach(s => s.volume = state.volume);
            if (this.bgMusic) this.bgMusic.volume = state.volume * 0.5;
            this.saveSettings();
        }

        saveSettings() {
            const settings = Storage.get(CONFIG.storageKeys.settings, {});
            settings.audioEnabled = state.audioEnabled;
            settings.bgMusicEnabled = state.bgMusicEnabled;
            settings.voiceEnabled = state.voiceEnabled;
            settings.volume = state.volume;
            Storage.set(CONFIG.storageKeys.settings, settings);
        }
    }

    const audioManager = new AudioManager();

    // --- 5. SCÈNE 3D (THREE.JS) ---
    class ThreeSceneManager {
        constructor() {
            this.container = null;
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.particles = null;
            this.geometry = null;
            this.material = null;
            this.animationFrameId = null;
            this.mouseX = 0;
            this.mouseY = 0;
            this.targetX = 0;
            this.targetY = 0;
            this.isActive = false;
        }

        init() {
            this.container = document.getElementById('kar-three-container') || document.querySelector('.three-container');
            if (!this.container || typeof THREE === 'undefined') {
                console.info("[KAR 3D] Conteneur 3D absent ou bibliothèque Three.js non chargée. Mode dégradé activé.");
                return;
            }

            // Détection des performances pour ajuster la qualité
            if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
                state.highQuality = false;
            }

            try {
                this.scene = new THREE.Scene();

                const width = this.container.clientWidth || window.innerWidth;
                const height = this.container.clientHeight || window.innerHeight;

                this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
                this.camera.position.z = 30;

                this.renderer = new THREE.WebGLRenderer({ antialias: state.highQuality, alpha: true });
                this.renderer.setSize(width, height);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, state.highQuality ? 2 : 1));
                this.container.appendChild(this.renderer.domElement);

                // Création du champ de particules futuriste (Bleu électrique / Cyan)
                const particleCount = state.highQuality ? 1200 : 400;
                this.geometry = new THREE.BufferGeometry();
                const positions = new Float32Array(particleCount * 3);

                for (let i = 0; i < particleCount * 3; i += 3) {
                    positions[i] = (Math.random() - 0.5) * 60;
                    positions[i + 1] = (Math.random() - 0.5) * 60;
                    positions[i + 2] = (Math.random() - 0.5) * 60;
                }

                this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

                this.material = new THREE.PointsMaterial({
                    size: 0.35,
                    color: 0x00d2ff,
                    transparent: true,
                    opacity: 0.75,
                    blending: THREE.AdditiveBlending
                });

                this.particles = new THREE.Points(this.geometry, this.material);
                this.scene.add(this.particles);

                // Écouteurs d'événements
                window.addEventListener('resize', this.onWindowResize.bind(this), { passive: true });
                document.addEventListener('mousemove', this.onMouseMove.bind(this), { passive: true });
                document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));

                this.isActive = true;
                this.animate();
                console.info("[KAR 3D] Scène Three.js initialisée avec succès.");
            } catch (e) {
                console.error("[KAR 3D] Échec de l'initialisation WebGL :", e);
                this.destroy();
            }
        }

        onMouseMove(event) {
            if (!this.isActive || state.reducedMotion) return;
            this.mouseX = (event.clientX - window.innerWidth / 2) * 0.0005;
            this.mouseY = (event.clientY - window.innerHeight / 2) * 0.0005;
        }

        onWindowResize() {
            if (!this.container || !this.renderer || !this.camera) return;
            const width = this.container.clientWidth || window.innerWidth;
            const height = this.container.clientHeight || window.innerHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }

        onVisibilityChange() {
            if (document.hidden) {
                this.stop();
            } else if (this.isActive) {
                this.animate();
            }
        }

        animate() {
            if (!this.isActive || document.hidden) return;
            this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

            // Interpolation fluide (Lerp) de la position de la caméra
            this.targetX += (this.mouseX - this.targetX) * 0.05;
            this.targetY += (this.mouseY - this.targetY) * 0.05;

            if (this.camera) {
                this.camera.position.x += (this.targetX * 5 - this.camera.position.x) * 0.05;
                this.camera.position.y += (-this.targetY * 5 - this.camera.position.y) * 0.05;
                this.camera.lookAt(this.scene.position);
            }

            if (this.particles && !state.reducedMotion) {
                this.particles.rotation.y += 0.0010;
                this.particles.rotation.x += 0.0005;
            }

            this.renderer.render(this.scene, this.camera);
        }

        stop() {
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        }

        destroy() {
            this.stop();
            this.isActive = false;
            window.removeEventListener('resize', this.onWindowResize);
            document.removeEventListener('mousemove', this.onMouseMove);
            document.removeEventListener('visibilitychange', this.onVisibilityChange);

            if (this.geometry) this.geometry.dispose();
            if (this.material) this.material.dispose();
            if (this.renderer) {
                this.renderer.dispose();
                if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                    this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
                }
            }
        }
    }

    const threeScene = new ThreeSceneManager();

    // --- 6. SYSTÈME DE THÈMES ---
    const ThemeManager = {
        init() {
            const savedTheme = Storage.get(CONFIG.storageKeys.theme, CONFIG.defaultTheme);
            this.setTheme(savedTheme, false);

            // Liaison des sélecteurs de thèmes dans le DOM s'ils existent
            document.querySelectorAll('[data-kar-theme]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const themeName = e.currentTarget.getAttribute('data-kar-theme');
                    this.setTheme(themeName, true);
                    audioManager.play('toggle');
                });
            });
        },
        setTheme(themeName, notify = true) {
            state.theme = themeName;
            document.documentElement.setAttribute('data-theme', themeName);
            // Compatibilité avec les classes globales de thèmes
            document.body.className = document.body.className.replace(/theme-\S+/g, '');
            document.body.classList.add(`theme-${themeName}`);

            Storage.set(CONFIG.storageKeys.theme, themeName);

            if (notify) {
                Notifications.show(`Thème basculé : ${themeName.toUpperCase()}`, 'success');
            }
        }
    };

    // --- 7. NAVIGATION & MENU MOBILE ---
    const NavigationManager = {
        init() {
            const menuToggle = document.getElementById('kar-menu-toggle') || document.querySelector('.menu-toggle, .mobile-menu-btn');
            const navMenu = document.getElementById('kar-nav-menu') || document.querySelector('.nav-links, .nav-menu');

            if (menuToggle && navMenu) {
                menuToggle.addEventListener('click', () => {
                    state.isMobileMenuOpen = !state.isMobileMenuOpen;
                    navMenu.classList.toggle('is-open', state.isMobileMenuOpen);
                    menuToggle.setAttribute('aria-expanded', state.isMobileMenuOpen);
                    audioManager.play('click');
                });

                // Fermeture au clic sur un lien du menu mobile
                navMenu.querySelectorAll('a').forEach(link => {
                    link.addEventListener('click', () => {
                        if (state.isMobileMenuOpen) {
                            state.isMobileMenuOpen = false;
                            navMenu.classList.remove('is-open');
                            menuToggle.setAttribute('aria-expanded', 'false');
                        }
                    });
                });
            }

            // Gestion de la touche Échap pour fermer les menus/modales
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (state.isMobileMenuOpen && navMenu && menuToggle) {
                        state.isMobileMenuOpen = false;
                        navMenu.classList.remove('is-open');
                        menuToggle.setAttribute('aria-expanded', 'false');
                    }
                    ModalManager.closeAll();
                }
            });

            // Défilement fluide (Smooth Scroll) pour les ancres internes
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    const targetId = this.getAttribute('href');
                    if (targetId === '#') return;
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        e.preventDefault();
                        targetElement.scrollIntoView({
                            behavior: state.reducedMotion ? 'auto' : 'smooth'
                        });
                        audioManager.play('transition');
                    }
                });
            });
        }
    };

    // --- 8. FILTRES ET RECHERCHE DE PROJETS ---
    const ProjectManager = {
        init() {
            const searchInput = document.getElementById('kar-search-input') || document.querySelector('.project-search, input[type="search"]');
            const categoryButtons = document.querySelectorAll('[data-kar-category]');
            const projectCards = document.querySelectorAll('.project-card, [data-project-category]');

            if (projectCards.length === 0) return;

            const filterProjects = () => {
                const query = state.searchQuery.toLowerCase().trim();
                let visibleCount = 0;

                projectCards.forEach(card => {
                    const title = card.querySelector('h2, h3, .project-title')?.textContent.toLowerCase() || '';
                    const desc = card.querySelector('p, .project-description')?.textContent.toLowerCase() || '';
                    const category = card.getAttribute('data-project-category') || 'all';

                    const matchesSearch = title.includes(query) || desc.includes(query);
                    const matchesCategory = state.activeCategory === 'all' || category === state.activeCategory;

                    if (matchesSearch && matchesCategory) {
                        card.style.display = '';
                        visibleCount++;
                        requestAnimationFrame(() => card.classList.add('is-visible'));
                    } else {
                        card.style.display = 'none';
                        card.classList.remove('is-visible');
                    }
                });

                // Gestion de l'état vide (Empty State)
                const emptyState = document.getElementById('kar-empty-state');
                if (emptyState) {
                    emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
                }
            };

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    state.searchQuery = e.target.value;
                    filterProjects();
                });
            }

            categoryButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    categoryButtons.forEach(b => b.classList.remove('active', 'is-active'));
                    e.currentTarget.classList.add('active', 'is-active');
                    state.activeCategory = e.currentTarget.getAttribute('data-kar-category') || 'all';
                    filterProjects();
                    audioManager.play('click');
                });
            });

            // Sécurisation et validation des liens officiels confirmés
            projectCards.forEach(card => {
                const link = card.querySelector('a');
                if (link) {
                    link.addEventListener('mouseenter', () => audioManager.playHover());
                    link.addEventListener('click', () => audioManager.play('open'));
                }
            });
        }
    };

    // --- 9. FENÊTRES MODALES & PARAMÈTRES ---
    const ModalManager = {
        init() {
            // Boutons d'ouverture de modales (ex: Paramètres, À propos, Crédits)
            document.querySelectorAll('[data-kar-modal-target]').forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    const modalId = e.currentTarget.getAttribute('data-kar-modal-target');
                    this.open(modalId);
                    audioManager.play('open');
                });
            });

            // Boutons de fermeture
            document.querySelectorAll('.kar-modal-close, [data-kar-modal-close]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.closeAll();
                    audioManager.play('click');
                });
            });

            // Fermeture au clic sur l'arrière-plan (backdrop)
            document.querySelectorAll('.kar-modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.close(modal.id);
                    }
                });
            });

            // Initialisation des contrôles du panneau des paramètres
            this.initSettingsPanel();
        },

        open(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('is-open');
                modal.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
            }
        },

        close(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('is-open');
                modal.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
            }
        },

        closeAll() {
            document.querySelectorAll('.kar-modal.is-open').forEach(modal => {
                modal.classList.remove('is-open');
                modal.setAttribute('aria-hidden', 'true');
            });
            document.body.style.overflow = '';
        },

        initSettingsPanel() {
            const audioToggle = document.getElementById('kar-setting-audio');
            const musicToggle = document.getElementById('kar-setting-music');
            const voiceToggle = document.getElementById('kar-setting-voice');
            const volumeSlider = document.getElementById('kar-setting-volume');
            const motionToggle = document.getElementById('kar-setting-motion');

            if (audioToggle) {
                audioToggle.checked = state.audioEnabled;
                audioToggle.addEventListener('change', (e) => {
                    state.audioEnabled = e.target.checked;
                    audioManager.saveSettings();
                    Notifications.show(state.audioEnabled ? "Sons activés" : "Sons désactivés", "info");
                });
            }

            if (musicToggle) {
                musicToggle.checked = state.bgMusicEnabled;
                musicToggle.addEventListener('change', (e) => {
                    audioManager.toggleBgMusic(e.target.checked);
                    Notifications.show(state.bgMusicEnabled ? "Musique d'ambiance activée" : "Musique coupée", "info");
                });
            }

            if (voiceToggle) {
                voiceToggle.checked = state.voiceEnabled;
                voiceToggle.addEventListener('change', (e) => {
                    state.voiceEnabled = e.target.checked;
                    audioManager.saveSettings();
                    Notifications.show(state.voiceEnabled ? "Voix d'accueil activée" : "Voix désactivée", "info");
                });
            }

            if (volumeSlider) {
                volumeSlider.value = state.volume;
                volumeSlider.addEventListener('input', (e) => {
                    audioManager.setVolume(parseFloat(e.target.value));
                });
            }

            if (motionToggle) {
                motionToggle.checked = !state.reducedMotion;
                motionToggle.addEventListener('change', (e) => {
                    state.reducedMotion = !e.target.checked;
                    if (state.reducedMotion) {
                        threeScene.stop();
                    } else {
                        threeScene.animate();
                    }
                    Notifications.show(state.reducedMotion ? "Animations réduites" : "Animations fluides activées", "info");
                });
            }
        }
    };

    // --- 10. INTERACTION GLOBALE & ACCUEIL ---
    const ExperienceManager = {
        init() {
            // Bouton de déclenchement de la voix d'accueil ou interaction initiale utilisateur
            const welcomeTriggers = document.querySelectorAll('#kar-welcome-btn, .welcome-trigger, [data-kar-welcome]');
            welcomeTriggers.forEach(btn => {
                btn.addEventListener('click', () => {
                    audioManager.playWelcomeVoice();
                    Notifications.show("Lecture de la voix d'accueil...", "success");
                });
            });

            // Premier clic utilisateur global pour débloquer l'audio du navigateur proprement
            const unlockAudioOnce = () => {
                audioManager.init();
                // Joue le son de boot au premier contact significatif si souhaité
                audioManager.play('boot');
                window.removeEventListener('click', unlockAudioOnce);
                window.removeEventListener('keydown', unlockAudioOnce);
            };

            window.addEventListener('click', unlockAudioOnce, { once: true });
            window.addEventListener('keydown', unlockAudioOnce, { once: true });

            // Bouton de retour en haut (Back to Top)
            const backToTopBtn = document.getElementById('kar-back-to-top') || document.querySelector('.back-to-top');
            if (backToTopBtn) {
                window.addEventListener('scroll', () => {
                    if (window.scrollY > 400) {
                        backToTopBtn.classList.add('is-visible');
                    } else {
                        backToTopBtn.classList.remove('is-visible');
                    }
                }, { passive: true });

                backToTopBtn.addEventListener('click', () => {
                    window.scrollTo({
                        top: 0,
                        behavior: state.reducedMotion ? 'auto' : 'smooth'
                    });
                    audioManager.play('transition');
                });
            }

            // Signature obligatoire dans la console pour traçabilité technique
            console.log(
                `%c KAR PROJECTS HUB v${CONFIG.version} %c By Appia · Karl David `,
                'background: #00d2ff; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
                'background: #111; color: #00d2ff; font-weight: bold; padding: 4px 8px; border-radius: 0 4px 4px 0;'
            );
        }
    };

    // --- 11. INITIALISATION GÉNÉRALE AU CHARGEMENT ---
    document.addEventListener('DOMContentLoaded', () => {
        try {
            Notifications.init();
            ThemeManager.init();
            NavigationManager.init();
            ProjectManager.init();
            ModalManager.init();
            ExperienceManager.init();
            
            // Initialisation de Three.js avec un léger délai pour prioriser le rendu DOM critique
            setTimeout(() => {
                threeScene.init();
            }, 100);

        } catch (error) {
            console.error("[KAR Hub] Erreur critique lors de l'initialisation principale :", error);
            Notifications.show("Une erreur est survenue lors du chargement de l'interface.", "error");
        }
    });

    // Nettoyage propre lors du déchargement de la page
    window.addEventListener('beforeunload', () => {
        threeScene.destroy();
    });

})();