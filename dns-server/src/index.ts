import 'dotenv/config';
import { server } from './server';

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.setMaxListeners(0);

server.bind(53, () => {
  console.log('DNS server listening');
});
