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

/** Share — shutter flash, fields cascade, Share CTA settles. */
export const FakeUiShare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shutter = spring({
    frame,
    fps,
    delay: Math.round(0.28 * fps),
    config: { damping: 11, stiffness: 170, mass: 0.5 },
  });

  const flash = interpolate(
    frame,
    [
      Math.round(0.48 * fps),
      Math.round(0.55 * fps),
      Math.round(0.72 * fps),
    ],
    [0, 0.6, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const fieldA = spring({
    frame,
    fps,
    delay: Math.round(0.8 * fps),
    config: { damping: 200 },
    durationInFrames: Math.round(0.4 * fps),
  });
  const fieldB = spring({
    frame,
    fps,
    delay: Math.round(1.05 * fps),
    config: { damping: 200 },
    durationInFrames: Math.round(0.4 * fps),
  });
  const tags = spring({
    frame,
    fps,
    delay: Math.round(1.3 * fps),
    config: { damping: 14, stiffness: 130, mass: 0.65 },
  });
  const save = spring({
    frame,
    fps,
    delay: Math.round(1.65 * fps),
    config: { damping: 14, stiffness: 135, mass: 0.6 },
  });

  return (
    <AbsoluteFill>
      <PhoneShell accentSoft={colors.softOrange}>
        <div style={{ padding: 14, display: 'grid', gap: 12 }}>
          <div
            style={{
              height: 188,
              borderRadius: 20,
              background: '#ece7de',
              display: 'grid',
              placeItems: 'center',
              gap: 8,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#fff',
                opacity: flash,
              }}
            />
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: `3px solid ${colors.primary}`,
                background: colors.white,
                scale: interpolate(shutter, [0, 0.4, 1], [1, 0.76, 1.04], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
              }}
            />
            <div style={{ fontSize: 13, color: colors.muted }}>
              Tap to add a photo
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              background: colors.white,
              border: `2px solid ${colors.primary}`,
              opacity: fieldA,
              translate: `0 ${interpolate(fieldA, [0, 1], [10, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}px`,
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
              opacity: fieldB,
              translate: `0 ${interpolate(fieldB, [0, 1], [10, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}px`,
              fontSize: 14,
            }}
          >
            Einstein au Jardin
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              opacity: tags,
              scale: interpolate(tags, [0, 1], [0.88, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                output: 'perceptual-scale',
              }),
            }}
          >
            {['bern', 'drink', '+ tag'].map((t) => (
              <span
                key={t}
                style={{
                  padding: '5px 10px',
                  borderRadius: 999,
                  background: colors.softBlue,
                  color: '#2a5f96',
                  fontSize: 12,
                  fontWeight: 650,
                }}
              >
                {t}
              </span>
            ))}
          </div>

          <div
            style={{
              marginTop: 6,
              padding: '14px 0',
              borderRadius: 999,
              background: colors.orange,
              color: '#fff',
              textAlign: 'center',
              fontWeight: 750,
              opacity: save,
              scale: interpolate(save, [0, 1], [0.9, 1], {
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
        <Caption
          headline="Share the find"
          line="Snap it. Tag it. Pass it on."
          delayFrames={10}
        />
      </PhoneShell>
    </AbsoluteFill>
  );
};
