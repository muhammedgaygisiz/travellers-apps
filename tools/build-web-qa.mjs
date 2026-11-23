// Builds the web apps for the QA project, bite-tribe-qa (issue 2293).
//
//   node tools/build-web-qa.mjs                    # consumer, business, admin
//   node tools/build-web-qa.mjs bite-tribe-business
//
// Each app is built with the production configuration - the same optimised
// bundle production ships - and only the values of
// apps/bite-tribe-firebase/backends/qa.json plus qa.web.json, with Nx's .env
// loading switched off, so nothing from the production .env reaches a QA
// bundle. The bundle is then checked for the QA project and the QA site key,
// and for the absence of production's, so a QA site can never quietly talk to
// production.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { backendEnv } from './firebase-backend-env.mjs';

const APPS = ['bite-tribe', 'bite-tribe-business', 'bite-tribe-admin'];

/** Values that only a production bundle carries. */
const PRODUCTION_MARKERS = ['bite-tribe.firebaseapp.com', '"bite-tribe"'];

const requested = process.argv.slice(2);
const apps = requested.length ? requested : APPS;
const unknown = apps.filter((app) => !APPS.includes(app));

if (unknown.length) {
  console.error(
    `Unknown app: ${unknown.join(', ')}. Choose from ${APPS.join(', ')}.`,
  );
  process.exit(1);
}

const qa = backendEnv('qa', { web: true });

if (!qa.NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY) {
  console.error(
    'backends/qa.web.json has no NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY.',
  );
  process.exit(1);
}

const filesOf = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    return statSync(path).isDirectory() ? filesOf(path) : [path];
  });

const bundleText = (dir) =>
  filesOf(dir)
    .filter((file) => ['.js', '.mjs', '.html', '.json'].includes(extname(file)))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

for (const app of apps) {
  const result = spawnSync(
    'npx',
    ['nx', 'build', app, '--configuration=production', '--skip-nx-cache'],
    { stdio: 'inherit', env: { ...process.env, ...qa } },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const text = bundleText(resolve(`dist/apps/${app}`));
  const problems = [
    ...(text.includes(qa.NX_APP_BITE_TRIBE_PROJECT_ID)
      ? []
      : [`does not name the QA project ${qa.NX_APP_BITE_TRIBE_PROJECT_ID}`]),
    ...(text.includes(qa.NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY)
      ? []
      : ['does not carry the QA reCAPTCHA site key']),
    ...PRODUCTION_MARKERS.filter((marker) => text.includes(marker)).map(
      (marker) => `carries the production value ${marker}`,
    ),
  ];

  if (problems.length) {
    console.error(`dist/apps/${app} ${problems.join('; ')}.`);
    process.exit(1);
  }

  console.log(`dist/apps/${app} is a QA bundle.`);
}
