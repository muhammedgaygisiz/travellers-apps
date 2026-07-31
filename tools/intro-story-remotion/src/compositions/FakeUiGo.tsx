import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Caption, PhoneShell, easeOut } from '../components/PhoneShell';
import { colors } from '../timing';

/** Go — pins cascade, drawer rises with nearby Bite. */
export const FakeUiGo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pins = [
    { top: '28%', left: '42%', color: colors.rose, delay: 0.12 },
    { top: '48%', left: '62%', color: colors.primary, delay: 0.3 },
    { top: '58%', left: '48%', color: colors.green, delay: 0.48 },
  ];

  const drawer = spring({
    frame,
    fps,
    delay: Math.round(0.95 * fps),
    config: { damping: 16, stiffness: 125, mass: 0.75 },
  });

  return (
    <AbsoluteFill>
      <PhoneShell accentSoft={colors.softGreen}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 30% 40%, #d6e7f8, transparent 40%), radial-gradient(circle at 70% 60%, #d5eee3, transparent 35%), linear-gradient(180deg,#e8f0e4,#cfd9c8)',
          }}
        >
          {pins.map((pin, i) => {
            const enter = spring({
              frame,
              fps,
              delay: Math.round(pin.delay * fps),
              config: { damping: 11, stiffness: 170, mass: 0.5 },
            });
            const bounce =
              enter > 0.98
                ? interpolate(
                    Math.sin((frame / fps) * Math.PI * 2.2 + i),
                    [-1, 1],
                    [0, -5]
                  )
                : 0;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: pin.top,
                  left: pin.left,
                  width: 16,
                  height: 16,
                  borderRadius: '50% 50% 50% 0',
                  background: pin.color,
                  rotate: '-45deg',
                  opacity: enter,
                  scale: interpolate(enter, [0, 1], [0.15, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                    output: 'perceptual-scale',
                  }),
                  translate: `0 ${bounce}px`,
                  boxShadow: `0 0 0 8px ${pin.color}33`,
                }}
              />
            );
          })}

          <div
            style={{
              position: 'absolute',
              left: 14,
              right: 14,
              bottom: 14,
              padding: '14px 16px',
              borderRadius: 16,
              background: colors.white,
              boxShadow: '0 12px 28px rgba(0,0,0,0.14)',
              opacity: drawer,
              translate: `0 ${interpolate(drawer, [0, 1], [36, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: easeOut,
              })}px`,
            }}
          >
            <div style={{ fontWeight: 750, fontSize: 15 }}>Botanic Breeze</div>
            <div style={{ fontSize: 12, color: colors.muted }}>0.6 km away</div>
          </div>
        </div>
        <Caption
          headline="Ready to taste?"
          line="Your map of great food starts now."
          delayFrames={12}
        />
      </PhoneShell>
    </AbsoluteFill>
  );
};
