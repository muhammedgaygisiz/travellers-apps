/**
 * Which backend this function runs in, so what it sends from a non-production
 * stage says so (issue 1221 follow-up). The client counterpart is
 * `resolveDeploymentStage` in `ta-firestore`.
 *
 * - `dev`: the local emulator (`FUNCTIONS_EMULATOR=true`).
 * - `qa`: deployed to `bite-tribe-qa`.
 * - `production`: everything else, including a project the runtime does not
 *   name, so an unknown runtime never brands a production mail as a test.
 */
export type DeploymentStage = 'dev' | 'qa' | 'production';

export const QA_FIREBASE_PROJECT_ID = 'bite-tribe-qa';

const projectIdOf = (
  env: Record<string, string | undefined>,
): string | undefined => {
  if (env['GCLOUD_PROJECT']) {
    return env['GCLOUD_PROJECT'];
  }
  try {
    return JSON.parse(env['FIREBASE_CONFIG'] ?? '{}').projectId;
  } catch {
    return undefined;
  }
};

export const resolveDeploymentStage = (
  env: Record<string, string | undefined> = process.env,
): DeploymentStage => {
  if (env['FUNCTIONS_EMULATOR'] === 'true') {
    return 'dev';
  }
  return projectIdOf(env) === QA_FIREBASE_PROJECT_ID ? 'qa' : 'production';
};

const STAGE_MARK: Record<
  Exclude<DeploymentStage, 'production'>,
  { label: string; colour: string }
> = {
  dev: { label: 'DEV', colour: '#6d28d9' },
  qa: { label: 'QA', colour: '#c2410c' },
};

/**
 * Marks a rendered mail with its stage: a `[QA]` or `[DEV]` subject prefix and
 * a coloured banner above the body. A production mail is returned unchanged.
 *
 * The banner is English on purpose. It names an environment for the people
 * testing it, not something a user reads.
 */
export const markEmailForStage = <T extends { subject: string; html: string }>(
  email: T,
  stage: DeploymentStage = resolveDeploymentStage(),
): T => {
  if (stage === 'production') {
    return email;
  }
  const { label, colour } = STAGE_MARK[stage];
  const banner =
    `<div style="background:${colour};color:#ffffff;padding:8px 12px;` +
    `font:600 13px/1.4 system-ui,sans-serif;text-align:center;letter-spacing:0.04em">` +
    `${label} environment - not a production BiteTribe mail</div>`;

  return {
    ...email,
    subject: `[${label}] ${email.subject}`,
    html: `${banner}${email.html}`,
  };
};
