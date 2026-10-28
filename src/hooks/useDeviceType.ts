import { useState, useEffect } from 'react';

type DeviceType = 'desktop' | 'tablet' | 'mobile';

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

function getInitialDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  // Solo pantallas táctiles pueden ser móvil/tablet: un escritorio con
  // DevTools acoplado se estrecha pero sigue siendo desktop.
  if (!isTouchDevice()) return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getInitialIsPortrait(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerHeight > window.innerWidth;
}

export function useDeviceType(): { deviceType: DeviceType; isPortrait: boolean; isLandscape: boolean } {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => getInitialDeviceType());
  const [isPortrait, setIsPortrait] = useState<boolean>(() => getInitialIsPortrait());

  useEffect(() => {
    const check = () => {
      if (!isTouchDevice()) {
        setDeviceType('desktop');
      } else {
        const width = window.innerWidth;
        if (width < 768) {
          setDeviceType('mobile');
        } else if (width < 1024) {
          setDeviceType('tablet');
        } else {
          setDeviceType('desktop');
        }
      }
      const height = window.innerHeight;
      setIsPortrait(height > window.innerWidth);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return {
    deviceType,
    isPortrait,
    isLandscape: !isPortrait,
  };
}
