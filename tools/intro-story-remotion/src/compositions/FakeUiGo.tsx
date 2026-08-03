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

/**
 * Go — match real beat: nearby pin → drawer rises → directions settle.
 * Captions match INTRO_STORY_SCENES (not old map-only copy).
 */
export const FakeUiGo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pins = [
    { top: '30%', left: '40%', color: colors.rose, delay: 0.1 },
    { top: '46%', left: '58%', color: colors.primary, delay: 0.28, active: true },
    { top: '60%', left: '46%', color: colors.orange, delay: 0.42 },
  ];

  const drawer = spring({
    frame,
    fps,
    delay: Math.round(0.95 * fps),
    config: { damping: 16, stiffness: 125, mass: 0.75 },
  });

  const directions = spring({
    frame,
    fps,
    delay: Math.round(1.85 * fps),
    config: { damping: 13, stiffness: 140, mass: 0.55 },
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
            const selected = pin.active
              ? spring({
                  frame,
                  fps,
                  delay: Math.round(0.75 * fps),
                  config: { damping: 12, stiffness: 150, mass: 0.55 },
                })
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
                  scale: interpolate(
                    Math.max(enter, selected),
                    [0, 1],
                    [0.15, pin.active ? 1.25 : 1],
                    {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                      output: 'perceptual-scale',
                    }
                  ),
                  boxShadow: pin.active
                    ? `0 0 0 ${8 + selected * 6}px ${pin.color}44`
                    : `0 0 0 6px ${pin.color}22`,
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
              borderRadius: 18,
              background: colors.white,
              boxShadow: '0 12px 28px rgba(0,0,0,0.14)',
              opacity: drawer,
              translate: `0 ${interpolate(drawer, [0, 1], [40, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: easeOut,
              })}px`,
              display: 'grid',
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 750, fontSize: 15 }}>Botanic Breeze</div>
              <div style={{ fontSize: 12, color: colors.muted }}>0.6 km away</div>
            </div>
            <div
              style={{
                padding: '11px 0',
                borderRadius: 999,
                background: colors.green,
                color: '#fff',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: 13,
                opacity: directions,
                scale: interpolate(directions, [0, 1], [0.92, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  output: 'perceptual-scale',
                }),
                boxShadow: '0 8px 18px rgba(63,143,107,0.35)',
              }}
            >
              Directions
            </div>
          </div>
        </div>
        <Caption
          headline="Ready to taste?"
          line="Find it nearby — then go eat."
          delayFrames={10}
        />
      </PhoneShell>
    </AbsoluteFill>
  );
};
