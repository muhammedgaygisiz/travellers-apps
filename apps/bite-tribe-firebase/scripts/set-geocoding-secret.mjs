import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SECRET_NAME = 'GOOGLE_GEOCODING_API_KEY';

const readHiddenLine = (prompt) =>
  new Promise((resolve, reject) => {
    const { stdin, stdout } = process;

    if (!stdin.isTTY) {
      let value = '';
      stdin.setEncoding('utf8');
      stdin.on('data', (chunk) => {
        value += chunk;
      });
      stdin.on('end', () => resolve(value.trim()));
      stdin.on('error', reject);
      return;
    }

    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off('data', onData);
    };

    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') {
          cleanup();
          stdout.write('\n');
          reject(new Error('Cancelled.'));
          return;
        }

        if (character === '\r' || character === '\n') {
          cleanup();
          stdout.write('\n');
          resolve(value);
          return;
        }

        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          stdout.write('\b \b');
          continue;
        }

        value += character;
        stdout.write('*');
      }
    };

    stdin.on('data', onData);
  });

const run = async () => {
  const secretValue = await readHiddenLine(`Enter ${SECRET_NAME}: `);

  if (!secretValue.trim()) {
    throw new Error(`${SECRET_NAME} must not be empty.`);
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'bite-tribe-geocoding-secret-'));
  const tempFile = join(tempDir, SECRET_NAME);

  try {
    await writeFile(tempFile, secretValue, { mode: 0o600 });

    const firebase = spawn(
      'firebase',
      ['functions:secrets:set', SECRET_NAME, '--data-file', tempFile],
      {
        stdio: 'inherit',
      },
    );

    const exitCode = await new Promise((resolve, reject) => {
      firebase.on('error', reject);
      firebase.on('close', resolve);
    });

    if (exitCode !== 0) {
      throw new Error(`firebase exited with code ${exitCode}.`);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
