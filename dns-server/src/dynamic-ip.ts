import { addClientIp } from './allowed-ips';

const server = Bun.serve({
  port: 80,
  hostname: '0.0.0.0',
  fetch(request, server) {
    const ip = server.requestIP(request);
    if (!ip?.address)
      return new Response(null, {
        status: 500,
      });

    addClientIp(ip.address);
    return new Response(null, {
      status: 201,
    });
  },
});

console.info('Listening at http://localhost:%s', server.port);
