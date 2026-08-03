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
 * Tribe — match real beat: explorer profile → Follow → Following toast.
 * (Old Remotion showed Share/Directions on details — that was stale.)
 */
export const FakeUiTribe: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hero = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: Math.round(0.45 * fps),
  });
  const profile = spring({
    frame,
    fps,
    delay: Math.round(0.25 * fps),
    config: { damping: 14, stiffness: 125, mass: 0.68 },
  });
  const followBtn = spring({
    frame,
    fps,
    delay: Math.round(0.7 * fps),
    config: { damping: 13, stiffness: 140, mass: 0.6 },
  });
  const followed = spring({
    frame,
    fps,
    delay: Math.round(1.55 * fps),
    config: { damping: 12, stiffness: 150, mass: 0.55 },
  });

  const followPulse =
    frame > Math.round(1.05 * fps) && frame < Math.round(1.55 * fps)
      ? interpolate(Math.sin((frame / fps) * Math.PI * 3), [-1, 1], [1, 1.06])
      : 1;

  return (
    <AbsoluteFill>
      <PhoneShell accentSoft={colors.softRose}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              height: 200,
              background: 'linear-gradient(160deg,#fec56b,#c45d6a 70%)',
              opacity: hero,
              scale: interpolate(hero, [0, 1], [1.08, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                output: 'perceptual-scale',
              }),
            }}
          />
          <div style={{ padding: 18, display: 'grid', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                opacity: profile,
                translate: `0 ${interpolate(profile, [0, 1], [14, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })}px`,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: colors.primary,
                  boxShadow: '0 6px 16px rgba(74,144,217,0.35)',
                }}
              />
              <div>
                <div style={{ fontWeight: 750, fontSize: 17 }}>Mo</div>
                <div style={{ fontSize: 12, color: colors.muted }}>
                  Explorer · 12 Bites
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '13px 0',
                borderRadius: 999,
                textAlign: 'center',
                fontWeight: 750,
                fontSize: 14,
                opacity: followBtn,
                scale: followPulse,
                background: followed > 0.5 ? '#f1f1f1' : colors.rose,
                color: followed > 0.5 ? colors.ink : '#fff',
                boxShadow:
                  followed > 0.5
                    ? 'none'
                    : '0 10px 22px rgba(196,93,106,0.35)',
              }}
            >
              {followed > 0.5 ? 'Following' : 'Follow'}
            </div>

            <div
              style={{
                justifySelf: 'center',
                marginTop: 8,
                padding: '10px 16px',
                borderRadius: 999,
                background: 'rgba(32,32,30,0.92)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 650,
                opacity: followed,
                translate: `0 ${interpolate(followed, [0, 1], [12, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })}px`,
                boxShadow: '0 10px 24px rgba(0,0,0,0.22)',
              }}
            >
              Following Mo
            </div>
          </div>
        </div>
        <Caption
          headline="Join the tribe"
          line="Follow explorers you love."
        />
      </PhoneShell>
    </AbsoluteFill>
  );
};
