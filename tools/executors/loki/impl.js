'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.buildCommand = void 0;
const child_process_1 = require('child_process');
const fs_1 = require('fs');
const BUILD_STORYBOOK_TARGET = 'build-storybook';
const getProjectJsonContent = (_context) => {
  const projectName = _context.projectName;
  return _context.workspace.projects[projectName];
};
const getBuildStorybookOutput = (_context) => {
  const project = getProjectJsonContent(_context);
  const buildStorybookOutputDir =
    project.targets &&
    project.targets[BUILD_STORYBOOK_TARGET].options.outputDir;
  return `${_context.root}/${buildStorybookOutputDir}`;
};
const checkExists = (buildStorybookOutput) => {
  return (0, fs_1.existsSync)(buildStorybookOutput);
};
const buildCommand = (_context, _options) => {
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
exports.buildCommand = buildCommand;
const getProjectRoot = (_context) => {
  const project = getProjectJsonContent(_context);
  return `${_context.root}/${project.root}`;
};
const cleanUp = (projectRoot) => {
  (0, fs_1.rmSync)(`${projectRoot}/package.json`);
  (0, fs_1.rmSync)(`${projectRoot}/node_modules`, {
    recursive: true,
    force: true,
  });
};
const checkPrerequisites = (_context) => {
  const buildStorybookOutput = getBuildStorybookOutput(_context);
  const buildStorybookOutputExists = checkExists(buildStorybookOutput);
  if (!buildStorybookOutputExists) {
    console.log(
      `No build storybook found for project, please build storybook first (nx build-storybook ${_context.projectName})`
    );
    return false;
  }
  return true;
};
const executorFn = async (_options, _context) => {
  const prerequisitesFullfilled = checkPrerequisites(_context);
  if (!prerequisitesFullfilled) {
    return Promise.resolve({ success: false });
  }
  const projectRoot = getProjectRoot(_context);
  // Copy current package.json to projectRoot for loki commands to work
  (0, fs_1.copyFileSync)('package.json', `${projectRoot}/package.json`);
  const cmd = (0, exports.buildCommand)(_context, _options);
  try {
    (0, child_process_1.execSync)(cmd, {
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
exports.default = executorFn;
