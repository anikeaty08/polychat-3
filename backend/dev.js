/* eslint-disable no-console */
const { spawn } = require('child_process');

function run(command, args, name) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exitCode = code;
    }
  });

  return child;
}

const nextCmd = process.platform === 'win32' ? 'node_modules\\.bin\\next.cmd' : 'node_modules/.bin/next';

run('node', ['backend/socket-server.js'], 'socket');
run(nextCmd, ['dev'], 'next');

