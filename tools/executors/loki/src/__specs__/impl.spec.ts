import { buildCommand } from '../impl';
import { ExecutorContext } from '@nrwl/devkit';

describe('loki nx executor', () => {
  describe('given the project.json file of the prices app', () => {
    it('should execute the command with right parameters', () => {
      const expected =
        'loki ' +
        '--requireReferernce ' +
        '--reactUri file:/Users/muhammedgaygisiz/DEV/travellers-apps/dist/storybook/prices ' +
        '--reference=../../apps/prices/.loki/reference ' +
        '--difference=../../apps/prices/.loki/difference ' +
        '--output=../../apps/prices/.loki/current';

      const projectName = 'prices';
      const BUILD_STORYBOOK_TARGET = 'build-storybook';

      const result = buildCommand({
        root: '/Users/muhammedgaygisiz/DEV/travellers-apps',
        projectName,
        workspace: {
          projects: {
            [projectName]: {
              root: 'apps/prices',
              targets: {
                [BUILD_STORYBOOK_TARGET]: {
                  options: {
                    outputDir: 'dist/storybook/prices',
                  },
                },
              },
            },
          },
        },
      } as unknown as ExecutorContext);

      expect(result).toBe(expected);
    });
  });
});
