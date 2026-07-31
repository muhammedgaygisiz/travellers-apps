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

/** Tribe — hero settle, creator, Share action pulse. */
export const FakeUiTribe: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hero = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: Math.round(0.5 * fps),
  });
  const creator = spring({
    frame,
    fps,
    delay: Math.round(0.28 * fps),
    config: { damping: 14, stiffness: 125, mass: 0.68 },
  });
  const actions = spring({
    frame,
    fps,
    delay: Math.round(0.58 * fps),
    config: { damping: 15, stiffness: 125, mass: 0.68 },
  });
  const blurb = spring({
    frame,
    fps,
    delay: Math.round(0.9 * fps),
    config: { damping: 200 },
    durationInFrames: Math.round(0.35 * fps),
  });

  const sharePulse =
    frame > Math.round(1.15 * fps)
      ? interpolate(Math.sin((frame / fps) * Math.PI * 2.3), [-1, 1], [1, 1.055])
      : 1;

  return (
    <AbsoluteFill>
      <PhoneShell accentSoft={colors.softRose}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              height: 240,
              background: 'linear-gradient(160deg,#fec56b,#c45d6a 70%)',
              opacity: hero,
              scale: interpolate(hero, [0, 1], [1.1, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                output: 'perceptual-scale',
              }),
            }}
          />
          <div style={{ padding: 16, display: 'grid', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                opacity: creator,
                translate: `0 ${interpolate(creator, [0, 1], [14, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })}px`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: colors.primary,
                }}
              />
              <div>
                <div style={{ fontWeight: 750, fontSize: 15 }}>Mo</div>
                <div style={{ fontSize: 12, color: colors.muted }}>
                  Public · 12 Bites
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                opacity: actions,
                translate: `0 ${interpolate(actions, [0, 1], [12, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })}px`,
              }}
            >
              {['Share', 'Directions', 'Save'].map((label, i) => (
                <span
                  key={label}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 650,
                    background: i === 0 ? colors.rose : '#f1f1f1',
                    color: i === 0 ? '#fff' : colors.ink,
                    scale: i === 0 ? sharePulse : 1,
                    boxShadow:
                      i === 0 ? '0 8px 18px rgba(196,93,106,0.35)' : undefined,
                  }}
                >
                  {label}
                </span>
              ))}
            </div>

            <div
              style={{
                fontSize: 14,
                color: colors.muted,
                lineHeight: 1.4,
                opacity: blurb,
              }}
            >
              A refreshing botanical drink in the city garden.
            </div>
          </div>
        </div>
        <Caption
          headline="Join the tribe"
          line="Follow explorers. Build bucket lists."
        />
      </PhoneShell>
    </AbsoluteFill>
  );
};
