import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Caption, PhoneShell } from '../components/PhoneShell';
import { colors } from '../timing';

/**
 * Share — match real beat: create form → photo land → publish → thumbs-up cheer.
 * Stylized fake UI (not Angular capture).
 */
export const FakeUiShare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const formIn = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: Math.round(0.4 * fps),
  });

  const photo = spring({
    frame,
    fps,
    delay: Math.round(0.55 * fps),
    config: { damping: 14, stiffness: 130, mass: 0.65 },
  });

  const publish = spring({
    frame,
    fps,
    delay: Math.round(1.25 * fps),
    config: { damping: 14, stiffness: 135, mass: 0.6 },
  });

  const cheerStart = Math.round(2.05 * fps);
  const cheer = spring({
    frame,
    fps,
    delay: cheerStart,
    config: { damping: 11, stiffness: 160, mass: 0.5 },
  });

  const sparks = Array.from({ length: 10 }, (_, i) => {
    const ang = (i / 10) * Math.PI * 2;
    const dist = interpolate(cheer, [0, 1], [0, 54 + (i % 3) * 10], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return {
      x: Math.cos(ang) * dist,
      y: Math.sin(ang) * dist - 8,
      hue: i % 3 === 0 ? '#ffe08a' : i % 3 === 1 ? '#ffb0c4' : '#9ad8f0',
    };
  });

  return (
    <AbsoluteFill>
      <PhoneShell accentSoft={colors.softOrange}>
        <div
          style={{
            padding: 14,
            display: 'grid',
            gap: 12,
            opacity: formIn,
            height: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              height: 160,
              borderRadius: 18,
              background:
                photo > 0.2
                  ? 'linear-gradient(145deg,#fec56b,#4a90d9 70%)'
                  : '#ece7de',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
              scale: interpolate(photo, [0, 1], [0.94, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                output: 'perceptual-scale',
              }),
              boxShadow:
                photo > 0.5
                  ? '0 12px 28px rgba(224,138,58,0.28)'
                  : 'none',
            }}
          >
            {photo < 0.35 ? (
              <div style={{ fontSize: 13, color: colors.muted }}>
                Add a photo
              </div>
            ) : null}
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              background: colors.white,
              border: `2px solid ${colors.primary}`,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Botanic Breeze
          </div>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              background: colors.white,
              border: '1px solid rgba(32,32,30,0.1)',
              fontSize: 14,
            }}
          >
            Einstein au Jardin
          </div>

          <div
            style={{
              marginTop: 'auto',
              padding: '14px 0',
              borderRadius: 999,
              background: colors.orange,
              color: '#fff',
              textAlign: 'center',
              fontWeight: 750,
              opacity: publish,
              scale: interpolate(publish, [0, 1], [0.9, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                output: 'perceptual-scale',
              }),
              boxShadow: '0 10px 24px rgba(224,138,58,0.35)',
            }}
          >
            Share Bite
          </div>
        </div>

        {/* Thumbs-up celebration — matches real share beat resolve */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '42%',
            width: 0,
            height: 0,
            opacity: cheer,
            pointerEvents: 'none',
          }}
        >
          {sparks.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: s.x,
                top: s.y,
                width: 10 + (i % 3) * 3,
                height: 10 + (i % 3) * 3,
                borderRadius: '50%',
                background: s.hue,
                boxShadow: `0 0 14px ${s.hue}`,
                opacity: interpolate(cheer, [0.2, 1], [1, 0.15], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
              }}
            />
          ))}
          <div
            style={{
              position: 'absolute',
              left: -28,
              top: -36,
              fontSize: 56,
              scale: interpolate(cheer, [0, 1], [0.4, 1.25], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                output: 'perceptual-scale',
              }),
              filter: 'drop-shadow(0 0 18px rgba(255,200,90,0.7))',
            }}
          >
            👍
          </div>
        </div>

        <Caption
          headline="Share the find"
          line="Snap it. Tag it. Pass it on."
          delayFrames={8}
        />
      </PhoneShell>
    </AbsoluteFill>
  );
};
