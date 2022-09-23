'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.buildCommand = void 0;
const child_process_1 = require('child_process');
const fs_1 = require('fs');
const getProjectJsonContent = (_context) => {
  const projectName = _context.projectName;
  return _context.workspace.projects[projectName];
};
const buildCommand = (_context, _options) => {
  const command = ['loki'];
  const project = getProjectJsonContent(_context);
  const workspaceRoot = `${_context.root}`;
  const appRoot = project.root;
  command.push('--requireReference');
  command.push('--reactUri');
  const BUILD_STORYBOOK_TARGET = 'build-storybook';
  const buildStorybookOutput =
    project.targets &&
    project.targets[BUILD_STORYBOOK_TARGET].options.outputDir;
  const storybookBuild = `${workspaceRoot}/${buildStorybookOutput}`;
  command.push(`file:${storybookBuild}`);
  command.push(`--reference=../../${_options.reference}`);
  command.push(`--difference=../../${_options.difference}`);
  command.push(`--output=../../${_options.output}`);
  // execute the command
  return command.join(' ').trim();
};
exports.buildCommand = buildCommand;
const getProjectRoot = (_context) => {
  const workspaceRoot = `${_context.root}`;
  const project = getProjectJsonContent(_context);
  const appRoot = project.root;
  return `${workspaceRoot}/${appRoot}`;
};
function cleanUp(projectRoot) {
  (0, fs_1.rmSync)(`${projectRoot}/package.json`);
  (0, fs_1.rmSync)(`${projectRoot}/node_modules`, {
    recursive: true,
    force: true,
  });
}
const executorFn = async (_options, _context) => {
  const projectRoot = getProjectRoot(_context);
  // Copy current package.json to projectRoot for Capacitor commands to work
  (0, fs_1.copyFileSync)('package.json', `${projectRoot}/package.json`);
  const cmd = (0, exports.buildCommand)(_context, _options);
  (0, child_process_1.execSync)(cmd, {
    stdio: 'inherit',
    cwd: `${projectRoot}`,
  });
  cleanUp(projectRoot);
  return Promise.resolve({ success: true });
};
exports.default = executorFn;
