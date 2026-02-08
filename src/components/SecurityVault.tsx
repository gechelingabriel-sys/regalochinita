import React, { useState, useCallback, useEffect } from 'react';
import { useAudio } from '../hooks/useAudio';
import { VaultLayer } from './vault/VaultLayer';
import { VoucherLayer } from './vault/VoucherLayer';
import { VideoLayer } from './vault/VideoLayer';
import { InnerSanctumLayer } from './vault/InnerSanctumLayer';

type Layer = 'vault' | 'voucher' | 'video' | 'sanctum';

export const SecurityVault: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState<Layer>('vault');
  const [exitingLayer, setExitingLayer] = useState<Layer | null>(null);
  const { init, play, toggleMusic, musicPlaying } = useAudio();

  // Initialize audio on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      init();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [init]);

  const transitionToLayer = useCallback((from: Layer, to: Layer) => {
    setExitingLayer(from);
    setTimeout(() => {
      setActiveLayer(to);
      setExitingLayer(null);
    }, 200);
  }, []);

  const handleVaultUnlocked = useCallback(() => {
    transitionToLayer('vault', 'voucher');
  }, [transitionToLayer]);

  const handleVoucherContinue = useCallback(() => {
    transitionToLayer('voucher', 'video');
  }, [transitionToLayer]);

  const handleVideoTagClick = useCallback(() => {
    transitionToLayer('video', 'sanctum');
  }, [transitionToLayer]);

  const getExitState = (layer: Layer): 'none' | 'up' | 'down' => {
    if (exitingLayer === layer) return 'up';
    return 'none';
  };

  return (
    <div className="app-container">
      {/* SVG Filter for ink effect */}
      <svg style={{ display: 'none' }}>
        <filter id="ink-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
        </filter>
      </svg>

      <VaultLayer
        isActive={activeLayer === 'vault'}
        exitState={getExitState('vault')}
        onUnlocked={handleVaultUnlocked}
        playSound={play}
        initAudio={init}
      />

      <VoucherLayer
        isActive={activeLayer === 'voucher'}
        exitState={getExitState('voucher')}
        onContinue={handleVoucherContinue}
        playSound={play}
      />

      <VideoLayer
        isActive={activeLayer === 'video'}
        exitState={getExitState('video')}
        onTagClick={handleVideoTagClick}
        playSound={play}
      />

      <InnerSanctumLayer
        isActive={activeLayer === 'sanctum'}
        playSound={play}
        toggleMusic={toggleMusic}
        musicPlaying={musicPlaying}
      />
    </div>
  );
};
