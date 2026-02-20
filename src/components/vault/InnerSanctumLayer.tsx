import React, { useState, useCallback, useEffect, useRef } from 'react';


interface FuseSVGProps {
  countdown: number; // 0-5
}

// Self-contained fuse component — spark positioned via getPointAtLength (iOS-safe)
const FUSE_PATH = "M5,75 C20,60 40,20 65,35 S95,5 120,10";
const FUSE_TOTAL_LENGTH = 145; // approx pathLength for viewBox 0 0 130 80

const FuseSVG: React.FC<FuseSVGProps> = ({ countdown }) => {
  const burnPathRef = useRef<SVGPathElement | null>(null);
  const [spark, setSpark] = useState({ x: 120, y: 10 }); // SVG coords at tip

  // Progress: 0=unburnt (tip), 1=fully burnt (reaches bundle)
  const progress = 1 - (countdown / 5); // 0→1 as time elapses
  // dashoffset: starts at TOTAL (hidden), goes toward 0 (fully revealed)
  // Burn goes from TIP (end of path at 100%) backward to start (bundle end)
  // We reveal from end → start: dashoffset = TOTAL * (1-progress) means tip burns first
  const burnedLength = FUSE_TOTAL_LENGTH * progress;
  const dashOffset = FUSE_TOTAL_LENGTH - burnedLength;

  // Update spark position on the actual SVG path (getPointAtLength)
  useEffect(() => {
    const path = burnPathRef.current;
    if (!path) return;
    try {
      const totalLen = path.getTotalLength();
      // Spark is at the current burn front: from the END of the path going backwards
      const distFromEnd = totalLen * (1 - progress);
      // Clamp to valid range
      const clampedDist = Math.max(0, Math.min(totalLen, distFromEnd));
      const pt = path.getPointAtLength(totalLen - clampedDist);
      setSpark({ x: pt.x, y: pt.y });
    } catch (e) {
      // Fallback: linear interpolation between tip and start
      setSpark({ x: 120 - progress * 115, y: 10 + progress * 65 });
    }
  }, [progress]);

  return (
    <svg
      className="fuse-svg"
      viewBox="0 0 130 80"
      style={{
        position: 'absolute',
        top: '-72px',
        right: '-50px',
        width: '160px',
        height: '90px',
        overflow: 'visible',
        zIndex: 10,
        pointerEvents: 'none',
        transform: 'rotateZ(-5deg)',
      }}
    >
      {/* Rope background — full fuse */}
      <path
        d={FUSE_PATH}
        fill="none"
        stroke="#5a4b3c"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray="3 5"
        style={{ filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.5))' }}
      />
      {/* Burn overlay — revealed from TIP toward bundle */}
      <path
        ref={burnPathRef}
        d={FUSE_PATH}
        fill="none"
        stroke="#ff7700"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${FUSE_TOTAL_LENGTH} ${FUSE_TOTAL_LENGTH}`}
        strokeDashoffset={dashOffset}
        style={{
          filter: 'drop-shadow(0 0 6px #ff4400) drop-shadow(0 0 14px #ffaa00)',
          transition: 'stroke-dashoffset 0.05s linear',
        }}
      />
      {/* Spark — glowing circle anchored to burn point via getPointAtLength */}
      {progress < 1 && progress > 0 && (
        <>
          {/* Outer glow */}
          <circle
            cx={spark.x}
            cy={spark.y}
            r={9}
            fill="rgba(255,200,0,0.25)"
            style={{ animation: 'sparkPulse 0.07s infinite alternate' }}
          />
          {/* Core spark */}
          <circle
            cx={spark.x}
            cy={spark.y}
            r={4}
            fill="#fff"
            style={{
              filter: 'drop-shadow(0 0 5px #ffcc00) drop-shadow(0 0 12px #ff5500)',
              animation: 'sparkPulse 0.07s infinite alternate',
            }}
          />
        </>
      )}
    </svg>
  );
};

const APEROL_VIDEO = "https://res.cloudinary.com/dswpi1pb9/video/upload/v1771271800/asset_apperol_gab_whi7ht.mp4";

interface InnerSanctumLayerProps {
  isActive: boolean;
  playSound: (type: string) => void;
  toggleMusic: () => void;
  musicPlaying: boolean;
}

export const InnerSanctumLayer: React.FC<InnerSanctumLayerProps> = ({
  isActive,
  playSound,
  toggleMusic,
  musicPlaying
}) => {
  const [phase, setPhase] = useState<'door' | 'folder-closed' | 'folder-opening' | 'revealed' | 'case-closed'>('door');
  const [handleRotation, setHandleRotation] = useState(0);
  const [doorOpening, setDoorOpening] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1); // Default 1:1 ratio
  const videoRef = useRef<HTMLVideoElement>(null);
  const ghostVideoRef = useRef<HTMLVideoElement>(null);
  const [drunkPhrase, setDrunkPhrase] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const drunkLevelRef = useRef(0); // Ref for audio access

  // SELF DESTRUCT STATE
  const [selfDestructActive, setSelfDestructActive] = useState(false);
  const [countdown, setCountdown] = useState(5.0); // Float for smooth progress
  const [missionTerminated, setMissionTerminated] = useState(false);
  const [explosionPhase, setExplosionPhase] = useState<'none' | 'flash' | 'done'>('none');

  // FUSE SPARK: SVG path ref for getPointAtLength
  const fusePathRef = useRef<SVGPathElement | null>(null);
  const [sparkPos, setSparkPos] = useState({ x: 90, y: 10 }); // Start at fuse tip

  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // INTERACTION STATE FOR AUDIO
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleStartInteraction = useCallback(() => {
    // Aggressively resume
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => { });
    }
  }, [getAudioContext]);

  // Global Audio Unlock - For preview mode where no explicit button exists
  useEffect(() => {
    const unlock = () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      // Remove self
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, [getAudioContext]);


  // Preload image and get aspect ratio
  // Set 1:1 aspect ratio for the new video asset
  useEffect(() => {
    document.documentElement.style.setProperty('--image-aspect-ratio', '1');
  }, []);


  // Premium paper sound
  // Cardboard/Folder Open Sound - Heavier than paper
  const playFolderOpen = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const dur = 0.8;
      const buf = ctx.createBuffer(2, ctx.sampleRate * dur, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < buf.length; i++) {
          const t = i / buf.length;
          // White noise with envelope
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.5);
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = 1200; // Higher freq for texture

      const gn = ctx.createGain();
      gn.gain.setValueAtTime(0, ctx.currentTime);
      gn.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.1); // Fade in
      gn.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);

      src.connect(flt).connect(gn).connect(ctx.destination);
      src.start();
    } catch (e) { }
  }, [getAudioContext]);

  // REALISTIC APPLAUSE: Multiple discrete claps + cheering bed
  const playApplause = useCallback(() => {
    try {
      const ctx = getAudioContext();
      // Resume if suspended (attempt)
      if (ctx.state === 'suspended') ctx.resume().catch(() => { });

      // 1. CROWD NOISE BED (Pink Noise)
      const dur = 4.0;
      const buf = ctx.createBuffer(2, ctx.sampleRate * dur, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < buf.length; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 2.5));
        }
      }
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = buf;
      const noiseFlt = ctx.createBiquadFilter();
      noiseFlt.type = 'lowpass';
      noiseFlt.frequency.value = 800; // Muffled crowd
      const noiseGn = ctx.createGain();
      noiseGn.gain.setValueAtTime(0, ctx.currentTime);
      noiseGn.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.5); // Reduced (was 0.3) to not drown glass
      noiseGn.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
      noiseSrc.connect(noiseFlt).connect(noiseGn).connect(ctx.destination);
      noiseSrc.start();

      // 2. DISCRETE CLAPS (Randomized bursts)
      // A clap is a short burst of noise with a bandpass filter
      const triggerClap = (offset: number) => {
        const t = ctx.currentTime + offset;
        const clapDur = 0.15;
        const osc = ctx.createOscillator(); // Using noise buffer is better, but osc for simplicity in limited env? No, use buffer

        // Create small noise burst for clap
        const cBuf = ctx.createBuffer(1, ctx.sampleRate * clapDur, ctx.sampleRate);
        const cd = cBuf.getChannelData(0);
        for (let k = 0; k < cBuf.length; k++) {
          cd[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / cBuf.length, 4); // Fast decay
        }
        const cSrc = ctx.createBufferSource();
        cSrc.buffer = cBuf;

        const cFlt = ctx.createBiquadFilter();
        cFlt.type = 'bandpass';
        cFlt.frequency.value = 800 + Math.random() * 1200; // Varies pitch of clap
        cFlt.Q.value = 1;

        const cGn = ctx.createGain();
        cGn.gain.value = 0.1 + Math.random() * 0.2; // Varies volume

        cSrc.connect(cFlt).connect(cGn).connect(ctx.destination);
        cSrc.start(t);
      };

      // Spawn many claps
      const density = 30; // Claps per second (approx)
      for (let i = 0; i < 60; i++) {
        triggerClap(Math.random() * 3.0); // Spread over 3s
      }
      // Initial burst
      for (let i = 0; i < 15; i++) {
        triggerClap(Math.random() * 0.5);
      }

    } catch (e) { }
  }, [getAudioContext]);



  // PLAY GLASS SOUND - REALISTIC BASE64 (Short clear clink)
  const playGlass = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;

    // 1. IMPACT THUD - REMOVED for clean crystal sound
    // (User reported "gunshot" sound, so we remove the low freq kick completely)

    // 2. GLASS RINGING (Harmonics) - CRYSTAL CLEAR
    const freqs = [2000, 2400, 3200, 4800, 8000]; // Higher frequencies for "crystal" sound
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      // Pitch shift based on drunk level (simulated by rate if using buffer, but here using oscillators)
      // Only detune heavily if drunk level > 0
      const baseDetune = drunkLevelRef.current > 0 ? (drunkLevelRef.current * 100) : 0;
      const detuneAmount = (Math.random() - 0.5) * 50 + baseDetune;

      // For first click (clean), minimal variance. For drunk, heavy slide.
      if (drunkLevelRef.current === 0) {
        osc.frequency.setValueAtTime(f, t); // Stable
      } else {
        osc.frequency.linearRampToValueAtTime(f + detuneAmount, t + 1.5);
      }

      const vol = 0.3 / (i + 1); // Louder initial ring
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.01); // Faster attack
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0 - i * 0.2); // Longer decay

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 2.0);
    });
  }, []);

  // Confetti rain
  const spawnConfetti = useCallback((count = 80) => {
    playApplause(); // TRIGGER APPLAUSE
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.textContent = '🍗';
      el.style.cssText = `
        position: fixed;
        left: ${Math.random() * 100}vw;
        top: -60px;
        font-size: ${22 + Math.random() * 28}px;
        z-index: 99999;
        pointer-events: none;
        animation: confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 0.6}s forwards;
        transform: rotate(${Math.random() * 360}deg);
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 5000);
    }
  }, [playApplause]);

  // CASE CLOSED LOGIC
  const handleCloseCase = useCallback(() => {
    // 1. Play SLAM sound (reused door slam or heavier custom)
    playSound('slam'); // Reusing slam for now, maybe pitch shift?

    // 2. Animate Closing
    setPhase('case-closed');

    // 3. Play STAMP sound + Visual (delayed slightly to match close)
    setTimeout(() => {
      // Visual stamp handled by CSS on .folder-front.case-closed::after

      // Stamp Sound (Synthesized wood impact)
      try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();

        const t = ctx.currentTime;
        // Impact
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        g.gain.setValueAtTime(1, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.connect(g).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);

        // Paper slap high freq
        const noise = ctx.createBufferSource();
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        noise.buffer = buf;
        const nf = ctx.createBiquadFilter();
        nf.type = 'highpass';
        nf.frequency.value = 1000;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.5, t);
        ng.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        noise.connect(nf).connect(ng).connect(ctx.destination);
        noise.start(t);

      } catch (e) { }

    }, 600); // 0.6s after start (folder closes in 0.5s)

    // 4. Fade Out music
    // (Assuming toggleMusic handles pause, but we want fade out really)
    // For now simple stop
    // toggleMusic(); // Optional: maybe dramatic silence is better

    // 5. START SELF DESTRUCT (After stamp settles)
    setTimeout(() => {
      setSelfDestructActive(true);
    }, 2500); // 2.5s after close start -> allows reading CASE CLOSED for a moment

  }, [playSound, getAudioContext]);

  // COUNTDOWN LOGIC - HIGH PRECISION
  useEffect(() => {
    if (!selfDestructActive || missionTerminated) return;

    let startTime = Date.now();
    const duration = 5000;

    // Spark sound loop - CRACKLE
    const sparkInterval = setInterval(() => {
      try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        // Sizzle noise - Highpass
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Use noise buffer if available, else sawtooth
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400 + Math.random() * 1000, ctx.currentTime); // Higher pitch sizzle

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05); // Short sharp crackle

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;

        osc.connect(filter).connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } catch (e) { }
    }, 60);

    const checkTime = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 5000 - elapsed);

      // DRAMATIC TICK TOCK - CINEMA STYLE (Beep + Reverb)
      const prevSec = Math.ceil((remaining + 16) / 1000);
      const currSec = Math.ceil(remaining / 1000);

      if (currSec < prevSec && currSec > 0) {
        // PLAY HIGH TENSION BEEP
        try {
          const ctx = getAudioContext();
          if (ctx.state === 'suspended') ctx.resume();

          const t = ctx.currentTime;
          // Main Beep tone
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(2000, t); // Higher pitch "Counter Strike" style bomb beep

          const g = ctx.createGain();
          g.gain.setValueAtTime(0.3, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); // Short decay

          osc.connect(g).connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.2);

          // Echo/Delay for atmosphere
          const echo = ctx.createOscillator();
          echo.type = 'sine';
          echo.frequency.setValueAtTime(1000, t);
          const eg = ctx.createGain();
          eg.gain.setValueAtTime(0.05, t + 0.1);
          eg.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          echo.connect(eg).connect(ctx.destination);
          echo.start(t + 0.1);
          echo.stop(t + 0.6);

        } catch (e) { }
      }

      setCountdown(remaining / 1000);

      if (remaining <= 0) {
        clearInterval(sparkInterval);
        setExplosionPhase('flash');

        // Trigger Screen Shake globally
        document.body.classList.add('shake-screen');
        setTimeout(() => document.body.classList.remove('shake-screen'), 1000);

        // EXPLOSION SOUND - MAX IMPACT
        try {
          const ctx = getAudioContext();
          if (ctx.state === 'suspended') ctx.resume();

          const t = ctx.currentTime;

          // 1. KICK (Low frequency Sine sweep)
          const kick = ctx.createOscillator();
          kick.frequency.setValueAtTime(150, t);
          kick.frequency.exponentialRampToValueAtTime(20, t + 0.5);
          const kickG = ctx.createGain();
          kickG.gain.setValueAtTime(1.0, t);
          kickG.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

          // 2. RUMBLE / NOISE
          const bufSize = ctx.sampleRate * 2.5;
          const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);

          const noise = ctx.createBufferSource();
          noise.buffer = buf;
          // Lowpass sweep to simulate distance/mass
          const noiseF = ctx.createBiquadFilter();
          noiseF.type = 'lowpass';
          noiseF.frequency.setValueAtTime(3000, t);
          noiseF.frequency.exponentialRampToValueAtTime(100, t + 2.0);

          const noiseG = ctx.createGain();
          noiseG.gain.setValueAtTime(0.8, t);
          noiseG.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

          kick.connect(kickG).connect(ctx.destination);
          noise.connect(noiseF).connect(noiseG).connect(ctx.destination);

          kick.start(t);
          kick.stop(t + 1.0);
          noise.start(t);
        } catch (e) { }

        // Trigger actual content reveal 
        setTimeout(() => {
          setMissionTerminated(true);
          setExplosionPhase('done');
        }, 100);
      } else {
        requestAnimationFrame(checkTime);
      }
    };

    requestAnimationFrame(checkTime);
    return () => clearInterval(sparkInterval);
  }, [selfDestructActive, missionTerminated, getAudioContext]);

  // Main sequence - FLUID AGENCY PRO TIMING
  useEffect(() => {
    if (!isActive || phase !== 'door') return; // REMOVED hasInteracted check

    // Attempt silent resume
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => { });

    // Door sequence
    setTimeout(() => {
      playSound('slam'); // 200ms

      setTimeout(() => {
        setHandleRotation(720); // 400ms
        playSound('unlock');

        setTimeout(() => {
          playSound('grind'); // 800ms
          setDoorOpening(true);

          setTimeout(() => {
            setPhase('folder-closed'); // Folder appears closed

            // Allow user to digest "Confidential" for a longer moment
            setTimeout(() => {
              playFolderOpen(); // Cardboard sound
              setPhase('folder-opening'); // Folder starts opening (Book style)

              // Trigger confetti EARLIER (during open)
              setTimeout(() => spawnConfetti(150), 600);

              // The CSS animation takes ~1.8s. We reveal the contents once fully open.
              setTimeout(() => {
                setPhase('revealed');
              }, 1800); // Synced with longer animation

            }, 1600); // Long pause to see CONFIDENTIAL
          }, 1800); // Slow transition from door → folder
        }, 400);
      }, 400);
    }, 200);
  }, [isActive, phase, playSound, playFolderOpen, spawnConfetti, getAudioContext]);

  // ANDROID FALLBACK: Force opacity on final image after delay to ensure visibility
  useEffect(() => {
    if (missionTerminated) {
      // Force repaint/opacity after animation should have started
      const timer = setTimeout(() => {
        const img = document.querySelector('.final-evidence-img') as HTMLElement;
        if (img) {
          // Force styles if animation failed
          img.style.opacity = '1';
          img.style.transform = 'scale(1) rotate(0deg)';
          img.style.filter = 'brightness(1) contrast(1) blur(0) sepia(0) grayscale(0)';
        }
      }, 3500); // 3.5s delay (develop animation is 4s, but we force visibility if stuck)
      return () => clearTimeout(timer);
    }
  }, [missionTerminated]);

  // CHEERS LOGIC - BEER ONLY & BIFURCATION
  const [cheersCount, setCheersCount] = useState(0);
  const [drunkLevel, setDrunkLevel] = useState(0);

  // Bifurcation offset state - Permanent separation based on drunk level
  const [bifurcation, setBifurcation] = useState({ x: 0, y: 0 });

  const handleCheers = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAnimating) return; // LOCK: Prevent overlapping animations
    setIsAnimating(true);

    const newCount = cheersCount + 1;
    setCheersCount(newCount);

    // 1. START ANIMATION & VIDEO (FASTER speed)
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.5; // 1.5x speed for faster toast
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }

    // 2. GHOST ANIMATION - REMOVED (User requested no zoom/pop-out)
    // kept for reference or if we want to reuse the video element for something else
    if (ghostVideoRef.current) {
      // Ensure it stays hidden/reset
      const ghost = ghostVideoRef.current;
      ghost.classList.remove('ghost-escape-active');
    }

    // B. PHOTO 3D POPBACK - REMOVED

    // 2. TIMED IMPACT Peak (At 50% of 6s = 3000ms)
    setTimeout(() => {
      playGlass();
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

      // IMPACT REFRACTION FLASH
      const innerImg = document.querySelector('.polaroid-inner-img');
      if (innerImg) {
        const refraction = document.createElement('div');
        refraction.className = 'impact-refraction impact-active';
        innerImg.appendChild(refraction);
        setTimeout(() => refraction.remove(), 400);
      }

      // TOAST TEXT (STAMP)
      setTimeout(() => {
        let msg = "";
        if (newCount === 1) msg = "¡CHIN CHIN! 🥂";
        else if (newCount === 2) msg = "¡SALUD! 🥂";
        else if (newCount === 3) msg = "otro? salud 🥂";
        // Start drunk phrases from 4th
        else if (newCount === 4) msg = "otro? golosa 🤤🍹";
        else if (newCount === 5) msg = "UPS! salud 🥴🥂";
        else if (newCount === 6) msg = "en la pera 🍐🥴🍹";
        else msg = "hic hic... 🥴";

        const toast = document.createElement('div');
        toast.className = 'toast-text active';
        toast.innerHTML = msg;
        // Ensure Sharpness: Add strong shadow and remove blur if inherited
        toast.style.textShadow = '0 0 4px #000, 0 0 8px #000';
        toast.style.filter = 'blur(0px)';


        // Append to the polaroid frame so it moves with it
        document.querySelector('.polaroid-frame')?.appendChild(toast);
        setTimeout(() => toast.remove(), 1500);
      }, 100);

      // SHAKE EFFECT - VISUAL SYNC
      const polaroidFrame = document.querySelector('.polaroid-frame');
      if (polaroidFrame) {
        polaroidFrame.classList.remove('impact-shake');
        void (polaroidFrame as HTMLElement).offsetWidth; // Trigger reflow
        polaroidFrame.classList.add('impact-shake');
        setTimeout(() => polaroidFrame.classList.remove('impact-shake'), 500);
      }

      // BUBBLES EXPLOSION (Removed per request)
      // Removed the 25 particle generation loop here

      // GLOBAL SCREEN PULSE
      const pulseContainer = document.querySelector('.app-container');
      if (pulseContainer) {
        pulseContainer.classList.remove('impact-pulse-global');
        void (pulseContainer as HTMLElement).offsetWidth;
        pulseContainer.classList.add('impact-pulse-global');
        setTimeout(() => pulseContainer.classList.remove('impact-pulse-global'), 300);
      }


    }, 2000); // 2000ms = 3000 / 1.5


    // 3. DRUNK PROGRESSION (Visible from 5th click, Max at 8th)
    if (newCount >= 4) {
      // 4th click: Just text, clean visual
      // 5th click: Level 1 bifurcation
      // ...
      // 8th click: Max level 4
      const rawLevel = Math.max(0, newCount - 4);
      const cappedLevel = Math.min(rawLevel, 4); // CAP AT 4 Levels (8 clicks)

      setDrunkLevel(cappedLevel * 1.5); // Reduced intensity (was 2.0)
      drunkLevelRef.current = cappedLevel;

      const angle = Math.random() * Math.PI * 2;
      const mag = cappedLevel * 3; // Reduced separation (was 6)
      setBifurcation({
        x: Math.cos(angle) * mag,
        y: Math.sin(angle) * mag
      });

      // Global effects
      const scene = document.querySelector('.folder-3d-scene') as HTMLElement;
      if (scene) {
        scene.classList.add('drunk-active');
        document.documentElement.style.setProperty('--drunk-blur', `${cappedLevel * 0.4}px`); // Very subtle blur
      }
    }


    // 4. CLEANUP & UNLOCK (Faster unlock)
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      setIsAnimating(false); // UNLOCK
    }, 4800); // ~7s / 1.5 adjusted

  }, [cheersCount, playGlass, isAnimating]);

  // Pass bifurcation to CSS variables on the photo zone
  useEffect(() => {
    const zone = document.querySelector('.polaroid-wrapper') as HTMLElement;
    if (zone) {
      zone.style.setProperty('--bif-x', `${bifurcation.x}px`);
      zone.style.setProperty('--bif-y', `${bifurcation.y}px`);
    }
  }, [bifurcation]);

  return (
    <div id="inner-sanctum" className={`layer ${isActive ? 'active' : ''}`}>
      {/* AMBIENT BACKGROUND - REMOVED TO PREVENT GHOSTING */}
      {/* <div className={`ambient-background ${phase === 'revealed' ? 'visible' : ''}`} /> */}

      {/* 3D FOLDER SCENE — perspective wrapper separates from preserve-3d context (iOS fix) */}
      <div className="folder-perspective-wrapper">
        <div className={`folder-3d-scene ${(phase === 'revealed' || phase === 'folder-opening' || phase === 'case-closed') ? 'open' : ''} ${phase === 'folder-closed' ? 'visible-closed' : ''} ${phase === 'revealed' ? 'revealed' : ''}`}>

          {/* FOLDER BACK COVER (Base) */}
          <div className="folder-back">
            {/* DOSSIER — only the sheet with the evidence photo */}
            <div className="dossier-paper">
              <div className="paper-texture"></div>

              {/* HEADER: Stamps & Ref Code - OUTSIDE PHOTO */}
              <div className="dossier-header-section">
                <div className="stamp-box">TOP SECRET</div>
                <div className="ref-code">REF: 23-G</div>
              </div>

              {/* BODY: The Polaroid Photo */}
              <div
                className="dossier-body-section"
              >
                <div
                  className="polaroid-wrapper"
                  style={{
                    transform: 'translateZ(10px) rotate(2deg)', // Force 3D context separation for iOS
                    transition: 'none', // No transitions to avoid interference
                    transformStyle: 'preserve-3d',
                    WebkitTransformStyle: 'preserve-3d'
                  }}
                >
                  <div className="polaroid-frame">
                    {/* PREMIUM TAPE CLIP */}
                    <div className="polaroid-tape" />

                    <div className="polaroid-inner-img">
                      <video
                        ref={videoRef}
                        src={APEROL_VIDEO}
                        muted
                        playsInline
                        className="treasure-video"
                        onContextMenu={(e) => e.preventDefault()}
                        draggable={false}
                        poster="https://res.cloudinary.com/dswpi1pb9/image/upload/v1771349137/IMG_6701_xvmb2s.png"
                        style={{
                          pointerEvents: 'none', // Allow clicks to pass through to hitbox, but prevent direct video interaction
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          WebkitTouchCallout: 'none',
                          transform: 'translateZ(0)', /* Force Hardware Acceleration */
                          WebkitTransform: 'translateZ(0)'
                        } as any}
                      />
                      {/* CINEMATIC GHOST - Escapes clipping */}
                      <video
                        ref={ghostVideoRef}
                        src={APEROL_VIDEO}
                        muted
                        playsInline
                        className="ghost-escape-video"
                        onContextMenu={(e) => e.preventDefault()}
                        draggable={false}
                        poster="https://res.cloudinary.com/dswpi1pb9/image/upload/v1771349137/IMG_6701_xvmb2s.png"
                        style={{
                          pointerEvents: 'none',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          WebkitTouchCallout: 'none',
                          transform: 'translateZ(0)',
                          WebkitTransform: 'translateZ(0)'
                        } as any}
                      />

                      {/* GLASS HITBOX - STRICT LOCK */}
                      <div
                        className="glass-hitbox"
                        onClick={handleCheers}
                        onTouchStart={handleCheers}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{
                          pointerEvents: isAnimating ? 'none' : 'auto', // STRICT LOCK
                          cursor: isAnimating ? 'wait' : 'pointer',
                          touchAction: 'none', // PREVENT ZOOM
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          WebkitTouchCallout: 'none' // Prevent iOS long-press menu
                        } as any}
                      />


                      {/* BIFURCATION GHOST - VISIBLE WHEN DRUNK */}
                      {drunkLevel > 0 && (
                        <video
                          src={APEROL_VIDEO}
                          muted
                          playsInline
                          className="drunk-ghost-img chromatic-aberration"
                          poster="https://res.cloudinary.com/dswpi1pb9/image/upload/v1771349137/IMG_6701_xvmb2s.png"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: 0.4 + drunkLevel * 0.1,
                            // Use the bifurcation values set in JS
                            transform: `translate(var(--bif-x, 0px), var(--bif-y, 0px)) translateZ(0)`,
                            WebkitTransform: `translate(var(--bif-x, 0px), var(--bif-y, 0px)) translateZ(0)`,
                            mixBlendMode: 'normal',
                            filter: `blur(${drunkLevel * 0.5}px) hue-rotate(${drunkLevel * 5}deg)`,
                            pointerEvents: 'none',
                            transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            '--ab-x': `${drunkLevel * 2}px`
                          } as any}
                        />
                      )}
                    </div>
                    <div className="polaroid-caption">
                      <span>EVIDENCIA #001</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER: Signatures REMOVED as per user request */}
              <div className="dossier-footer-section">
                {drunkPhrase && (
                  <div className="drunk-phrase-display">
                    {drunkPhrase}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FOLDER FRONT COVER (Animates open — book-style flip) */}
          <div className="folder-front">
            <div className="folder-label-sticker">
              <span className="typwriter-text">CONFIDENTIAL</span>
              <div className="stamps-row" />
            </div>
            <div className="metallic-fastener"></div>
          </div>

        </div>

      </div>{/* end folder-perspective-wrapper */}

      {/* DOOR - Moved below folder in DOM to natively force Safari Z-index priority */}
      {phase === 'door' && (
        <div className={`final-vault-door slam-down ${doorOpening ? 'opening' : ''}`}>
          <div className="final-door-frame">
            <div className="combo-dial">
              <div className="dial-marks" />
              <div className="dial-inner" />
            </div>
            <div className="handle-base">
              <div className="handle-spinner" style={{ transform: `rotate(${handleRotation}deg)` }}>
                <div className="spoke spoke-1" />
                <div className="spoke spoke-2" />
                <div className="spoke spoke-3" />
                <div className="handle-cap" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTION BUTTONS — outside the folder, only visible after reveal */}
      {
        phase === 'revealed' && (
          <div className="action-footer-independent">
            <button className="btn-primary-action" onClick={toggleMusic}>
              {musicPlaying ? '⏸ PAUSAR MÚSICA' : '🍹 IMAGINA QUE BRINDAMOS'}
            </button>
            <div className="action-hint-text">🎧 Usar Auriculares</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary-action" onClick={() => window.location.reload()}>
                🔄 REPETIR
              </button>
              <button
                className="btn-primary-action"
                style={{ background: '#8b0000', borderColor: '#ff0000', color: 'white' }}
                onClick={handleCloseCase}
              >
                🔒 CERRAR CASO
              </button>
            </div>
          </div>
        )
      }

      {/* CASE CLOSED BLACKOUT OVERLAY */}
      <div
        className={`blackout-overlay ${phase === 'case-closed' ? 'active' : ''}`}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'black',
          zIndex: 9999999,
          pointerEvents: phase === 'case-closed' ? 'auto' : 'none',
          fontSize: '12px',
          color: '#333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Courier New',
          letterSpacing: '4px'
        }}
      >
        SYSTEM_SHUTDOWN...
      </div>

      {/* SELF DESTRUCT OVERLAY */}
      {
        (selfDestructActive && !missionTerminated) && (
          <div className="self-destruct-overlay active">
            <div className="self-destruct-content">

              <div className="tnt-bundle">
                <div className="tnt-stick"></div>
                <div className="tnt-stick"></div>
                <div className="tnt-stick"></div>
                <div className="tnt-band"></div>

                {/* CLOCK UNIT */}
                <div className="tnt-clock">
                  <div className="clock-display">
                    00:0{Math.ceil(countdown)}
                  </div>
                </div>

                <div className="tnt-wire"></div>

                {/* FUSE — self-contained SVG, spark via getPointAtLength (iOS-safe) */}
                <FuseSVG countdown={countdown} />
              </div>

              <div className="countdown-warning-text">
                EL DOCUMENTO SE AUTODESTRUIRA
              </div>
            </div>
          </div>
        )
      }

      {/* EXPLOSION FLASH TO DARKROOM TRANSITION */}
      {
        explosionPhase === 'flash' && (
          <div className="explosion-whiteout" />
        )
      }

      {/* FINAL COPY REVEAL */}
      {
        missionTerminated && (
          <div className="final-mission-layer">
            <div className="final-content-box">
              <img
                src="https://res.cloudinary.com/dswpi1pb9/image/upload/v1771349137/IMG_6701_xvmb2s.png"
                alt="Copy"
                className="final-evidence-img"
              />
              <div className="final-message">
                Tranqui, hicimos una copia 😉
              </div>
              <button className="btn-secondary-action" onClick={() => window.location.reload()} style={{ marginTop: '20px' }}>
                🔄 REPETIR MISION
              </button>
            </div>
          </div>
        )
      }

      {/* Dynamic keyframes */}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes luxuryBubble {
          0% { transform: translate(0, 0) scale(0); opacity: 0; }
          15% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; }
        }
        @keyframes sparkBurst {
          0% { transform: translate(0, 0) scale(0); opacity: 0; }
          20% { opacity: 1; transform: scale(1.2); }
          100% { transform: translate(var(--sx), var(--sy)) scale(0); opacity: 0; }
        }
        @keyframes toastFade {
          0%, 60% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes toastPop {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        /* UPDATED DRUNK SWAY - NO LAYOUT JUMP */
        @keyframes drunkSway {
          0% { transform: rotate(0deg) scale(1); filter: blur(0px); }
          25% { transform: rotate(1deg) scale(1.01); filter: blur(0.5px); }
          50% { transform: rotate(-1deg) scale(1); filter: blur(0px); }
          75% { transform: rotate(0.5deg) scale(0.99); filter: blur(0.8px); }
          100% { transform: rotate(0deg) scale(1); filter: blur(0px); }
        }
        
        /* IMPACT SHAKE - HIGH IMPACT VISUAL SYNC */
        @keyframes impactShake {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          10% { transform: translate3d(-2px, -2px, 0) rotate(-1deg); }
          20% { transform: translate3d(2px, 2px, 0) rotate(1deg); }
          30% { transform: translate3d(-2px, 2px, 0) rotate(0deg); }
          40% { transform: translate3d(2px, -2px, 0) rotate(1deg); }
          50% { transform: translate3d(-1px, 1px, 0) rotate(-1deg); }
          60% { transform: translate3d(1px, -1px, 0) rotate(0deg); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }
        .impact-shake {
          animation: impactShake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }

        /* Override for smoother popout if needed, or ensuring it exists */
        .ghost-escape-active {
           animation: simplePopout 6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes simplePopout {
          0% { transform: translateZ(0) scale(1); opacity: 0; }
          20% { transform: translateZ(120px) scale(1.15); opacity: 0.7; }
          40% { transform: translateZ(220px) scale(1.3); opacity: 0.85; }
          50% { transform: translateZ(280px) scale(1.4); opacity: 0.95; } /* PEAK IMPACT at 3s */
          60% { transform: translateZ(220px) scale(1.3); opacity: 0.85; }
          80% { transform: translateZ(120px) scale(1.15); opacity: 0.7; }
          100% { transform: translateZ(0) scale(1); opacity: 0; }
        }

        /* HIGH IMPACT FLASH (Override) */
        @keyframes impactFlash {
          0% { opacity: 0; backdrop-filter: blur(0px) contrast(1) brightness(1); }
          20% { opacity: 1; backdrop-filter: blur(8px) contrast(2) brightness(1.5); }
          100% { opacity: 0; backdrop-filter: blur(0px) contrast(1) brightness(1); }
        }


        /* CASE CLOSED ANIMATIONS */
        .folder-3d-scene.case-closed .folder-front {
            transform: rotateY(0deg) !important; /* Slam shut */
            transition: transform 0.4s cubic-bezier(0.1, 0.9, 0.2, 1);
        }
        
        /* STAMP "CASE CLOSED" */
        .folder-3d-scene.case-closed .folder-front::after {
            content: "CASE\\A CLOSED";
            white-space: pre;
            position: absolute;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-15deg) scale(2);
            font-family: 'Courier New', Courier, monospace;
            font-weight: 900;
            font-size: 80px;
            color: rgba(180, 0, 0, 0.8);
            border: 8px solid rgba(180, 0, 0, 0.8);
            padding: 20px;
            text-align: center;
            line-height: 1;
            opacity: 0;
            pointer-events: none;
            mix-blend-mode: multiply;
            mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E");
            animation: stampSlam 0.3s cubic-bezier(0.1, 0.9, 0.2, 1) 0.6s forwards;
            /* iOS Fix for mix-blend-mode */
            -webkit-backdrop-filter: blur(0px); 
        }

        @keyframes stampSlam {
            0% { opacity: 0; transform: translate(-50%, -50%) rotate(-15deg) scale(2); }
            50% { opacity: 1; transform: translate(-50%, -50%) rotate(-15deg) scale(1.0); }
            70% { transform: translate(-50%, -50%) rotate(-15deg) scale(1.1); } /* Bounce */
            100% { opacity: 0.9; transform: translate(-50%, -50%) rotate(-15deg) scale(1); }
        }

        /* FADE OUT SCENE */
        .folder-3d-scene.case-closed {
            animation: slideOutBlack 1s ease-in 1.5s forwards;
        }

        @keyframes slideOutBlack {
            0% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(100vh); opacity: 0; }
        }

        /* BLACKOUT OVERLAY FADE IN */
        .blackout-overlay {
            opacity: 0;
            transition: opacity 2s ease 2s; /* Wait for folder to leave */
            pointer-events: none;
        }
        .blackout-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }


        /* GLOBAL SCREEN PULSE FOR EXTRA IMPACT */
        @keyframes impactPulse {
           0% { transform: scale(1); }
           10% { transform: scale(1.02); } /* Subtle zoom in */
           40% { transform: scale(0.99); } /* Bounce back */
           100% { transform: scale(1); }
        }
        .impact-pulse-global {
           animation: impactPulse 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }


      `}</style>
    </div >
  );
};
