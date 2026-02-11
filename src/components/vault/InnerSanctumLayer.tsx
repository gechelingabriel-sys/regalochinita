import React, { useState, useCallback, useEffect, useRef } from 'react';

interface InnerSanctumLayerProps {
  isActive: boolean;
  playSound: (type: string) => void;
  toggleMusic: () => void;
  musicPlaying: boolean;
}

const TREASURE_IMG = "https://res.cloudinary.com/dswpi1pb9/image/upload/v1770557448/asset_aperol_d2nwy0.png";

export const InnerSanctumLayer: React.FC<InnerSanctumLayerProps> = ({
  isActive,
  playSound,
  toggleMusic,
  musicPlaying
}) => {
  const [phase, setPhase] = useState<'door' | 'folder-closed' | 'folder-opening' | 'revealed'>('door');
  const [handleRotation, setHandleRotation] = useState(0);
  const [doorOpening, setDoorOpening] = useState(false);

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

  // PREMIUM glass clink with rich harmonics
  const playGlass = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Rich crystal harmonics
      const freqs = [2800, 4200, 5600, 7000, 8400];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f + Math.random() * 30;
        const vol = 0.08 / (i + 1);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(vol, now + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        osc.connect(g).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
      });
    } catch (e) {
      playSound('clink');
    }
  }, [getAudioContext, playSound]);

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
              playPaper();
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

  // Cheers Easter Egg Logic
  const [cheersCount, setCheersCount] = useState(0);
  const [drunkLevel, setDrunkLevel] = useState(0);
  const ghostRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // PREMIUM cheers effect with Easter Egg
  const handleCheers = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newCount = cheersCount + 1;
    setCheersCount(newCount);

    playGlass();
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

    // Easter Egg Messages
    let message = "¡CHIN CHIN!";
    let emoji = "";

    if (newCount === 3) {
      message = "¿OTRO MÁS?";
      emoji = "🥴";
    } else if (newCount >= 4 && newCount < 8) {
      const msgs = [
        "¿OTRA RONDA?",
        "¡SALUD!",
        "¡NO ROMPAS LA COPA!",
        "¡FONDO BLANCO!",
        "¡CHIN CHIN!",
        "¡QUÉ RICO APEROL!",
        "¡ME MAREO...!",
        "¡ARRIBA, ABAJO...!"
      ];
      message = msgs[Math.floor(Math.random() * msgs.length)];
      emoji = "🤪";
    } else if (newCount === 8) {
      message = "¿OTRO? QUÉ GOLOSA";
      emoji = "🤓";
    } else if (newCount >= 9) {
      message = "SUFICIENTE POR HOY...";
      emoji = "🛑";
    }

    // Get position
    let x: number, y: number;
    if ('touches' in e && e.touches[0]) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else if ('clientX' in e) {
      x = e.clientX;
      y = e.clientY;
    } else {
      x = window.innerWidth / 2;
      y = window.innerHeight / 2;
    }

    // Premium toast overlay
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        pointer-events: none;
        animation: toastFade 1.2s ease-out forwards;
      ">
        <div style="
          font-family: 'Times New Roman', Georgia, serif;
          font-size: clamp(32px, 10vw, 56px);
          font-weight: 700;
          font-style: italic;
          color: white;
          text-shadow: 
            0 0 30px rgba(255, 140, 50, 1),
            0 0 60px rgba(255, 100, 0, 0.7),
            0 4px 20px rgba(0, 0, 0, 0.8);
          letter-spacing: 3px;
          text-align: center;
          animation: toastPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        ">${message}</div>
        <div style="font-size: 60px; margin-top: 10px; animation: toastPop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);">${emoji}</div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);

    // Luxury bubbles explosion
    for (let i = 0; i < 60; i++) {
      const b = document.createElement('div');
      const size = 6 + Math.random() * 16;
      const angle = (Math.random() - 0.5) * Math.PI;
      const distance = 60 + Math.random() * 140;
      const dx = Math.cos(angle) * distance;
      const dy = -40 - Math.random() * 160;

      b.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 25%, 
          rgba(255, 220, 170, 0.95) 0%, 
          rgba(255, 170, 90, 0.9) 35%, 
          rgba(255, 130, 50, 0.8) 100%);
        box-shadow: 
          inset 0 -2px 4px rgba(255, 200, 140, 0.6),
          inset 0 2px 3px rgba(255, 255, 255, 0.7),
          0 0 20px rgba(255, 150, 60, 0.6);
        z-index: 99998;
        pointer-events: none;
        animation: luxuryBubble ${0.6 + Math.random() * 0.5}s ease-out forwards;
        --dx: ${dx}px;
        --dy: ${dy}px;
      `;
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 1200);
    }

    // Golden sparkles burst
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('div');
      const angle = (i / 16) * Math.PI * 2;
      const dist = 50 + Math.random() * 60;

      s.textContent = ['✨', '⭐', '💫'][Math.floor(Math.random() * 3)];
      s.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        font-size: ${16 + Math.random() * 12}px;
        z-index: 99999;
        pointer-events: none;
        filter: drop-shadow(0 0 8px rgba(255, 200, 80, 0.9));
        animation: sparkBurst 0.6s ease-out forwards;
        --sx: ${Math.cos(angle) * dist}px;
        --sy: ${Math.sin(angle) * dist - 30}px;
      `;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }

    // === DRUNK SWAY + DOUBLE VISION from click 4+ ===
    if (newCount >= 4) {
      const intensity = Math.min(newCount - 3, 6);
      setDrunkLevel(intensity);

      const scene = document.querySelector('.folder-3d-scene') as HTMLElement;
      if (scene) {
        const swayDeg = 0.8 * intensity;
        const swayPx = 1.5 * intensity;
        scene.style.animation = 'none';
        scene.offsetHeight; // force reflow
        scene.style.animation = `drunkSway ${Math.max(2.5 - intensity * 0.15, 1)}s ease-in-out infinite`;
        scene.style.setProperty('--sway-deg', `${swayDeg}deg`);
        scene.style.setProperty('--sway-px', `${swayPx}px`);
      }
    }
  }, [playGlass, cheersCount]);

  // DOUBLE VISION: touch-drag ghost parallax
  useEffect(() => {
    if (drunkLevel <= 0) return;

    const zone = document.querySelector('.evidence-photo-zone') as HTMLElement;
    if (!zone) return;

    const maxShift = 4 + drunkLevel * 3; // 7px to 22px max

    const handleMove = (clientX: number, clientY: number) => {
      const rect = zone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = ((clientX - cx) / rect.width) * maxShift;
      const dy = ((clientY - cy) / rect.height) * maxShift;
      ghostRef.current = { x: dx, y: dy };
      zone.style.setProperty('--ghost-x', `${dx}px`);
      zone.style.setProperty('--ghost-y', `${dy}px`);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);

    const onEnd = () => {
      // Drift back slowly
      zone.style.setProperty('--ghost-x', '0px');
      zone.style.setProperty('--ghost-y', '0px');
    };

    zone.addEventListener('touchmove', onTouchMove, { passive: true });
    zone.addEventListener('mousemove', onMouseMove);
    zone.addEventListener('touchend', onEnd);
    zone.addEventListener('mouseleave', onEnd);

    return () => {
      zone.removeEventListener('touchmove', onTouchMove);
      zone.removeEventListener('mousemove', onMouseMove);
      zone.removeEventListener('touchend', onEnd);
      zone.removeEventListener('mouseleave', onEnd);
    };
  }, [drunkLevel]);

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

            <div className="dossier-header">
              <span className="stamp-box">TOP SECRET</span>
              <span className="ref-code">REF: 23-G // AGENT COTY</span>
            </div>

            <div
              className="evidence-photo-zone"
              onClick={handleCheers}
              onTouchStart={handleCheers}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="photo-corner-tapes"></div>
              <div
                className="evidence-photo-frame"
                style={{
                  transform: cheersCount >= 1 && cheersCount <= 3
                    ? `scale(${1 + cheersCount * 0.08}) translateZ(${cheersCount * 10}px)`
                    : 'scale(1)',
                  zIndex: cheersCount >= 1 && cheersCount <= 3 ? 100 + cheersCount : 1,
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                <img
                  src={TREASURE_IMG}
                  alt="Evidence"
                  style={{ transition: 'all 0.3s ease' }}
                />
                {/* DOUBLE VISION GHOST — semi-transparent offset duplicate */}
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
                      opacity: 0.15 + drunkLevel * 0.06,
                      transform: `translate(var(--ghost-x, ${3 + drunkLevel}px), var(--ghost-y, ${2 + drunkLevel * 0.5}px))`,
                      filter: `blur(${0.5 + drunkLevel * 0.3}px) hue-rotate(${drunkLevel * 5}deg)`,
                      mixBlendMode: 'screen',
                      pointerEvents: 'none',
                      transition: 'transform 0.3s ease-out, opacity 0.4s ease, filter 0.4s ease',
                    }}
                  />
                )}
              </div>
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
            {musicPlaying ? '⏸ PAUSAR MÚSICA' : '🍹 IMAGINA QUE BRINDAMOS'}
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
        @keyframes drunkSway {
          0% { transform: translate(-50%, -50%) rotate(0deg) translateX(0); }
          25% { transform: translate(-50%, -50%) rotate(var(--sway-deg, 1deg)) translateX(var(--sway-px, 2px)); }
          50% { transform: translate(-50%, -50%) rotate(0deg) translateX(0); }
          75% { transform: translate(-50%, -50%) rotate(calc(var(--sway-deg, 1deg) * -1)) translateX(calc(var(--sway-px, 2px) * -1)); }
          100% { transform: translate(-50%, -50%) rotate(0deg) translateX(0); }
        }
      `}</style>
    </div>
  );
};
