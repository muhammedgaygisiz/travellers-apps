'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.buildCommand = void 0;
const child_process_1 = require('child_process');
const fs_1 = require('fs');
const getProjectJsonContent = (_context) => {
  const projectName = _context.projectName;
  return _context.workspace.projects[projectName];
};
const buildCommand = (_context) => {
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
exports.buildCommand = buildCommand;
const getProjectRoot = (_context) => {
  const workspaceRoot = `${_context.root}`;
  const project = getProjectJsonContent(_context);
  const appRoot = project.root;
  return `${workspaceRoot}/${appRoot}`;
};
const executorFn = async (_options, _context) => {
  const projectRoot = getProjectRoot(_context);
  // Copy current package.json to projectRoot for Capacitor commands to work
  (0, fs_1.copyFileSync)('package.json', `${projectRoot}/package.json`);
  const cmd = (0, exports.buildCommand)(_context);
  (0, child_process_1.execSync)(cmd, {
    stdio: 'inherit',
    cwd: `${projectRoot}`,
  });
  (0, fs_1.rmSync)(`${projectRoot}/package.json`);
  (0, fs_1.rmSync)(`${projectRoot}/node_modules`, {
    recursive: true,
    force: true,
  });
  return Promise.resolve({ success: true });
};
exports.default = executorFn;
