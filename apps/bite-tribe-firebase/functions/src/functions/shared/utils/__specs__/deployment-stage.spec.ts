import {
  markEmailForStage,
  QA_FIREBASE_PROJECT_ID,
  resolveDeploymentStage,
} from '../deployment-stage';

describe('resolveDeploymentStage', () => {
  it('is dev in the emulator, whatever project it names', () => {
    expect(
      resolveDeploymentStage({
        FUNCTIONS_EMULATOR: 'true',
        GCLOUD_PROJECT: 'bite-tribe',
      }),
    ).toBe('dev');
  });

  it('is qa when deployed to the QA project', () => {
    expect(
      resolveDeploymentStage({ GCLOUD_PROJECT: QA_FIREBASE_PROJECT_ID }),
    ).toBe('qa');
  });

  it('reads the project from FIREBASE_CONFIG when GCLOUD_PROJECT is absent', () => {
    expect(
      resolveDeploymentStage({
        FIREBASE_CONFIG: JSON.stringify({ projectId: QA_FIREBASE_PROJECT_ID }),
      }),
    ).toBe('qa');
  });

  it('is production for the production project', () => {
    expect(resolveDeploymentStage({ GCLOUD_PROJECT: 'bite-tribe' })).toBe(
      'production',
    );
  });

  it('is production when the runtime names no project', () => {
    expect(resolveDeploymentStage({ FIREBASE_CONFIG: 'not json' })).toBe(
      'production',
    );
  });
});

describe('markEmailForStage', () => {
  const email = { to: 'a@example.com', subject: 'Hello', html: '<p>Body</p>' };

  it('leaves a production mail untouched', () => {
    expect(markEmailForStage(email, 'production')).toBe(email);
  });

  it.each([
    ['qa', '[QA] Hello', 'QA environment'],
    ['dev', '[DEV] Hello', 'DEV environment'],
  ] as const)(
    'prefixes the subject and adds a banner in %s',
    (stage, subject, banner) => {
      const marked = markEmailForStage(email, stage);

      expect(marked.subject).toBe(subject);
      expect(marked.html).toContain(banner);
      expect(marked.html.endsWith('<p>Body</p>')).toBe(true);
      expect(marked.to).toBe(email.to);
    },
  );
});
