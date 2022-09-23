import { ExecutorContext, ProjectConfiguration } from '@nrwl/devkit';
import { copyFileSync } from 'fs';
import { execSync } from 'child_process';

interface Schema {}

const getProjectJsonContent = (_context: ExecutorContext) => {
  const projectName = _context.projectName;
  return _context.workspace.projects[projectName!];
};

const executorFn = async (
  _options: Schema,
  _context: ExecutorContext
): Promise<{ success: boolean }> => {
  const command = ['loki'];

  const project = getProjectJsonContent(_context);

  const workspaceRoot = `${_context.root}`;
  const appRoot = project.root;
  const projectRoot = `${workspaceRoot}/${appRoot}`;

  // Copy current package.json to projectRoot for Capacitor commands to work
  copyFileSync('package.json', `${projectRoot}/package.json`);

  command.push('--requireReferernce');
  command.push('--reactUri');

  const BUILD_STORYBOOK_TARGET = 'build-storybook';
  const buildStorybookOutput =
    project.targets[BUILD_STORYBOOK_TARGET].options.outputDir;
  const storybookBuild = `${workspaceRoot}/${buildStorybookOutput}`;
  command.push(`file:${storybookBuild}`);

  command.push(`--reference=${appRoot}/.loki/reference`);
  command.push(`--difference=${appRoot}/.loki/difference`);
  command.push(`--output=${appRoot}/.loki/current`);

  // execute the command
  execSync(command.join(' ').trim(), {
    stdio: 'inherit',
    cwd: `${projectRoot}`,
  });

  return Promise.resolve({ success: true });
};

export default executorFn;
