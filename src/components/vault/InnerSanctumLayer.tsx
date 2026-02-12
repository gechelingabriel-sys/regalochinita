import React, { useState, useCallback, useEffect, useRef } from 'react';

interface InnerSanctumLayerProps {
  isActive: boolean;
  playSound: (type: string) => void;
  toggleMusic: () => void;
  musicPlaying: boolean;
}

const TREASURE_IMG = "https://res.cloudinary.com/dswpi1pb9/image/upload/v1770844431/C3252582-9233-46E3-B324-E6B79C99FADF_roxpw7.png";

export const InnerSanctumLayer: React.FC<InnerSanctumLayerProps> = ({
  isActive,
  playSound,
  toggleMusic,
  musicPlaying
}) => {
  const [phase, setPhase] = useState<'door' | 'folder-closed' | 'folder-opening' | 'revealed'>('door');
  const [handleRotation, setHandleRotation] = useState(0);
  const [doorOpening, setDoorOpening] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1.6); // Default vertical ratio

  // Preload image and get aspect ratio
  useEffect(() => {
    const img = new Image();
    img.src = TREASURE_IMG;
    img.onload = () => {
      const ratio = img.naturalHeight / img.naturalWidth;
      setAspectRatio(ratio);
      document.documentElement.style.setProperty('--image-aspect-ratio', ratio.toString());
    };
  }, []);

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

  // Premium paper sound
  const playPaper = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const dur = 0.5;
      const buf = ctx.createBuffer(2, ctx.sampleRate * dur, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < buf.length; i++) {
          const t = i / buf.length;
          d[i] = (Math.random() * 2 - 1) * 0.4 * Math.sin(t * Math.PI) * (1 - t);
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const flt = ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.value = 2800;
      const gn = ctx.createGain();
      gn.gain.value = 0.5;
      src.connect(flt).connect(gn).connect(ctx.destination);
      src.start();
    } catch (e) { }
  }, [getAudioContext]);

  // PLAY GLASS SOUND - REALISTIC BASE64 (Short clear clink)
  const playGlass = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;

    // 1. IMPACT THUD (The physical hit)
    const impactOsc = ctx.createOscillator();
    const impactGain = ctx.createGain();
    impactOsc.frequency.setValueAtTime(150, t);
    impactOsc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    impactGain.gain.setValueAtTime(0.5, t);
    impactGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    impactOsc.connect(impactGain).connect(ctx.destination);
    impactOsc.start(t);
    impactOsc.stop(t + 0.05);

    // 2. GLASS RINGING (Harmonics)
    const freqs = [2200, 2800, 3600, 5200];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      // Slight detune for realism
      osc.frequency.linearRampToValueAtTime(f + (Math.random() - 0.5) * 50, t + 1);

      const vol = 0.2 / (i + 1);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2 - i * 0.2);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.2);
    });
  }, []);

  // Confetti rain
  const spawnConfetti = useCallback((count = 80) => {
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
  }, []);

  // Main sequence - FLUID AGENCY PRO TIMING
  useEffect(() => {
    if (!isActive || phase !== 'door') return;

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
              playPaper(); // Crisp paper sound
              setPhase('folder-opening'); // Folder starts opening (Book style)

              // The CSS animation takes ~1.8s. We reveal the contents once fully open.
              setTimeout(() => {
                // Trigger confetti synced with folder fully open
                spawnConfetti(50);
                setPhase('revealed');
              }, 1200); // Synced with longer animation

            }, 1600); // Long pause to see CONFIDENTIAL
          }, 1800); // Slow transition from door → folder
        }, 400);
      }, 400);
    }, 200);
  }, [isActive, phase, playSound, playPaper, spawnConfetti]);

  // CHEERS LOGIC - BEER ONLY & BIFURCATION
  const [cheersCount, setCheersCount] = useState(0);
  const [drunkLevel, setDrunkLevel] = useState(0);

  // Bifurcation offset state - Permanent separation based on drunk level
  const [bifurcation, setBifurcation] = useState({ x: 0, y: 0 });

  const handleCheers = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newCount = cheersCount + 1;
    setCheersCount(newCount);

    playGlass();
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]); // Crisp tap feel

    // STRICT PHRASE LOGIC - Forced
    let message = "¡SALUD! 🍻";
    let isSmallLow = false;

    if (newCount === 1) message = "¡CHIN CHIN! 🍻";
    else if (newCount === 2) message = "¡SALUD! 🍻";
    else if (newCount === 3) message = "¡OTRA! 🍺";
    else if (newCount === 4) {
      message = "Otro? 🍺";
      isSmallLow = true;
    }
    else if (newCount === 5) {
      message = "¿Estas segura? 🤨";
      isSmallLow = true;
    }
    else if (newCount === 6) {
      message = "¡Que golosa! 🤤";
      isSmallLow = true;
    }
    else if (newCount >= 7) {
      message = "¡Te la vas a dar en la pera! 🍐🥴";
      isSmallLow = true;
    }

    // A. GLASS POP VISUAL
    // (We do this here to sync with the click)
    const glassPop = document.createElement('div');
    glassPop.className = 'phantom-glass-pop';
    glassPop.style.left = `${(e as any).clientX || (e as any).touches?.[0]?.clientX || 0}px`;
    glassPop.style.top = `${(e as any).clientY || (e as any).touches?.[0]?.clientY || 0}px`;
    document.body.appendChild(glassPop);
    setTimeout(() => glassPop.remove(), 600);

    // B. PHOTO 3D POPBACK
    const folder = document.querySelector('.folder-3d-scene') as HTMLElement;
    if (folder) {
      folder.classList.remove('pop-back-anim');
      void folder.offsetWidth;
      folder.classList.add('pop-back-anim');
    }

    // Get click position accurately
    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) { // Handle touchend/click
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // 1. BEER BUBBLES ONLY (No sparkles)
    for (let i = 0; i < 40; i++) {
      const b = document.createElement('div');
      const isFoam = Math.random() > 0.6;
      b.className = isFoam ? 'beer-foam-particle' : 'beer-liquid-particle';

      const size = isFoam ? 5 + Math.random() * 10 : 4 + Math.random() * 8;
      b.style.setProperty('--size', `${size}px`);
      b.style.left = `${clientX}px`;
      b.style.top = `${clientY}px`;

      // Explosion outwards
      const angle = Math.random() * Math.PI * 2;
      const velocity = 30 + Math.random() * 100;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity - 50; // Slight upward bias

      b.style.transform = `translate(${tx}px, ${ty}px)`;
      b.style.setProperty('--dur', `${0.6 + Math.random() * 0.8}s`);

      document.body.appendChild(b);
      setTimeout(() => b.remove(), 1500);
    }

    // 2. TOAST MESSAGE AT CLICK POSITION
    const toast = document.createElement('div');
    toast.className = `toast-text active ${isSmallLow ? 'toast-small-low' : ''}`;
    toast.innerHTML = message;

    // Position: If small/low, force it to bottom center relative to click or fixed?
    const yOffset = isSmallLow ? 80 : -50;

    toast.style.left = `${clientX}px`;
    toast.style.top = `${clientY + yOffset}px`;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);

    // 3. DRUNK & BIFURCATION LOGIC
    // Bifurcation starts getting noticeable at click 3
    if (newCount >= 3) {
      const level = Math.min(newCount - 2, 8); // Cap at level 8
      setDrunkLevel(level);

      // Randomize bifurcation direction each click, but magnitude increases
      const angle = Math.random() * Math.PI * 2;
      const distance = level * 3; // 3px separation per level -> max 24px

      setBifurcation({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance
      });

      // Screen shake effect on the scene
      const scene = document.querySelector('.folder-3d-scene') as HTMLElement;
      if (scene) {
        scene.classList.remove('shake-anim');
        void scene.offsetWidth; // Trigger reflow
        scene.classList.add('shake-anim');

        if (level > 2) {
          scene.classList.add('drunk-active');
          // Set CSS vars for global blur/aberration if needed
          document.documentElement.style.setProperty('--drunk-blur', `${level * 0.5}px`);
        }
      }
    }
  }, [cheersCount, playGlass]);

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
      {/* DOOR */}
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

      {/* AMBIENT BACKGROUND */}
      <div className={`ambient-background ${phase === 'revealed' ? 'visible' : ''}`} />

      {/* 3D FOLDER SCENE — only dossier + photo inside */}
      <div className={`folder-3d-scene ${(phase === 'revealed' || phase === 'folder-opening') ? 'open' : ''}`}>

        {/* FOLDER BACK COVER (Base) */}
        <div className="folder-back">
          {/* DOSSIER — only the sheet with the evidence photo */}
          <div className="dossier-paper">
            <div className="paper-texture"></div>

            {/* HEADER: Stamps & Ref Code - OUTSIDE PHOTO */}
            <div className="dossier-header-section">
              <div className="stamp-box">TOP SECRET</div>
              <div className="ref-code">REF: 23-G // AGENT COTY</div>
            </div>

            {/* BODY: The Polaroid Photo */}
            <div
              className="dossier-body-section"
              onClick={handleCheers}
              onTouchStart={handleCheers}
            >
              <div
                className="polaroid-wrapper"
                style={{
                  transform: cheersCount >= 1 && cheersCount <= 3
                    ? `scale(${1 + cheersCount * 0.05}) rotate(${2 + cheersCount}deg)`
                    : 'rotate(2deg)',
                  transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                {/* METAL CLIP - Holds the photo */}
                <div className="bull-clip-container">
                  <div className="clip-handle-loop"></div>
                  <div className="clip-body"></div>
                </div>

                <div className="polaroid-frame">
                  <div className="polaroid-inner-img">
                    <img
                      src={TREASURE_IMG}
                      alt="Evidence"
                    />
                    {/* BIFURCATION GHOST - VISIBLE WHEN DRUNK */}
                    {drunkLevel > 0 && (
                      <img
                        src={TREASURE_IMG}
                        alt=""
                        className="drunk-ghost-img"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: 0.4 + drunkLevel * 0.05,
                          // Use the bifurcation values set in JS
                          transform: `translate(var(--bif-x, 0px), var(--bif-y, 0px))`,
                          // Exclusion blend mode for "negative/trippy" separation, or Normal with opacity for strict double vision
                          mixBlendMode: 'normal',
                          filter: `blur(${drunkLevel * 0.2}px) hue-rotate(${drunkLevel * 10}deg)`,
                          pointerEvents: 'none',
                          transition: 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)', // Smooth settle
                        }}
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
              {/* Empty or just stamp */}
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

      {/* ACTION BUTTONS — outside the folder, only visible after reveal */}
      {phase === 'revealed' && (
        <div className="action-footer-independent">
          <button className="btn-primary-action" onClick={toggleMusic}>
            {musicPlaying ? '⏸ PAUSAR MÚSICA' : '🍺 IMAGINA QUE BRINDAMOS'}
          </button>
          <div className="action-hint-text">🎧 Usar Auriculares</div>
          <button className="btn-secondary-action" onClick={() => window.location.reload()}>
            🔄 REPETIR EXPERIENCIA
          </button>
        </div>
      )}

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
      `}</style>
    </div>
  );
};
