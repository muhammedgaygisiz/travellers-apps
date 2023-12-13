import { ExecutorContext } from '@nrwl/devkit';
import { execSync } from 'child_process';
import { copyFileSync, existsSync, rmSync } from 'fs';
import { convertNxExecutor } from 'nx/src/executors/utils/convert-nx-executor';

const BUILD_STORYBOOK_TARGET = 'build-storybook';

interface Schema {
  reference: string;
  difference: string;
  output: string;
  update: boolean;
  chromeTolerance: number;
}

const getProjectJsonContent = (_context: ExecutorContext) => {
  const projectName = _context.projectName;
  return _context.workspace?.projects[projectName!];
};

const getBuildStorybookOutput = (_context: ExecutorContext) => {
  const project = getProjectJsonContent(_context);

  const buildStorybookOutputDir =
    project?.targets &&
    project?.targets[BUILD_STORYBOOK_TARGET].options.outputDir;
  return `${_context.root}/${buildStorybookOutputDir}`;
};

const checkExists = (buildStorybookOutput: string): boolean =>
  existsSync(buildStorybookOutput);

export const buildCommand = (_context: ExecutorContext, _options: Schema) => {
  const command = ['loki'];

  if (!_options.update) {
    command.push('--requireReference');
  }

  if (_options.update) {
    command.push('approve');
  }

  command.push('--reactUri');

  const buildStorybookOutput = getBuildStorybookOutput(_context);
  command.push(`file:${buildStorybookOutput}`);

  command.push(`--reference=../../${_options.reference}`);
  command.push(`--difference=../../${_options.difference}`);
  command.push(`--output=../../${_options.output}`);
  command.push(`--chromeTolerance=${_options.chromeTolerance}`);

  return command.join(' ').trim();
};

const getProjectRoot = (_context: ExecutorContext) => {
  const project = getProjectJsonContent(_context);
  return `${_context.root}/${project?.root}`;
};

const cleanUp = (projectRoot: string) => {
  rmSync(`${projectRoot}/package.json`);
  rmSync(`${projectRoot}/node_modules`, { recursive: true, force: true });
};

const checkPrerequisites = (_context: ExecutorContext): boolean => {
  const buildStorybookOutput = getBuildStorybookOutput(_context);
  const buildStorybookOutputExists = checkExists(buildStorybookOutput);
  if (!buildStorybookOutputExists) {
    console.log(
      `No built storybook found for project, please build storybook first (nx build-storybook ${_context.projectName})`
    );

    return false;
  }

  return true;
};

const executorFn = async (
  _options: Schema,
  _context: ExecutorContext
): Promise<{ success: boolean }> => {
  const prerequisitesFullfilled = checkPrerequisites(_context);

  if (!prerequisitesFullfilled) {
    return Promise.resolve({ success: false });
  }

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
    cleanUp(projectRoot);
    return Promise.resolve({ success: false });
  }

  cleanUp(projectRoot);
  return Promise.resolve({ success: true });
};

export default convertNxExecutor(executorFn);
