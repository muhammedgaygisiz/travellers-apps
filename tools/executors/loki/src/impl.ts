import { ExecutorContext } from '@nrwl/devkit';
import { execSync } from 'child_process';
import { copyFileSync } from 'fs';

interface Schema {}

const executorFn = async (
  _options: Schema,
  _context: ExecutorContext
): Promise<{ success: boolean }> => {
  let command = ['loki'];

  const projectName = _context.projectName;
  const project = _context.workspace.projects[projectName!];

  const workspaceRoot = `${_context.root}`;
  const projectRoot = `${workspaceRoot}/${project.root}`;

  // Copy current package.json to projectRoot for Capacitor commands to work
  copyFileSync('package.json', `${projectRoot}/package.json`);

  // execute the command
  execSync(command.join(' ').trim(), {
    stdio: 'inherit',
    cwd: `${projectRoot}`,
  });

  return Promise.resolve({ success: true });
};

export default executorFn;
