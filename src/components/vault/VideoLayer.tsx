import React, { useRef, useState, useCallback, useEffect } from 'react';

interface VideoLayerProps {
  isActive: boolean;
  exitState: 'none' | 'up' | 'down';
  onTagClick: () => void;
  playSound: (type: string) => void;
}

const VIDEO_URL = "https://res.cloudinary.com/dswpi1pb9/video/upload/v1769789252/Que_la_camisa_202601301305_3mbcy_mquhhq.mp4";

export const VideoLayer: React.FC<VideoLayerProps> = ({
  isActive,
  exitState,
  onTagClick,
  playSound
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const [isReplay, setIsReplay] = useState(false);
  const [tagDropped, setTagDropped] = useState(false);
  const [stageDropOut, setStageDropOut] = useState(false);

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {
        setShowPlayOverlay(true);
      });
    }
  }, [isActive]);

  const handleVideoEnded = useCallback(() => {
    setShowPlayOverlay(true);
    setIsReplay(true);
    playSound('drop');
    setTagDropped(true);
  }, [playSound]);

  const toggleVideo = useCallback(() => {
    if (!videoRef.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play();
      setShowPlayOverlay(false);
      if (tagDropped) setTagDropped(false);
    } else {
      videoRef.current.pause();
      setShowPlayOverlay(true);
    }
  }, [tagDropped]);

  const handleTagClick = useCallback(() => {
    setStageDropOut(true);
    setTimeout(() => {
      if (videoRef.current) videoRef.current.pause();
    }, 500);
    onTagClick();
  }, [onTagClick]);

  const getLayerClass = () => {
    let className = 'layer';
    if (isActive) className += ' active';
    if (exitState === 'up') className += ' exit-up';
    if (exitState === 'down') className += ' exit-down';
    return className;
  };

  return (
    <div id="reveal-layer" className={getLayerClass()}>
      <div className={`shirt-stage ${stageDropOut ? 'drop-out' : ''}`}>
        <div className="device-case">
          <div className="video-wrapper">
            <div className="video-ui-overlay">
              <div className="rec-header">
                <div className="rec-badge">● REC</div>
                <div className="data-block">
                  <div className="confidential-text">EVIDENCIA #23</div>
                  <div className="data-row">LOC: VAULT INTERIOR</div>
                </div>
              </div>
              <div className="rec-footer">
                <div className="battery">[|||||] 98%</div>
                <div className="time-code">00:04:23:12</div>
              </div>
            </div>
            
            <video
              ref={videoRef}
              className="shirt-video"
              playsInline
              onEnded={handleVideoEnded}
            >
              <source src={VIDEO_URL} type="video/mp4" />
            </video>
            
            <div 
              className={`play-overlay ${!showPlayOverlay ? 'hidden' : ''}`}
              onClick={toggleVideo}
            >
              <div className={`play-btn ${isReplay ? 'replay' : ''}`}>
                {isReplay && '↺'}
              </div>
            </div>
          </div>
          
          <div className="device-controls">
            <div className="control-btn red" />
            <div className="control-btn" />
            <div className="control-slider" />
          </div>
        </div>
        
        <div 
          className={`tag-hanging ${tagDropped ? 'dropped' : ''}`}
          onClick={handleTagClick}
        >
          <div className="tag-string-fix" />
          <div className="tag-text">¿UN SECRETO<br />MÁS?</div>
          <div className="tag-arrow">▼</div>
        </div>
      </div>
    </div>
  );
};
