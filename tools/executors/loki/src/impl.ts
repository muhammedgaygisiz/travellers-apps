import { ExecutorContext } from '@nrwl/devkit';
import { execSync } from 'child_process';
import { copyFileSync, rmSync } from 'fs';

const BUILD_STORYBOOK_TARGET = 'build-storybook';

interface Schema {
  reference: string;
  difference: string;
  output: string;
}

const getProjectJsonContent = (_context: ExecutorContext) => {
  const projectName = _context.projectName;
  return _context.workspace.projects[projectName!];
};

const getBuildStorybookOutput = (_context: ExecutorContext) => {
  const project = getProjectJsonContent(_context);

  const buildStorybookOutputDir =
    project.targets &&
    project.targets[BUILD_STORYBOOK_TARGET].options.outputDir;
  return `${_context.root}/${buildStorybookOutputDir}`;
};

export const buildCommand = (_context: ExecutorContext, _options: Schema) => {
  const command = ['loki'];

  command.push('--requireReference');
  command.push('--reactUri');

  const buildStorybookOutput = getBuildStorybookOutput(_context);
  command.push(`file:${buildStorybookOutput}`);

  command.push(`--reference=../../${_options.reference}`);
  command.push(`--difference=../../${_options.difference}`);
  command.push(`--output=../../${_options.output}`);

  return command.join(' ').trim();
};

const getProjectRoot = (_context: ExecutorContext) => {
  const project = getProjectJsonContent(_context);
  return `${_context.root}/${project.root}`;
};

const cleanUp = (projectRoot: string) => {
  rmSync(`${projectRoot}/package.json`);
  rmSync(`${projectRoot}/node_modules`, { recursive: true, force: true });
};

const executorFn = async (
  _options: Schema,
  _context: ExecutorContext
): Promise<{ success: boolean }> => {
  const projectRoot = getProjectRoot(_context);

  // Copy current package.json to projectRoot for loki commands to work
  copyFileSync('package.json', `${projectRoot}/package.json`);

  const cmd = buildCommand(_context, _options);

  try {
    execSync(cmd, {
      stdio: 'inherit',
      cwd: `${projectRoot}`,
    });
  } catch (e) {
    console.error('An error occured', e);
  } finally {
    cleanUp(projectRoot);
  }

  return Promise.resolve({ success: true });
};

export default executorFn;
