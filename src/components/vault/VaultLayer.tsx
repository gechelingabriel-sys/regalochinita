import React, { useState, useCallback } from 'react';

interface VaultLayerProps {
  isActive: boolean;
  exitState: 'none' | 'up' | 'down';
  onUnlocked: () => void;
  playSound: (type: string) => void;
  initAudio: () => void;
}

const ANSWERS = { 1: 23, 2: 23, 3: 23 };
const FINAL_CODE = "232323";

export const VaultLayer: React.FC<VaultLayerProps> = ({
  isActive,
  exitState,
  onUnlocked,
  playSound,
  initAudio
}) => {
  const [step, setStep] = useState(1);
  const [dialRotation, setDialRotation] = useState(0);
  const [handleRotation, setHandleRotation] = useState(0);
  const [inputValues, setInputValues] = useState({ 1: '', 2: '', 3: '', final: '' });
  const [inputError, setInputError] = useState<number | null>(null);

  const handleInputChange = (stepNum: number | 'final', value: string) => {
    setInputError(null);
    setInputValues(prev => ({ ...prev, [stepNum]: value }));
  };

  const attempt = useCallback((n: number) => {
    initAudio();
    const value = parseInt(inputValues[n as keyof typeof inputValues] as string);
    
    if (value === ANSWERS[n as keyof typeof ANSWERS]) {
      playSound('metallic-click');
      setDialRotation(prev => prev + 120);
      setHandleRotation(prev => prev + 45);
      
      setTimeout(() => {
        setStep(n < 3 ? n + 1 : 4);
      }, 500);
    } else {
      playSound('metallic-click');
      setInputError(n);
      setTimeout(() => setInputError(null), 300);
    }
  }, [inputValues, playSound, initAudio]);

  const attemptFinal = useCallback(() => {
    initAudio();
    
    if (inputValues.final === FINAL_CODE) {
      playSound('metallic-click');
      setStep(5);
      
      setTimeout(() => playSound('unlock'), 300);
      setHandleRotation(720);
      
      setTimeout(() => {
        playSound('slam');
        onUnlocked();
      }, 1000);
    } else {
      playSound('metallic-click');
      setInputError(4);
      setTimeout(() => setInputError(null), 300);
    }
  }, [inputValues.final, playSound, onUnlocked, initAudio]);

  const getLayerClass = () => {
    let className = 'layer';
    if (isActive) className += ' active';
    if (exitState === 'up') className += ' exit-up';
    if (exitState === 'down') className += ' exit-down';
    return className;
  };

  return (
    <div id="vault-layer" className={getLayerClass()}>
      <div className="vault-box">
        <div className="hinge hinge-1" />
        <div className="hinge hinge-2" />
        <div className="hinge hinge-3" />
        
        <div className="vault-door-frame">
          <div className="combo-dial">
            <div className="dial-marks" />
            <div 
              className="dial-inner" 
              style={{ transform: `rotate(${dialRotation}deg)` }}
            />
          </div>
          
          <div className="handle-base">
            <div 
              className="handle-spinner" 
              style={{ transform: `rotate(${handleRotation}deg)` }}
            >
              <div className="spoke spoke-1" />
              <div className="spoke spoke-2" />
              <div className="spoke spoke-3" />
              <div className="handle-cap" />
            </div>
          </div>
        </div>
      </div>

      {/* Verification 1/3 */}
      <div className={`input-overlay ${step === 1 ? 'show' : ''}`}>
        <div className="q-title">Verificación 1/3</div>
        <div className="q-body">(4 × 6) − 1 =</div>
        <input
          type="tel"
          className={`code-input ${inputError === 1 ? 'error' : ''}`}
          placeholder="??"
          value={inputValues[1]}
          onChange={(e) => handleInputChange(1, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && attempt(1)}
        />
        <button className="btn-submit" onClick={() => attempt(1)}>
          ACEPTAR
        </button>
      </div>

      {/* Verification 2/3 */}
      <div className={`input-overlay ${step === 2 ? 'show' : ''}`}>
        <div className="q-title">Verificación 2/3</div>
        <div className="q-body">¿Qué defensor está más bueno que comer pollo con la mano?</div>
        <input
          type="tel"
          className={`code-input ${inputError === 2 ? 'error' : ''}`}
          placeholder="??"
          value={inputValues[2]}
          onChange={(e) => handleInputChange(2, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && attempt(2)}
        />
        <button className="btn-submit" onClick={() => attempt(2)}>
          ACEPTAR
        </button>
      </div>

      {/* Verification 3/3 */}
      <div className={`input-overlay ${step === 3 ? 'show' : ''}`}>
        <div className="q-title">Verificación 3/3</div>
        <div className="q-body">Año del reencuentro (2 cifras):</div>
        <input
          type="tel"
          className={`code-input ${inputError === 3 ? 'error' : ''}`}
          placeholder="??"
          value={inputValues[3]}
          onChange={(e) => handleInputChange(3, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && attempt(3)}
        />
        <button className="btn-submit" onClick={() => attempt(3)}>
          ACEPTAR
        </button>
      </div>

      {/* Final Code */}
      <div className={`input-overlay ${step === 4 ? 'show' : ''}`}>
        <div className="q-title">ACCESO DE SEGURIDAD</div>
        <div className="q-body">CÓDIGO DE APERTURA</div>
        <input
          type="tel"
          className={`code-input ${inputError === 4 ? 'error' : ''}`}
          style={{ width: '180px' }}
          placeholder="------"
          value={inputValues.final}
          onChange={(e) => handleInputChange('final', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && attemptFinal()}
        />
        <button className="btn-submit" onClick={attemptFinal}>
          ABRIR CAJA
        </button>
      </div>
    </div>
  );
};
