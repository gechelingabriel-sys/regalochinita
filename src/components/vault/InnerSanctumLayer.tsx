import React, { useState, useCallback, useEffect, useRef } from 'react';

interface InnerSanctumLayerProps {
  isActive: boolean;
  playSound: (type: string) => void;
  toggleMusic: () => void;
  musicPlaying: boolean;
}

const TREASURE_IMG = "https://res.cloudinary.com/dswpi1pb9/image/upload/v1770557425/asset_apperol_gaoaab.png";

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

  // Main sequence
  useEffect(() => {
    if (!isActive || phase !== 'door') return;

    // Door sequence
    setTimeout(() => {
      playSound('slam');

      setTimeout(() => {
        setHandleRotation(720);
        playSound('unlock');

        setTimeout(() => {
          playSound('grind');
          setDoorOpening(true);

          setTimeout(() => {
            setPhase('folder-closed');
            spawnConfetti(50);

            setTimeout(() => {
              playPaper();
              setPhase('folder-opening');

              setTimeout(() => {
                setPhase('revealed');
                spawnConfetti(100);
              }, 1800);
            }, 1200);
          }, 600);
        }, 500);
      }, 500);
    }, 300);
  }, [isActive, phase, playSound, playPaper, spawnConfetti]);

  // PREMIUM cheers effect
  const handleCheers = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    playGlass();
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

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
          animation: toastPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        ">¡CHIN CHIN!</div>
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
  }, [playGlass]);

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

      {/* FOLDER CLOSED */}
      {phase === 'folder-closed' && (
        <div className="premium-closed-folder">
          <div className="closed-cover">
            <div className="grain"></div>
            <div className="confidential-badge">
              <span className="badge-main">CONFIDENCIAL</span>
              <span className="badge-sub">NIVEL A-1</span>
            </div>
            <div className="hazard-bar"></div>
          </div>
        </div>
      )}

      {/* FOLDER OPENING */}
      {phase === 'folder-opening' && (
        <div className="premium-folder-scene">
          <div className="folder-base-layer"></div>
          <div className="folder-cover-opening">
            <div className="grain"></div>
            <div className="confidential-badge">
              <span className="badge-main">CONFIDENCIAL</span>
              <span className="badge-sub">NIVEL A-1</span>
            </div>
          </div>
        </div>
      )}

      {/* REVEALED - FOLDER + BUTTONS SEPARATE */}
      {phase === 'revealed' && (
        <div className="revealed-layout">
          {/* Dossier */}
          <div className="dossier-card">
            <div className="dossier-topbar">
              <span>🔴 CLASIFICADO</span>
              <span>REF: 23-G</span>
            </div>

            <div
              className="photo-touch-zone"
              onClick={handleCheers}
              onTouchStart={handleCheers}
            >
              <div className="photo-clip"></div>
              <div className="photo-frame">
                <img src={TREASURE_IMG} alt="" />
              </div>
              <div className="touch-hint">👆 Toca para brindar</div>
            </div>

            <div className="dossier-info">
              <div>ACCESO: <b>CONCEDIDO ✓</b></div>
              <div>VOUCHER: <b>ACTIVADO</b></div>
            </div>
          </div>

          {/* BUTTONS - COMPLETELY SEPARATE */}
          <div className="action-zone">
            <button className="main-action-btn" onClick={toggleMusic}>
              {musicPlaying ? '⏸️ PAUSAR MÚSICA' : '🍹 IMAGINA QUE BRINDAMOS'}
            </button>
            <p className="action-hint">🎧 Mejor con auriculares</p>
            <button className="secondary-action-btn" onClick={() => window.location.reload()}>
              🏠 VOLVER AL INICIO
            </button>
          </div>
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
      `}</style>
    </div>
  );
};
