// PM2 process manager config for AXEL production (execuwell.jp / vitaai.jp).
//
// Why this exists: the web (:3000) and backend (:5000) were previously started
// as ad-hoc `nohup ... &` jobs tied to a shell/session. When that session
// ended they died — which is what produced the recurring 502 Bad Gateway the
// client saw. PM2 runs its own daemon (independent of any shell), restarts a
// process if it crashes, and keeps exactly ONE of each (instances: 1) so there
// is never a duplicate backend firing the 07:00 digest twice.
//
// Usage:
//   pm2 start ecosystem.config.js      # start/adopt both apps
//   pm2 restart axel-backend           # after editing backend source
//   pm2 restart axel-web               # after `npm run build`
//   pm2 save                           # persist the process list
//   pm2 logs axel-web / axel-backend   # tail logs
//
// Boot persistence (survives a machine reboot) needs ONE sudo command, run once:
//   sudo env PATH=$PATH pm2 startup systemd -u dev --hp /home/dev
//   pm2 save

const ROOT = '/home/dev/Documents/project_ex/AI_vita';

module.exports = {
  apps: [
    {
      name: 'axel-web',
      cwd: ROOT,
      // next start (production server serving the prebuilt .next output)
      script: `${ROOT}/node_modules/next/dist/bin/next`,
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      restart_delay: 2000,
      max_memory_restart: '1G',
      env: { NODE_ENV: 'production', PORT: '3000' },
    },
    {
      name: 'axel-backend',
      cwd: `${ROOT}/backend`,
      // tsx runs the TypeScript entrypoint directly (no watch — pm2 supervises
      // and restarts on crash; use `pm2 restart axel-backend` after edits).
      script: `${ROOT}/backend/src/index.ts`,
      interpreter: `${ROOT}/backend/node_modules/.bin/tsx`,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      restart_delay: 2000,
      max_memory_restart: '1G',
      env: { NODE_ENV: 'production' },
    },
  ],
};
