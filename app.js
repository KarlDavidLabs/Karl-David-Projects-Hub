/**
 * ============================================================================
 * KAR PROJECTS HUB — app.js (Production Ready)
 * Creator: Karl David
 * Repository: https://github.com/anormadaise2-ops/Karl-David-Projects-Hub
 * URL: https://anormadaise2-ops.github.io/Karl-David-Projects-Hub/
 * ============================================================================
 */

(function () {
    'use strict';

    // Configuration globale et stockage des états
    const CONFIG = {
        storagePrefix: 'kar_hub_',
        defaultTheme: 'dark',
        defaultVolume: 0.3,
        audioEnabled: false,
        ambientEnabled: false,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };

    // État de l'application
    const state = {
        currentTheme: CONFIG.defaultTheme,
        audioInitialized: false,
        audioContext: null,
        masterGain: null,
        ambientOscillator: null,
        soundEnabled: false,
        isMuted: false,
        volume: CONFIG.defaultVolume,
        activeFilters: new Set(['all']),
        searchQuery: '',
        guidedTourActive: false,
        guidedTourStep: 0,
        threeRenderer: null,
        threeScene: null,
        threeCamera: null,
        threeAnimationId: null,
        particlesMesh: null
    };

    // Stockage sécurisé des préférences
    const Storage = {
        get(key, fallback) {
            try {
                const val = localStorage.getItem(CONFIG.storagePrefix + key);
                return val !== null ? JSON.parse(val) : fallback;
            } catch (e) {
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(CONFIG.storagePrefix + key, JSON.stringify(value));
            } catch (e) {
                console.warn('localStorage indisponible ou saturé.', e);
            }
        }
    };

    /**
     * Initialisation principale au chargement du DOM
     */
    document.addEventListener('DOMContentLoaded', () => {
        initApp();
    });

    function initApp() {
        try {
            initThemeSystem();
            initAudioSystem();
            initNavigation();
            initProjectSearch();
            initProjectFilters();
            initProjectCards();
            initSettings();
            initThreeBackground();
            initMotionEffects();
            initScrollAnimations();
            initGuidedTour();
            initAccessibility();
            initPerformanceOptimizations();
            initErrorHandling();

            console.info('KAR Projects Hub : Application initialisée avec succès.');
        } catch (error) {
            console.error('Erreur lors de l’initialisation de KAR Projects Hub :', error);
        }
    }

    /**
     * 1. Système de Thèmes
     */
    function initThemeSystem() {
        const savedTheme = Storage.get('theme', CONFIG.defaultTheme);
        setTheme(savedTheme, false);

        // Connexion des boutons / sélecteurs de thème s'ils existent
        const themeToggles = document.querySelectorAll('[data-theme-toggle], .theme-selector, #themeToggle');
        themeToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const themes = ['dark', 'midnight', 'cyber', 'light', 'aurora', 'minimal'];
                const currentIndex = themes.indexOf(state.currentTheme);
                const nextTheme = themes[(currentIndex + 1) % themes.length];
                setTheme(nextTheme, true);
                playSound('click');
            });
        });
    }

    function setTheme(themeName, save = true) {
        state.currentTheme = themeName;
        document.documentElement.setAttribute('data-theme', themeName);
        document.body.className = document.body.className.replace(/theme-\S+/g, '');
        document.body.classList.add(`theme-${themeName}`);

        if (save) {
            Storage.set('theme', themeName);
        }
    }

    /**
     * 2. Système Audio (Web Audio API)
     */
    function initAudioSystem() {
        state.soundEnabled = Storage.get('soundEnabled', false);
        state.volume = Storage.get('volume', CONFIG.defaultVolume);

        const muteBtn = document.querySelector('#muteToggle, [data-action="toggle-mute"]');
        const volumeSlider = document.querySelector('#volumeSlider, [data-action="set-volume"]');

        if (muteBtn) {
            muteBtn.setAttribute('aria-pressed', !state.soundEnabled);
            muteBtn.addEventListener('click', () => {
                state.soundEnabled = !state.soundEnabled;
                Storage.set('soundEnabled', state.soundEnabled);
                muteBtn.setAttribute('aria-pressed', !state.soundEnabled);
                playSound('click');
            });
        }

        if (volumeSlider) {
            volumeSlider.value = state.volume;
            volumeSlider.addEventListener('input', (e) => {
                state.volume = parseFloat(e.target.value);
                Storage.set('volume', state.volume);
                if (state.masterGain) {
                    state.masterGain.gain.setValueAtTime(state.volume, state.audioContext.currentTime);
                }
            });
        }

        // Activation globale après premier geste utilisateur (conformité autoplay)
        const unlockAudio = () => {
            if (!state.audioInitialized) {
                initWebAudio();
                state.audioInitialized = true;
            }
            window.removeEventListener('pointerdown', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };
        window.addEventListener('pointerdown', unlockAudio);
        window.addEventListener('keydown', unlockAudio);
    }

    function initWebAudio() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            state.audioContext = new AudioContext();
            state.masterGain = state.audioContext.createGain();
            state.masterGain.gain.setValueAtTime(state.volume, state.audioContext.currentTime);
            state.masterGain.connect(state.audioContext.destination);
        } catch (e) {
            console.warn('Web Audio API non prise en charge ou bloquée.', e);
        }
    }

    function playSound(type) {
        if (!state.soundEnabled || !state.audioContext || !state.masterGain) return;
        if (state.audioContext.state === 'suspended') {
            state.audioContext.resume();
        }

        try {
            const osc = state.audioContext.createOscillator();
            const gain = state.audioContext.createGain();
            const now = state.audioContext.currentTime;

            osc.connect(gain);
            gain.connect(state.masterGain);

            if (type === 'click') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            } else if (type === 'success') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(880, now + 0.08);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            }
        } catch (err) {
            // Ignorer silencieusement les erreurs audio mineures
        }
    }

    /**
     * 3. Navigation et Défilement Fluide
     */
    function initNavigation() {
        const navLinks = document.querySelectorAll('a[href^="#"]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href');
                if (targetId === '#') return;
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: CONFIG.reducedMotion ? 'auto' : 'smooth'
                    });
                    playSound('click');

                    // Fermeture du menu mobile si ouvert
                    const mobileNav = document.querySelector('.mobile-nav, nav.active, .nav-menu.open');
                    if (mobileNav) {
                        mobileNav.classList.remove('active', 'open');
                    }
                }
            });
        });

        // Bouton Retour en haut
        const scrollTopBtn = document.querySelector('#scrollTop, .scroll-top-btn');
        if (scrollTopBtn) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 400) {
                    scrollTopBtn.classList.add('visible');
                } else {
                    scrollTopBtn.classList.remove('visible');
                }
            });
            scrollTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: CONFIG.reducedMotion ? 'auto' : 'smooth' });
                playSound('click');
            });
        }
    }

    /**
     * 4. Recherche de Projets
     */
    function initProjectSearch() {
        const searchInput = document.querySelector('#projectSearch, input[name="search"], .search-input');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.trim().toLowerCase();
            filterProjects();
        });
    }

    /**
     * 5. Filtres et Catégories
     */
    function initProjectFilters() {
        const filterButtons = document.querySelectorAll('[data-filter], .filter-btn, .category-chip');
        if (filterButtons.length === 0) return;

        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const filterValue = btn.getAttribute('data-filter') || btn.textContent.trim().toLowerCase();

                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (filterValue === 'all' || filterValue === 'tous') {
                    state.activeFilters = new Set(['all']);
                } else {
                    state.activeFilters.delete('all');
                    if (state.activeFilters.has(filterValue)) {
                        state.activeFilters.delete(filterValue);
                        if (state.activeFilters.size === 0) state.activeFilters.add('all');
                    } else {
                        state.activeFilters.add(filterValue);
                    }
                }

                filterProjects();
                playSound('click');
            });
        });
    }

    function filterProjects() {
        const cards = document.querySelectorAll('.project-card, .card, [data-project]');
        let visibleCount = 0;

        cards.forEach(card => {
            const title = (card.querySelector('h2, h3, .project-title')?.textContent || '').toLowerCase();
            const desc = (card.querySelector('p, .project-description')?.textContent || '').toLowerCase();
            const categories = (card.getAttribute('data-category') || card.dataset.categories || '').toLowerCase();
            const tags = (card.getAttribute('data-tags') || '').toLowerCase();

            const matchesSearch = state.searchQuery === '' || 
                title.includes(state.searchQuery) || 
                desc.includes(state.searchQuery) || 
                tags.includes(state.searchQuery);

            let matchesFilter = state.activeFilters.has('all');
            if (!matchesFilter) {
                for (const filter of state.activeFilters) {
                    if (categories.includes(filter) || tags.includes(filter)) {
                        matchesFilter = true;
                        break;
                    }
                }
            }

            if (matchesSearch && matchesFilter) {
                card.style.display = '';
                card.classList.add('fade-in');
                visibleCount++;
            } else {
                card.style.display = 'none';
                card.classList.remove('fade-in');
            }
        });

        // Mise à jour d'un compteur de résultats éventuel
        const countDisplay = document.querySelector('#resultCount, .result-counter');
        if (countDisplay) {
            countDisplay.textContent = visibleCount;
        }
    }

    /**
     * 6. Cartes de Projets Interactives
     */
    function initProjectCards() {
        const cards = document.querySelectorAll('.project-card, .card');
        cards.forEach(card => {
            // Effet d'élévation au survol si non réduit
            if (!CONFIG.reducedMotion) {
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const xc = rect.width / 2;
                    const yc = rect.height / 2;
                    const dx = (x - xc) / xc;
                    const dy = (y - yc) / yc;

                    card.style.transform = `translateY(-4px) rotateX(${-dy * 3}deg) rotateY(${dx * 3}deg)`;
                });

                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'translateY(0px) rotateX(0deg) rotateY(0deg)';
                });
            }

            // Bouton de copie de lien ou autre micro-interaction
            const copyBtn = card.querySelector('.copy-link, [data-action="copy"]');
            if (copyBtn) {
                copyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const link = card.querySelector('a')?.href || window.location.href;
                    navigator.clipboard.writeText(link).then(() => {
                        playSound('success');
                        const originalText = copyBtn.textContent;
                        copyBtn.textContent = 'Copié !';
                        setTimeout(() => copyBtn.textContent = originalText, 2000);
                    });
                });
            }
        });
    }

    /**
     * 7. Panneau de Paramètres
     */
    function initSettings() {
        const settingsPanel = document.querySelector('#settingsPanel, .settings-modal, .settings-drawer');
        const settingsToggle = document.querySelector('#settingsToggle, [data-action="toggle-settings"]');
        const closeSettings = document.querySelector('#closeSettings, [data-action="close-settings"]');

        if (!settingsToggle) return;

        settingsToggle.addEventListener('click', () => {
            if (settingsPanel) {
                settingsPanel.classList.toggle('open');
                settingsPanel.setAttribute('aria-hidden', !settingsPanel.classList.contains('open'));
                playSound('click');
            }
        });

        if (closeSettings && settingsPanel) {
            closeSettings.addEventListener('click', () => {
                settingsPanel.classList.remove('open');
                settingsPanel.setAttribute('aria-hidden', 'true');
                playSound('click');
            });
        }
    }

    /**
     * 8. Arrière-plan 3D Immersif (Three.js Optionnel)
     */
    function initThreeBackground() {
        const container = document.querySelector('#threeContainer, #canvas-background, .three-bg');
        if (!container || typeof THREE === 'undefined' || CONFIG.reducedMotion) return;

        try {
            const scene = new THREE.Scene();
            state.threeScene = scene;

            const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 50;
            state.threeCamera = camera;

            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.domElement.style.position = 'absolute';
            renderer.domElement.style.top = '0';
            renderer.domElement.style.left = '0';
            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
            renderer.domElement.style.pointerEvents = 'none';
            renderer.domElement.style.zIndex = '-1';
            container.appendChild(renderer.domElement);
            state.threeRenderer = renderer;

            // Création d'un champ de particules futuriste
            const particlesCount = 800;
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(particlesCount * 3);

            for (let i = 0; i < particlesCount * 3; i++) {
                positions[i] = (Math.random() - 0.5) * 150;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const material = new THREE.PointsMaterial({
                color: 0x00f0ff,
                size: 0.8,
                transparent: true,
                opacity: 0.6
            });

            const particles = new THREE.Points(geometry, material);
            scene.add(particles);
            state.particlesMesh = particles;

            // Animation Loop
            let clock = new THREE.Clock();
            const animate = () => {
                state.threeAnimationId = requestAnimationFrame(animate);
                const elapsedTime = clock.getElapsedTime();

                if (state.particlesMesh) {
                    state.particlesMesh.rotation.y = elapsedTime * 0.03;
                    state.particlesMesh.rotation.x = elapsedTime * 0.015;
                }

                renderer.render(scene, camera);
            };
            animate();

            // Gestion du redimensionnement
            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });

        } catch (e) {
            console.warn('Impossible d’initialiser Three.js :', e);
        }
    }

    /**
     * 9. Motion Design et Effets Visuels
     */
    function initMotionEffects() {
        // Suivi léger de souris pour éléments décoratifs (Parallaxe)
        if (CONFIG.reducedMotion) return;

        let mouseX = 0, mouseY = 0;
        window.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 20;

            const parallaxLayers = document.querySelectorAll('.parallax-layer');
            parallaxLayers.forEach(layer => {
                const speed = parseFloat(layer.getAttribute('data-speed') || 1);
                layer.style.transform = `translate(${mouseX * speed}px, ${mouseY * speed}px)`;
            });
        });
    }

    /**
     * 10. Animations au Défilement (IntersectionObserver)
     */
    function initScrollAnimations() {
        const animatedElements = document.querySelectorAll('.animate-on-scroll, section, .project-card');
        if (animatedElements.length === 0 || !('IntersectionObserver' in window)) return;

        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries, observerInstance) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observerInstance.unobserve(entry.target);
                }
            });
        }, observerOptions);

        animatedElements.forEach(el => {
            if (CONFIG.reducedMotion) {
                el.classList.add('is-visible');
            } else {
                observer.observe(el);
            }
        });
    }

    /**
     * 11. Guide Interactif (Visite Guidée)
     */
    function initGuidedTour() {
        const tourBtn = document.querySelector('#startTour, [data-action="start-tour"]');
        if (!tourBtn) return;

        tourBtn.addEventListener('click', () => {
            state.guidedTourActive = true;
            state.guidedTourStep = 0;
            runTourStep();
            playSound('click');
        });
    }

    function runTourStep() {
        const steps = [
            { title: 'Bienvenue sur KAR Projects Hub', text: 'Découvrez l’ensemble des projets de Karl David.' },
            { title: 'Recherche instantanée', text: 'Utilisez la barre de recherche pour trouver rapidement un projet par nom ou technologie.' },
            { title: 'Filtres par catégories', text: 'Triez les projets par domaine (Web, Sécurité, Outils, etc.).' },
            { title: 'Paramètres & Thèmes', text: 'Personnalisez l’apparence et activez les retours sonores selon vos préférences.' }
        ];

        if (state.guidedTourStep >= steps.length) {
            state.guidedTourActive = false;
            return;
        }

        const current = steps[state.guidedTourStep];
        // Affichage simple d'une modale ou notification du guide
        alert(`${current.title}\n\n${current.text}`);
        state.guidedTourStep++;
        if (state.guidedTourActive) {
            runTourStep();
        }
    }

    /**
     * 12. Accessibilité
     */
    function initAccessibility() {
        // Amélioration de la navigation au clavier
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.querySelector('.settings-modal.open, .modal.open');
                if (modal) {
                    modal.classList.remove('open');
                }
            }
        });
    }

    /**
     * 13. Optimisations de Performance & Gestion Visibilité
     */
    function initPerformanceOptimizations() {
        // Pause de l'animation 3D si l'onglet est masqué
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (state.threeAnimationId) {
                    cancelAnimationFrame(state.threeAnimationId);
                    state.threeAnimationId = null;
                }
            } else {
                if (state.threeRenderer && state.threeScene && state.threeCamera && !state.threeAnimationId) {
                    const animate = () => {
                        state.threeAnimationId = requestAnimationFrame(animate);
                        state.threeRenderer.render(state.threeScene, state.threeCamera);
                    };
                    animate();
                }
            }
        });
    }

    /**
     * 14. Gestion Globale des Erreurs
     */
    function initErrorHandling() {
        window.addEventListener('error', (event) => {
            console.warn('Erreur front-end interceptée par KAR Hub :', event.message);
        });
    }

})();