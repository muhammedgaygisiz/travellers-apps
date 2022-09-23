import { ExecutorContext } from '@nrwl/devkit';
import { execSync } from 'child_process';

interface Schema {}

const getProjectJsonContent = (_context: ExecutorContext) => {
  const projectName = _context.projectName;
  return _context.workspace.projects[projectName!];
};

export const buildCommand = (_context: ExecutorContext) => {
  const command = ['loki'];

  const project = getProjectJsonContent(_context);
  const workspaceRoot = `${_context.root}`;
  const appRoot = project.root;

  command.push('--requireReferernce');
  command.push('--reactUri');

  const BUILD_STORYBOOK_TARGET = 'build-storybook';
  const buildStorybookOutput =
    project.targets &&
    project.targets[BUILD_STORYBOOK_TARGET].options.outputDir;
  const storybookBuild = `${workspaceRoot}/${buildStorybookOutput}`;
  command.push(`file:${storybookBuild}`);

  command.push(`--reference=../../${appRoot}/.loki/reference`);
  command.push(`--difference=../../${appRoot}/.loki/difference`);
  command.push(`--output=../../${appRoot}/.loki/current`);

  // execute the command
  const cmd = command.join(' ').trim();
  return cmd;
};

const getProjectRoot = (_context: ExecutorContext) => {
  const workspaceRoot = `${_context.root}`;
  const project = getProjectJsonContent(_context);
  const appRoot = project.root;
  return `${workspaceRoot}/${appRoot}`;
};

const executorFn = async (
  _options: Schema,
  _context: ExecutorContext
): Promise<{ success: boolean }> => {
  const projectRoot = getProjectRoot(_context);
  const cmd = buildCommand(_context);

  execSync(cmd, {
    stdio: 'inherit',
    cwd: `${projectRoot}`,
  });

  return Promise.resolve({ success: true });
};

export default executorFn;
