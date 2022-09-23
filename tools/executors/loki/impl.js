'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.buildCommand = void 0;
const child_process_1 = require('child_process');
const getProjectJsonContent = (_context) => {
  const projectName = _context.projectName;
  return _context.workspace.projects[projectName];
};
const buildCommand = (_context) => {
  const command = ['loki'];
  const project = getProjectJsonContent(_context);
  const root = _context.root;
  console.log('root', root);
  const workspaceRoot = `${root}`;
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
exports.buildCommand = buildCommand;
const getProjectRoot = (_context) => {
  const workspaceRoot = `${_context.root}`;
  const project = getProjectJsonContent(_context);
  const appRoot = project.root;
  return `${workspaceRoot}/${appRoot}`;
};
const executorFn = async (_options, _context) => {
  const projectRoot = getProjectRoot(_context);
  const cmd = (0, exports.buildCommand)(_context);
  (0, child_process_1.execSync)(cmd, {
    stdio: 'inherit',
    cwd: `${projectRoot}`,
  });
  return Promise.resolve({ success: true });
};
exports.default = executorFn;
