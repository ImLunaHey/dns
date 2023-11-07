import { readFileSync, writeFileSync } from 'fs';

let changed = false;
const allowedIps = new Set<string>(JSON.parse(readFileSync('allowed-ips.json', 'utf-8')) as string[]);

setInterval(() => {
  if (!changed) return;

  changed = false;
  writeFileSync('allowed-ips.json', JSON.stringify(Array.from(allowedIps)));
}, 30_000);

const server = Bun.serve({
  port: 80,
  hostname: '0.0.0.0',
  fetch(request, server) {
    const ip = server.requestIP(request);
    if (!ip?.address)
      return new Response(null, {
        status: 500,
      });

    changed = true;
    allowedIps.add(ip?.address);
    console.info('Added %s to allowed ips', ip?.address);
    return new Response(null, {
      status: 201,
    });
  },
});

console.info('Listening at http://localhost:%s', server.port);
