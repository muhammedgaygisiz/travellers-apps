// Generates the DEV and QA app icons from the production ones (issue 1221
// follow-up), so a non-production build is told apart on the home screen.
//
//   node tools/generate-stage-icons.mjs
//
// Re-run it whenever the production icon changes; the outputs are committed.
//
// iOS: AppIcon-Dev and AppIcon-QA asset sets next to AppIcon. Only the Debug
// configuration can select them (BITETRIBE_APP_ICON); Release hard-codes
// AppIcon, so an archive always carries the production icon.
//
// Android: a DEV icon under app/src/debug/res and a QA icon under
// app/src/qa/res, which the debug and qa build types use in place of
// app/src/main/res. Release keeps the production icon.
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import sharp from 'sharp';

const STAGES = {
  dev: { label: 'DEV', colour: '#6d28d9' },
  qa: { label: 'QA', colour: '#c2410c' },
};

const IOS_ASSETS = resolve('apps/bite-tribe-ios/ios/App/App/Assets.xcassets');
const ANDROID_RES = resolve('apps/bite-tribe-android/android/app/src');

// A band across the icon, with the label centred in it. `top` and `height`
// are fractions of the icon. Android's adaptive foreground is masked to its
// central 66%, so its band sits higher than the bottom edge.
const band = (size, { label, colour }, { top, height }) => {
  const y = Math.round(size * top);
  const h = Math.round(size * height);
  const fontSize = Math.round(h * 0.62);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect x="0" y="${y}" width="${size}" height="${h}" fill="${colour}"/>
      <text x="50%" y="${y + h / 2}" dominant-baseline="central" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif" font-weight="700"
        font-size="${fontSize}" letter-spacing="${fontSize * 0.08}" fill="#ffffff">${label}</text>
    </svg>`,
  );
};

// `atop` keeps the band inside the icon's own shape, so a round or
// transparent-cornered bitmap gets no square band sticking out of it. The
// adaptive foreground is the exception: the launcher masks it, and its
// transparent area is where the band has to cross the background layer.
const stamp = async (source, target, stage, placement, blend = 'atop') => {
  const { width } = await sharp(source).metadata();
  mkdirSync(dirname(target), { recursive: true });
  await sharp(source)
    .composite([{ input: band(width, stage, placement), blend }])
    .png()
    .toFile(target);
};

// iOS: one 1024 image per set, the same shape as AppIcon.appiconset.
for (const [key, stage] of Object.entries(STAGES)) {
  const name = `AppIcon-${key === 'qa' ? 'QA' : 'Dev'}`;
  const dir = join(IOS_ASSETS, `${name}.appiconset`);
  await stamp(
    join(IOS_ASSETS, 'AppIcon.appiconset/AppIcon-512@2x.png'),
    join(dir, 'AppIcon-512@2x.png'),
    stage,
    { top: 0.76, height: 0.24 },
  );
  writeFileSync(
    join(dir, 'Contents.json'),
    `${JSON.stringify(
      {
        images: [
          {
            idiom: 'universal',
            size: '1024x1024',
            filename: 'AppIcon-512@2x.png',
            platform: 'ios',
          },
        ],
        info: { author: 'xcode', version: 1 },
      },
      null,
      2,
    )}\n`,
  );
  console.log(`ios ${name}`);
}

// Android: every launcher bitmap of every density, into the source set of the
// build type that names the stage (debug for DEV, qa for QA).
const ANDROID_SOURCE_SET = { dev: 'debug', qa: 'qa' };
const mipmaps = readdirSync(join(ANDROID_RES, 'main/res')).filter(
  (dir) => dir.startsWith('mipmap-') && !dir.includes('anydpi'),
);
for (const [key, stage] of Object.entries(STAGES)) {
  for (const dir of mipmaps) {
    for (const file of readdirSync(join(ANDROID_RES, 'main/res', dir))) {
      if (!file.startsWith('ic_launcher') || file.includes('background')) {
        continue;
      }
      await stamp(
        join(ANDROID_RES, 'main/res', dir, file),
        join(ANDROID_RES, ANDROID_SOURCE_SET[key], 'res', dir, file),
        stage,
        file.includes('foreground')
          ? { top: 0.6, height: 0.14 }
          : { top: 0.64, height: 0.18 },
        file.includes('foreground') ? 'over' : 'atop',
      );
    }
  }
  console.log(`android ${ANDROID_SOURCE_SET[key]} ${stage.label}`);
}
