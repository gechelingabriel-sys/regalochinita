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
