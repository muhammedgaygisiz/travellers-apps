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

const cards = [
  {
    title: 'Botanic Breeze',
    meta: '0.6 km · Einstein',
    hue: 'linear-gradient(135deg,#fec56b,#4a90d9)',
  },
  {
    title: 'Brausermeisterplatte',
    meta: '0.62 km · Tramdepot',
    hue: 'linear-gradient(135deg,#4a90d9,#c45d6a)',
  },
  {
    title: 'Garden Bowl',
    meta: '1.1 km · Lorraine',
    hue: 'linear-gradient(135deg,#c45d6a,#3f8f6b)',
  },
];

/** Discover — feed springs in, soft scroll, Create Bite pulse. */
export const FakeUiDiscover: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scroll = interpolate(
    frame,
    [Math.round(0.65 * fps), Math.round(2.35 * fps)],
    [0, 96],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easeOut,
    }
  );

  const chipPop = spring({
    frame,
    fps,
    delay: Math.round(0.12 * fps),
    config: { damping: 18, stiffness: 140, mass: 0.65 },
  });

  const ctaEnter = spring({
    frame,
    fps,
    delay: Math.round(0.45 * fps),
    config: { damping: 16, stiffness: 130, mass: 0.7 },
  });

  const ctaPulse = interpolate(
    Math.sin((frame / fps) * Math.PI * 2.1),
    [-1, 1],
    [1, 1.04]
  );

  return (
    <AbsoluteFill>
      <PhoneShell accentSoft={colors.softBlue}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '10px 14px 6px',
              opacity: chipPop,
              scale: interpolate(chipPop, [0, 1], [0.9, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                output: 'perceptual-scale',
              }),
            }}
          >
            {['Search', 'Bitemap', 'Distance'].map((label, i) => (
              <span
                key={label}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 650,
                  background: i === 1 ? colors.primary : '#f1f1f1',
                  color: i === 1 ? '#fff' : colors.ink,
                }}
              >
                {label}
              </span>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'hidden', padding: '4px 14px 0' }}>
            <div style={{ translate: `0 ${-scroll}px` }}>
              {cards.map((card, i) => {
                const enter = spring({
                  frame,
                  fps,
                  delay: Math.round((0.18 + i * 0.11) * fps),
                  config: { damping: 15, stiffness: 120, mass: 0.72 },
                });
                return (
                  <div
                    key={card.title}
                    style={{
                      marginBottom: 14,
                      opacity: enter,
                      translate: `0 ${interpolate(enter, [0, 1], [32, 0], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                      })}px`,
                    }}
                  >
                    <div
                      style={{
                        height: 118,
                        borderRadius: 16,
                        background: card.hue,
                        marginBottom: 8,
                      }}
                    />
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: 12, color: colors.muted }}>
                      {card.meta}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              padding: 12,
              background: colors.white,
              borderTop: '1px solid rgba(32,32,30,0.08)',
              opacity: ctaEnter,
              translate: `0 ${interpolate(ctaEnter, [0, 1], [18, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}px`,
            }}
          >
            <div
              style={{
                padding: '14px 0',
                borderRadius: 999,
                background: colors.primary,
                color: '#fff',
                fontWeight: 750,
                textAlign: 'center',
                scale: ctaPulse,
                boxShadow: '0 8px 20px rgba(74,144,217,0.35)',
              }}
            >
              Create Bite
            </div>
          </div>
        </div>
        <Caption
          headline="Find the bite"
          line="Dishes worth eating, right where you are."
        />
      </PhoneShell>
    </AbsoluteFill>
  );
};
