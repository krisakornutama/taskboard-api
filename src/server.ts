import { bootstrap } from './app.js';
import { closeDatabase } from './db/index.js';

const { app, config, db } = bootstrap();

const server = app.listen(config.port, config.host, () => {
  console.log(`[server] TaskBoard API listening on http://${config.host}:${config.port}`);
  console.log(`[server] environment=${config.env} db=${config.dbPath}`);
  console.log(`[server] health check: http://localhost:${config.port}/health`);
});

function shutdown(signal: string): void {
  console.log(`\n[server] ${signal} received, shutting down...`);
  server.close(() => {
    closeDatabase(db);
    console.log('[server] shutdown complete');
    process.exit(0);
  });

  // Do not hang forever if a connection refuses to close.
  setTimeout(() => {
    console.error('[server] forced exit after 10s timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection:', reason);
  shutdown('unhandledRejection');
});