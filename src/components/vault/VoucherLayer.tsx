import React from 'react';

interface VoucherLayerProps {
  isActive: boolean;
  exitState: 'none' | 'up' | 'down';
  onContinue: () => void;
  playSound: (type: string) => void;
}

export const VoucherLayer: React.FC<VoucherLayerProps> = ({
  isActive,
  exitState,
  onContinue,
  playSound
}) => {
  const getLayerClass = () => {
    let className = 'layer';
    if (isActive) className += ' active';
    if (exitState === 'up') className += ' exit-up';
    if (exitState === 'down') className += ' exit-down';
    return className;
  };

  const handleContinue = () => {
    playSound('metallic-click');
    onContinue();
  };

  // Premium Gold Confetti Implementation
  React.useEffect(() => {
    if (isActive) {
      const colors = ['#FFD700', '#F0E68C', '#DAA520', '#B8860B', '#FFFacd'];
      const container = document.getElementById('voucher-layer');

      const createConfetti = () => {
        if (!container) return;

        const el = document.createElement('div');
        const size = Math.random() * 8 + 6;
        const color = colors[Math.floor(Math.random() * colors.length)];

        el.style.cssText = `
          position: fixed;
          top: -20px;
          left: ${Math.random() * 100}vw;
          width: ${size}px;
          height: ${size * 0.6}px;
          background: ${color};
          opacity: 1;
          z-index: 1000;
          pointer-events: none;
          transform: rotate(${Math.random() * 360}deg);
          box-shadow: 0 0 4px ${color};
          animation: goldFall ${2 + Math.random() * 3}s linear forwards;
        `;

        // Add metallic shine effect
        if (Math.random() > 0.5) {
          el.style.background = `linear-gradient(${Math.random() * 360}deg, ${color}, #fff, ${color})`;
        }

        container.appendChild(el);
        setTimeout(() => el.remove(), 5000);
      };

      // Styles for animation if not exists
      if (!document.getElementById('gold-confetti-style')) {
        const style = document.createElement('style');
        style.id = 'gold-confetti-style';
        style.textContent = `
          @keyframes goldFall {
            0% { transform: translateY(0) rotate(0deg) rotateX(0deg); opacity: 1; }
            100% { transform: translateY(105vh) rotate(720deg) rotateX(360deg); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      // Burst initially
      let count = 0;
      const initialBurst = setInterval(() => {
        for (let i = 0; i < 5; i++) createConfetti();
        count++;
        if (count > 20) clearInterval(initialBurst);
      }, 50);

      // Continuous gentle rain
      const rain = setInterval(() => {
        if (Math.random() > 0.3) createConfetti();
      }, 100);

      return () => {
        clearInterval(initialBurst);
        clearInterval(rain);
      };
    }
  }, [isActive]);

  return (
    <div id="voucher-layer" className={getLayerClass()}>
      <div className="paper-voucher">
        <div className="paper-header">Autenticidad Garantizada</div>
        <div className="paper-body">
          <div className="paper-title">¡FELICITACIONES!</div>
          <div className="paper-sub">
            Has ganado un voucher exclusivo para usar en una ocasión especial.
          </div>
        </div>
        <div className="paper-footer">
          <span>Para Coty de Gabriel</span>
        </div>
        <div className="stamp-pro stamp-circle">
          DEPT<br />SEGURIDAD<br />#23
        </div>
      </div>
      <button className="btn-goto-reveal" onClick={handleContinue}>
        IR AL CANJE →
      </button>
    </div>
  );
};
