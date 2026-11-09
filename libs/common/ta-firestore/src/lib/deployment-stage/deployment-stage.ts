/**
 * Which backend a build talks to, so a non-production build can say so
 * (issue 1221 follow-up).
 *
 * - `dev`: a local build routed at the Firebase emulators
 *   (`NX_APP_BITE_TRIBE_IS_DEV=true`). Production bundles strip that key, so a
 *   production build can never resolve to `dev`.
 * - `qa`: a build configured for the `bite-tribe-qa` project. The QA native
 *   build is a production bundle, so the project ID is the only signal, and no
 *   extra environment key is needed.
 * - `production`: everything else. Nothing is shown.
 */
export type DeploymentStage = 'dev' | 'qa' | 'production';

export const QA_FIREBASE_PROJECT_ID = 'bite-tribe-qa';

export const resolveDeploymentStage = (
  env: Record<string, string | undefined> = process.env,
): DeploymentStage => {
  if (env['NX_APP_BITE_TRIBE_IS_DEV'] === 'true') {
    return 'dev';
  }
  if (env['NX_APP_BITE_TRIBE_PROJECT_ID'] === QA_FIREBASE_PROJECT_ID) {
    return 'qa';
  }
  return 'production';
};
