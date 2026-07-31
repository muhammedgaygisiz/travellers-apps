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
    highlight: true,
  },
  {
    title: 'Garden Street Bao',
    meta: '0.4 km · Markthalle',
    hue: 'linear-gradient(135deg,#c45d6a,#fec56b)',
    highlight: false,
  },
  {
    title: 'Brausermeisterplatte',
    meta: '0.62 km · Tramdepot',
    hue: 'linear-gradient(135deg,#4a90d9,#3f8f6b)',
    highlight: false,
  },
];

/**
 * Discover — match real beat: land on feed → soft scroll to Botanic Breeze →
 * settle on the card (open / read). Not the old Create-Bite CTA loop.
 */
export const FakeUiDiscover: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scroll = interpolate(
    frame,
    [Math.round(0.55 * fps), Math.round(2.1 * fps)],
    [0, 118],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easeOut,
    }
  );

  const chipPop = spring({
    frame,
    fps,
    delay: Math.round(0.1 * fps),
    config: { damping: 18, stiffness: 140, mass: 0.65 },
  });

  const cardLift = spring({
    frame,
    fps,
    delay: Math.round(2.15 * fps),
    config: { damping: 14, stiffness: 120, mass: 0.7 },
  });

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
            {['Filter', 'Search', 'Bitemap', 'Distance'].map((label, i) => (
              <span
                key={label}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 650,
                  background: i === 2 ? colors.primary : '#f1f1f1',
                  color: i === 2 ? '#fff' : colors.ink,
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
                  delay: Math.round((0.16 + i * 0.1) * fps),
                  config: { damping: 15, stiffness: 120, mass: 0.72 },
                });
                const lift = card.highlight ? cardLift : 0;
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
                      scale: interpolate(lift, [0, 1], [1, 1.04], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                        output: 'perceptual-scale',
                      }),
                      boxShadow: card.highlight
                        ? `0 ${8 + lift * 10}px ${22 + lift * 12}px rgba(74,144,217,${0.18 + lift * 0.2})`
                        : undefined,
                      borderRadius: 16,
                      background: card.highlight ? colors.white : undefined,
                      padding: card.highlight ? 6 : 0,
                    }}
                  >
                    <div
                      style={{
                        height: 118,
                        borderRadius: 14,
                        background: card.hue,
                        marginBottom: 8,
                      }}
                    />
                    <div style={{ fontWeight: 700, fontSize: 14, padding: '0 4px' }}>
                      {card.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: colors.muted,
                        padding: '0 4px 4px',
                      }}
                    >
                      {card.meta}
                    </div>
                  </div>
                );
              })}
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
