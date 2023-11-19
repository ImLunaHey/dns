import dgram from 'dgram';
import { onMessage } from './message-event';

export const server = dgram.createSocket('udp4');

server.on('message', onMessage);

server.on('error', (err) => {
  console.error(err);
  server.close();
});
