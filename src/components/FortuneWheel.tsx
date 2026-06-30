import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import type { Game, Settings } from '../types';

interface FortuneWheelProps {
  games: Game[];
  onResult: (game: Game) => void;
  isSpinning: boolean;
  setIsSpinning: (spinning: boolean) => void;
  settings: Settings;
  onSpinStart?: () => void;
  isWinPopupOpen?: boolean;
}

const FortuneWheel: React.FC<FortuneWheelProps> = ({ 
  games, 
  onResult, 
  isSpinning, 
  setIsSpinning,
  settings,
  onSpinStart,
  isWinPopupOpen
}) => {
  const controls = useAnimation();
  const [totalRotation, setTotalRotation] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const currentRotationRef = useRef(0);

  useEffect(() => {
    currentRotationRef.current = totalRotation;
    controls.set({ rotate: totalRotation });
  }, [totalRotation, controls]);

  useEffect(() => {
    if (!isSpinning && !isWinPopupOpen && settings.wheel.idleSpin && games.length > 0) {
      lastTimeRef.current = performance.now();
      
      const animateIdle = (time: number) => {
        const deltaTime = time - lastTimeRef.current;
        lastTimeRef.current = time;
        
        const degreesToAdd = (deltaTime / 1000) * 6;
        
        currentRotationRef.current -= degreesToAdd;
        controls.set({ rotate: currentRotationRef.current });
        
        animationFrameRef.current = requestAnimationFrame(animateIdle);
      };
      
      animationFrameRef.current = requestAnimationFrame(animateIdle);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpinning, settings.wheel.idleSpin, games.length, controls, isWinPopupOpen]);

  const spin = async () => {
    if (isSpinning || games.length === 0) return;

    if (onSpinStart) onSpinStart();
    setIsSpinning(true);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Use cryptographically secure random
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const random = randomArray[0] / 0xFFFFFFFF; // Convert to 0-1
    
    const spinDegrees = 1800 + random * 360;
    const newRotation = currentRotationRef.current - spinDegrees;
    
    await controls.start({
      rotate: newRotation,
      transition: { duration: settings.wheel.spinDuration, ease: [0.22, 1, 0.36, 1] }
    });

    setTotalRotation(newRotation);
    setIsSpinning(false);

    // Pointer is on RIGHT (0 degrees), adjust calculation accordingly!
    const normalizedRotation = (-newRotation) % 360;
    const adjustedRotation = (normalizedRotation + 90) % 360; // because we have -90 offset in sector angles
    const sectorAngle = 360 / games.length;
    let winningIndex = Math.floor(adjustedRotation / sectorAngle);
    if (winningIndex < 0) winningIndex += games.length;
    if (winningIndex >= games.length) winningIndex = 0;
    onResult(games[winningIndex]);
  };

  const sectorAngle = 360 / games.length;
  
  const getTextRadius = () => {
    switch (settings.wheel.textPosition) {
      case 'inner': return 22;
      case 'middle': return 30;
      case 'outer': return 38;
      case 'far-outer': default: return 42;
    }
  };

  const textRadius = getTextRadius();

  const getFontSize = () => {
    if (games.length <= 4) return 9;
    if (games.length <= 8) return 7;
    if (games.length <= 16) return 5;
    if (games.length <= 24) return 4;
    if (games.length <= 36) return 3.2;
    if (games.length <= 50) return 2.6;
    return 2.2;
  };

  const fontSize = getFontSize();

  return (
    <div className="relative w-[min(90vw,90vh,700px)] h-[min(90vw,90vh,700px)] mx-auto">
      <div 
        className="absolute right-0 top-1/2 translate-x-4 -translate-y-1/2 z-10 w-14 h-10 md:w-16 md:h-12 shadow-xl border-2"
        style={{ 
          clipPath: 'polygon(100% 0%, 0% 50%, 100% 100%)', 
          backgroundColor: settings.customization.pointerColor,
          borderColor: settings.customization.wheelBorderColor
        }} 
      />
      
      <motion.div
        animate={controls}
        initial={{ rotate: 0 }}
        className="w-full h-full rounded-full border-8 md:border-12 shadow-2xl overflow-hidden relative"
        style={{ 
          borderColor: settings.customization.wheelBorderColor
        }}
      >
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundColor: settings.customization.wheelBgColor,
            opacity: settings.customization.wheelBgOpacity
          }}
        />
        {settings.customization.wheelImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${settings.customization.wheelImage})`,
              opacity: settings.customization.wheelImageOpacity
            }}
          />
        )}
        <svg viewBox="0 0 100 100" className="w-full h-full relative z-10">
          {games.map((game, i) => {
            const sectorStartAngle = i * sectorAngle - 90;
            const sectorEndAngle = (i + 1) * sectorAngle - 90;
            const sectorMidAngle = sectorStartAngle + sectorAngle / 2;
            
            const x1 = 50 + 50 * Math.cos((sectorStartAngle * Math.PI) / 180);
            const y1 = 50 + 50 * Math.sin((sectorStartAngle * Math.PI) / 180);
            const x2 = 50 + 50 * Math.cos((sectorEndAngle * Math.PI) / 180);
            const y2 = 50 + 50 * Math.sin((sectorEndAngle * Math.PI) / 180);
            const largeArcFlag = sectorAngle > 180 ? 1 : 0;
            const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

            const textX = 50 + textRadius * Math.cos((sectorMidAngle * Math.PI) / 180);
            const textY = 50 + textRadius * Math.sin((sectorMidAngle * Math.PI) / 180);
            
            const textRotation = sectorMidAngle;
            
            const truncMult = settings.wheel.textTruncationMultiplier;
            let displayName = game.name;
            // Не обрезаем текст, если множитель >= 10
            if (truncMult < 10) {
              if (games.length <= 4) {
                const maxLen = Math.round(22 * truncMult);
                displayName = game.name.length > maxLen ? `${game.name.substring(0, Math.max(3, maxLen - 3))}...` : game.name;
              } else if (games.length <= 8) {
                const maxLen = Math.round(18 * truncMult);
                displayName = game.name.length > maxLen ? `${game.name.substring(0, Math.max(3, maxLen - 3))}...` : game.name;
              } else if (games.length <= 16) {
                const maxLen = Math.round(14 * truncMult);
                displayName = game.name.length > maxLen ? `${game.name.substring(0, Math.max(3, maxLen - 3))}...` : game.name;
              } else if (games.length <= 24) {
                const maxLen = Math.round(10 * truncMult);
                displayName = game.name.length > maxLen ? `${game.name.substring(0, Math.max(3, maxLen - 3))}...` : game.name;
              } else if (games.length <= 36) {
                const maxLen = Math.round(8 * truncMult);
                displayName = game.name.length > maxLen ? `${game.name.substring(0, Math.max(3, maxLen - 3))}...` : game.name;
              } else if (games.length <= 50) {
                const maxLen = Math.round(6 * truncMult);
                displayName = game.name.length > maxLen ? `${game.name.substring(0, Math.max(3, maxLen - 3))}...` : game.name;
              } else {
                const maxLen = Math.round(5 * truncMult);
                displayName = game.name.length > maxLen ? `${game.name.substring(0, Math.max(3, maxLen - 3))}...` : game.name;
              }
            }

            return (
              <g key={game.id}>
                {settings.wheel.showColors && (
                  <path 
                    d={pathData} 
                    fill={game.color} 
                    stroke="transparent" 
                    strokeWidth="0.2" 
                    opacity={settings.customization.colorOpacity}
                  />
                )}
                {settings.wheel.showImages && (
                  <g transform={`translate(${textX}, ${textY}) rotate(${textRotation})`}>
                    {game.image ? (
                      <image
                        href={game.image}
                        x="-6"
                        y="-6"
                        width="12"
                        height="12"
                        preserveAspectRatio="xMidYMid slice"
                        className="select-none pointer-events-none"
                        style={{ borderRadius: '50%' }}
                      />
                    ) : (
                      <circle
                        cx="0"
                        cy="0"
                        r="6"
                        fill={game.color}
                        opacity="0.8"
                        className="select-none pointer-events-none"
                      />
                    )}
                  </g>
                )}
                {settings.wheel.showGameNames && (
                  <g transform={`translate(${textX}, ${textY}) rotate(${textRotation})`}>
                    <text
                      fill={settings.wheel.textColor}
                      fontSize={fontSize}
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline={settings.wheel.showImages && game.image ? "hanging" : "middle"}
                      y={settings.wheel.showImages && game.image ? "7" : "0"}
                      className="select-none pointer-events-none"
                      style={{ 
                        paintOrder: 'stroke',
                        stroke: settings.wheel.textStrokeColor,
                        strokeWidth: settings.wheel.textStrokeWidth
                      }}
                    >
                      {displayName}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          {settings.wheel.showSectorLines && (
            <g style={{ opacity: settings.customization.sectorLineOpacity }}>
              {games.map((game, i) => {
                const sectorStartAngle = i * sectorAngle - 90;
                const x1 = 50 + 50 * Math.cos((sectorStartAngle * Math.PI) / 180);
                const y1 = 50 + 50 * Math.sin((sectorStartAngle * Math.PI) / 180);
                return (
                  <line 
                    key={`line-${game.id}`}
                    x1="50" 
                    y1="50" 
                    x2={x1} 
                    y2={y1} 
                    stroke="#1f2937" 
                    strokeWidth="0.2"
                  />
                );
              })}
            </g>
          )}
        </svg>
      </motion.div>

      <button
        onClick={spin}
        disabled={isSpinning}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[15%] h-[15%] min-w-[60px] min-h-[60px] max-w-[120px] max-h-[120px] rounded-full border-6 md:border-8 shadow-xl flex items-center justify-center font-bold hover:opacity-90 transition-all z-20 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-lg"
        style={{ 
          borderColor: settings.customization.wheelBorderColor,
          backgroundColor: settings.spinButton.backgroundColor,
          color: settings.spinButton.textColor
        }}
      >
        {settings.spinButton.text}
      </button>
    </div>
  );
};

export default FortuneWheel;
