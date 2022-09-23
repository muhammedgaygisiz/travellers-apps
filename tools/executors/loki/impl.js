'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const child_process_1 = require('child_process');
const getProjectJsonContent = (_context) => {
  const projectName = _context.projectName;
  return _context.workspace.projects[projectName];
};
const executorFn = async (_options, _context) => {
  const command = ['loki'];
  const project = getProjectJsonContent(_context);
  const workspaceRoot = `${_context.root}`;
  const appRoot = project.root;
  const projectRoot = `${workspaceRoot}/${appRoot}`;
  // Copy current package.json to projectRoot for Capacitor commands to work
  // copyFileSync('package.json', `${projectRoot}/package.json`);
  command.push('--requireReferernce');
  command.push('--reactUri');
  const BUILD_STORYBOOK_TARGET = 'build-storybook';
  const buildStorybookOutput =
    project.targets &&
    project.targets[BUILD_STORYBOOK_TARGET].options.outputDir;
  const storybookBuild = `${workspaceRoot}/${buildStorybookOutput}`;
  command.push(`file:${storybookBuild}`);
  console.log('#mo', appRoot);
  command.push(`--reference=../../${appRoot}/.loki/reference`);
  command.push(`--difference=../../${appRoot}/.loki/difference`);
  command.push(`--output=../../${appRoot}/.loki/current`);
  // execute the command
  const cmd = command.join(' ').trim();
  console.log(cmd);
  (0, child_process_1.execSync)(cmd, {
    stdio: 'inherit',
    cwd: `${projectRoot}`,
  });
  return Promise.resolve({ success: true });
};
exports.default = executorFn;
