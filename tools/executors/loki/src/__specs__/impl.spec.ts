import {
  buildCommand,
  checkExists,
  checkPrerequisites,
  cleanUp,
  executorFn,
  getProjectRoot,
} from '../impl';
import { ExecutorContext } from '@nrwl/devkit';
import * as fs from 'fs';
import * as childProcess from 'child_process';

describe('loki nx executor', () => {
  describe('buildCommand', () => {
    describe('given the project.json file of the prices app', () => {
      it('should execute the command with right parameters', () => {
        const expected =
          'loki ' +
          '--requireReference ' +
          '--reactUri file:/Users/muhammedgaygisiz/DEV/travellers-apps/dist/storybook/prices ' +
          '--reference=../../apps/prices/.loki/reference ' +
          '--difference=../../apps/prices/.loki/difference ' +
          '--output=../../apps/prices/.loki/current ' +
          '--chromeTolerance=0';

        const projectName = 'prices';
        const BUILD_STORYBOOK_TARGET = 'build-storybook';

        const result = buildCommand(
          {
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
          } as unknown as ExecutorContext,
          {
            reference: 'apps/prices/.loki/reference',
            difference: 'apps/prices/.loki/difference',
            output: 'apps/prices/.loki/current',
            update: false,
            chromeTolerance: 0,
          }
        );

        expect(result).toBe(expected);
      });
    });
  });

  describe('checkExists', () => {
    const result = checkExists('buildStorybookOutput');

    expect(result).toEqual(false);
  });

  describe('getProjectRoot', () => {
    it('should return project root', () => {
      const result = getProjectRoot({
        root: 'context_root',
        cwd: 'cwd',
        isVerbose: false,
        projectName: 'projectName',
        workspace: {
          version: 1,
          projects: {
            projectName: {
              root: 'project_root',
            },
          },
        },
      } as unknown as ExecutorContext);

      expect(result).toEqual('context_root/project_root');
    });
  });

  describe('cleanUp', () => {
    const rmSyncSpy = jest.spyOn(fs, 'rmSync').mockImplementation(() => {});

    cleanUp('projectRoot');

    expect(rmSyncSpy).toHaveBeenCalledTimes(2);
    expect(rmSyncSpy).toHaveBeenCalledWith('projectRoot/package.json');
    expect(rmSyncSpy).toHaveBeenCalledWith('projectRoot/node_modules', {
      recursive: true,
      force: true,
    });
  });

  describe('checkPrerequisites', () => {
    describe('no build storybook artefacts', () => {
      it('should return false', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);

        const result = checkPrerequisites({
          cwd: 'cwd',
          isVerbose: false,
          root: 'root',
          projectName: 'projectName',
          workspace: {
            version: 1,
            projects: {
              projectName: {
                root: 'project_root',
                targets: {
                  'build-storybook': {
                    options: {
                      outputDir: 'outputDir',
                    },
                  },
                },
              },
            },
          },
        } as unknown as ExecutorContext);

        expect(result).toEqual(false);
      });
    });

    describe('given build storybook artefacts', () => {
      it('should return true', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);

        const result = checkPrerequisites({
          cwd: 'cwd',
          isVerbose: false,
          root: 'root',
          projectName: 'projectName',
          workspace: {
            version: 1,
            projects: {
              projectName: {
                root: 'project_root',
                targets: {
                  'build-storybook': {
                    options: {
                      outputDir: 'outputDir',
                    },
                  },
                },
              },
            },
          },
        } as unknown as ExecutorContext);

        expect(result).toEqual(true);
      });
    });
  });

  describe('executorFn', () => {
    describe('prerequisites not fulfilled', () => {
      it('should return success false', async () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);

        const result = await executorFn(
          {
            reference: '',
            difference: '',
            output: '',
            update: false,
            chromeTolerance: 0,
          },
          {
            root: 'root',
            cwd: 'cwd',
            isVerbose: false,
          } as unknown as ExecutorContext
        );

        expect(result).toEqual({ success: false });
      });
    });

    describe('with prerequisites fulfilled', () => {
      it('should return success true', async () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'copyFileSync').mockImplementation(() => {});
        jest.spyOn(fs, 'rmSync').mockImplementation(() => {});
        jest
          .spyOn(childProcess, 'execSync')
          .mockImplementation((() => {}) as any);

        const result = await executorFn(
          {
            reference: '',
            difference: '',
            output: '',
            update: false,
            chromeTolerance: 0,
          },
          {
            root: 'root',
            cwd: 'cwd',
            isVerbose: false,
            projectName: 'projectName',
            workspace: {
              version: 1,
              projects: {
                projectName: {
                  root: 'project_root',
                  targets: {
                    'build-storybook': {
                      options: {
                        outputDir: 'outputDir',
                      },
                    },
                  },
                },
              },
            },
          } as unknown as ExecutorContext
        );

        expect(result).toEqual({ success: true });
      });
    });
  });
});
