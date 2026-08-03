import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { colors } from '../timing';

/** Soft product-UI ease from Remotion skills / interpolate docs. */
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

export const PhoneShell: React.FC<{
  children: React.ReactNode;
  accentSoft: string;
  title?: string;
}> = ({ children, accentSoft, title = 'BiteTribe' }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: Math.round(0.5 * fps),
  });

  // Fade out last ~0.35s so beats feel finished, not cut off (interpolate docs).
  const fadeOut = interpolate(
    frame,
    [durationInFrames - Math.round(0.35 * fps), durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut }
  );

  const y = interpolate(enter, [0, 1], [24, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 70% at 50% 0%, ${accentSoft} 0%, #1a1420 72%)`,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          width: 340,
          height: 720,
          borderRadius: 36,
          overflow: 'hidden',
          background: colors.cream,
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
          opacity: enter,
          translate: `0 ${y}px`,
          display: 'flex',
          flexDirection: 'column',
          fontFamily:
            'Outfit, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          color: colors.ink,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 18px 10px',
            background: colors.white,
          }}
        >
          <span
            style={{ fontWeight: 750, letterSpacing: '-0.02em', fontSize: 17 }}
          >
            {title}
          </span>
          <div
            style={{
              width: 20,
              height: 14,
              background:
                'linear-gradient(#20201e 0 2px, transparent 0) 0 0/100% 5px, linear-gradient(#20201e 0 2px, transparent 0) 0 50%/100% 5px, linear-gradient(#20201e 0 2px, transparent 0) 0 100%/100% 5px',
            }}
          />
        </div>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Caption: React.FC<{
  headline: string;
  line: string;
  delayFrames?: number;
}> = ({ headline, line, delayFrames = 6 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const appear = spring({
    frame,
    fps,
    delay: delayFrames,
    config: { damping: 200 },
    durationInFrames: Math.round(0.4 * fps),
  });

  const hide = interpolate(
    frame,
    [durationInFrames - Math.round(0.4 * fps), durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: 22,
        right: 22,
        bottom: 34,
        textAlign: 'center',
        opacity: appear * hide,
        translate: `0 ${interpolate(appear, [0, 1], [14, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}px`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          padding: '14px 16px',
          borderRadius: 18,
          background: 'rgba(255,253,248,0.94)',
          boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 750,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: 4,
          }}
        >
          {headline}
        </div>
        <div style={{ fontSize: 14, color: colors.muted, lineHeight: 1.3 }}>
          {line}
        </div>
      </div>
    </div>
  );
};
