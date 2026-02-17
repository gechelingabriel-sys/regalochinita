import { useCallback, useEffect, useRef, useState } from 'react';

const AUDIO_URL =
  "https://res.cloudinary.com/dswpi1pb9/video/upload/v1768829177/Bad_Bunny_-_Ojitos_Lindos_8D_AUDIO_HQ_ft._Bomba_Este%CC%81reo_cukav7.mp3";

/**
 * Audio strategy:
 * - Keep SFX on WebAudio (oscillators) for low-latency UI sounds.
 * - Keep background music on a plain HTMLAudioElement (NOT routed through AudioContext),
 *   so it has the best chance to keep playing when the screen locks / the tab is backgrounded
 *   (still subject to browser/OS policies).
 */
export const useAudio = () => {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainMasterRef = useRef<GainNode | null>(null);

  const bgmElementRef = useRef<HTMLAudioElement | null>(null);
  const fadeRafRef = useRef<number | null>(null);

  const initializedRef = useRef(false);
  const [musicPlaying, setMusicPlaying] = useState(false);

  const init = useCallback(() => {
    if (initializedRef.current) return;

    // --- WebAudio for SFX ---
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) {
      ctxRef.current = new AC();
      gainMasterRef.current = ctxRef.current.createGain();
      gainMasterRef.current.gain.value = 1;
      gainMasterRef.current.connect(ctxRef.current.destination);

      if (ctxRef.current.state === 'suspended') {
        ctxRef.current.resume().catch(() => { });
      }
    }

    // --- HTMLAudio for BGM ---
    const el = new Audio(AUDIO_URL);
    el.crossOrigin = 'anonymous';
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0; // we fade in
    // Defensive: some engines read these attributes even for audio elements
    el.setAttribute('playsinline', 'true');
    el.setAttribute('webkit-playsinline', 'true');
    bgmElementRef.current = el;

    // Optional: lock-screen controls (where supported)
    try {
      const ms = (navigator as any).mediaSession;
      if (ms) {
        ms.metadata = new (window as any).MediaMetadata({
          title: 'Radio del auto',
          artist: 'Bad Bunny ft. Bomba Estéreo',
          album: 'Ojitos Lindos (8D)',
        });
      }
    } catch {
      // ignore
    }

    initializedRef.current = true;
  }, []);

  // Cancel any pending fades on unmount
  useEffect(() => {
    return () => {
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
    };
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const play = useCallback(
    (type: string) => {
      if (!ctxRef.current || !gainMasterRef.current) return;

      // iOS can suspend the context; resume when user interacts
      if (ctxRef.current.state === 'suspended') {
        ctxRef.current.resume().catch(() => { });
      }

      const t = ctxRef.current.currentTime;

      if (type === 'metallic-click') {
        vibrate(50);
        const freqs = [800, 1200, 2400];
        freqs.forEach((f, i) => {
          const o = ctxRef.current!.createOscillator();
          o.type = i === 0 ? 'square' : 'sine';
          o.frequency.value = f;
          const gain = ctxRef.current!.createGain();
          gain.gain.setValueAtTime(0.1 / (i + 1), t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          o.connect(gain);
          gain.connect(gainMasterRef.current!);
          o.start(t);
          o.stop(t + 0.15);
        });

        const oscLow = ctxRef.current.createOscillator();
        oscLow.type = 'triangle';
        oscLow.frequency.setValueAtTime(100, t);
        oscLow.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        const gainLow = ctxRef.current.createGain();
        gainLow.gain.setValueAtTime(0.5, t);
        gainLow.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        oscLow.connect(gainLow);
        gainLow.connect(gainMasterRef.current!);
        oscLow.start(t);
        oscLow.stop(t + 0.1);
      } else if (type === 'unlock') {
        vibrate([30, 50, 30]);
        const o = ctxRef.current.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(60, t);
        const ga = ctxRef.current.createGain();
        ga.gain.setValueAtTime(0.1, t);
        ga.gain.linearRampToValueAtTime(0, t + 0.5);
        o.connect(ga);
        ga.connect(gainMasterRef.current!);
        o.start(t);
        o.stop(t + 0.5);
      } else if (type === 'slam') {
        vibrate(200);
        const o = ctxRef.current.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(50, t);
        o.frequency.exponentialRampToValueAtTime(10, t + 0.6);
        const ga = ctxRef.current.createGain();
        ga.gain.setValueAtTime(0.8, t);
        ga.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        o.connect(ga);
        ga.connect(gainMasterRef.current!);
        o.start(t);
        o.stop(t + 0.6);
      } else if (type === 'grind') {
        vibrate(100);
        const o = ctxRef.current.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(40, t);
        const ga = ctxRef.current.createGain();
        ga.gain.setValueAtTime(0.05, t);
        ga.gain.linearRampToValueAtTime(0, t + 3);
        o.connect(ga);
        ga.connect(gainMasterRef.current!);
        o.start(t);
        o.stop(t + 3);
      } else if (type === 'drop') {
        const o = ctxRef.current.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(800, t);
        o.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        const ga = ctxRef.current.createGain();
        ga.gain.setValueAtTime(0.3, t);
        ga.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.connect(ga);
        ga.connect(gainMasterRef.current!);
        o.start(t);
        o.stop(t + 0.15);
      } else if (type === 'clink') {
        vibrate([20, 40, 20]);

        // Use a real glass clink audio for immersive toast experience
        // This creates the sensation of actually clinking glasses with the viewer
        const clinkAudio = new Audio('https://cdn.freesound.org/previews/434/434015_9051007-lq.mp3');
        clinkAudio.volume = 0.75;
        clinkAudio.play().catch(() => {
          // Fallback to synthetic if audio fails
          const o = ctxRef.current!.createOscillator();
          o.type = 'sine';
          o.frequency.setValueAtTime(2800, t);
          const g = ctxRef.current!.createGain();
          g.gain.setValueAtTime(0.2, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          o.connect(g);
          g.connect(gainMasterRef.current!);
          o.start(t);
          o.stop(t + 0.3);
        });
      }
    },
    [vibrate]
  );

  const fadeVolume = useCallback((to: number, ms: number) => {
    const el = bgmElementRef.current;
    if (!el) return;

    if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);

    const from = el.volume;
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      // Smoothstep easing
      const eased = p * p * (3 - 2 * p);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * eased));

      if (p < 1) {
        fadeRafRef.current = requestAnimationFrame(tick);
      } else {
        fadeRafRef.current = null;
      }
    };

    fadeRafRef.current = requestAnimationFrame(tick);
  }, []);

  const pauseTimeoutRef = useRef<number | null>(null);

  const playMusic = useCallback(() => {
    const el = bgmElementRef.current;
    if (!el) return;

    // CANCEL any pending pause
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }

    // Must be triggered by a user gesture on iOS/Android
    el.play()
      .then(() => {
        fadeVolume(0.6, 650);
        setMusicPlaying(true);
      })
      .catch(() => {
        // Autoplay blocked - UI will still show play button.
      });
  }, [fadeVolume]);

  const pauseMusic = useCallback(() => {
    const el = bgmElementRef.current;
    if (!el) return;

    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);

    fadeVolume(0, 420);

    // Store timeout ID to allow cancellation
    pauseTimeoutRef.current = window.setTimeout(() => {
      try {
        // Force pause if volume is low enough (fade completed)
        if (el.volume <= 0.05) {
          el.pause();
        }
      } catch {
        // ignore
      }
      pauseTimeoutRef.current = null;
    }, 450);

    setMusicPlaying(false);
  }, [fadeVolume]);

  const toggleMusic = useCallback(() => {
    if (musicPlaying) {
      pauseMusic();
    } else {
      playMusic();
    }
  }, [musicPlaying, playMusic, pauseMusic]);

  return {
    init,
    play,
    vibrate,
    playMusic,
    pauseMusic,
    toggleMusic,
    musicPlaying,
    isInitialized: initializedRef.current,
  };
};
