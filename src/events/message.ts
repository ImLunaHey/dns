import dgram from 'dgram';
import { Agent } from 'undici';
import { lookup } from 'fetch-dns-lookup';
import { setGlobalDispatcher } from 'undici';
import { decode } from 'dns-packet';
import { checkRateLimit } from '../rate-limiting';
import { Axiom } from '@axiomhq/js';
import { isClientIpAllowed } from '../allowed-ips';
import { blockRequest } from '../block-request';
import { server } from '../server';
import { turso } from '../turso';

// Cache DNS lookups for fetch requests
setGlobalDispatcher(
  new Agent({
    connect: {
      lookup: (hostname, options, callback) => {
        return lookup(hostname, options, callback);
      },
    },
  }),
);

const resolver = dgram.createSocket('udp4');

// const axiom = new Axiom({
//   token: process.env.AXIOM_TOKEN!,
// });

export const onMessage = async (
  dnsPacket: Buffer,
  rinfo: { address: string; port: number; family: string; size: number },
) => {
  // Rate limit check
  if (checkRateLimit(rinfo.address)) {
    console.warn(`Rate limit exceeded for ${rinfo.address}`);
    return;
  }

  const message = decode(dnsPacket);
  const domainName = message.questions?.[0].name;
  const type = message.questions?.[0].type.replace('UNKNOWN_', 'TYPE');

  // Check if the DNS request is valid
  if (!domainName || !type || domainName.startsWith('https://')) {
    return;
  }

  // Check if the client IP is allowed
  if (!(await isClientIpAllowed(rinfo.address))) {
    console.warn(`Client IP ${rinfo.address} is not allowed`);
    return;
  }

  // // Log the request to Axiom
  // axiom.ingest('dns', {
  //   ip: rinfo.address,
  //   status: blockedDomains.has(domainName) ? 'blocked' : 'allowed',
  //   message,
  // });

  console.info('Received message from %s for %s [%s]', rinfo.address, message.questions?.[0].name, type);

  // Check if the request is for a domain we want to block
  const isBlockedViaDB = await turso
    .execute({
      sql: 'SELECT EXISTS(SELECT 1 FROM blocked_domains WHERE hostname = ?)',
      args: [domainName],
    })
    .then((result) => Object.values(result.rows[0])[0] === 1)
    .catch((error) => {
      console.error('Failed to check if domain is blocked via DB', error);
      return false;
    });

  console.log({
    sql: 'SELECT EXISTS(SELECT 1 FROM blocked_domains WHERE hostname = ?)',
    args: [domainName],
  });

  // Check if the request is for a domain we want to block
  if (isBlockedViaDB) {
    console.info('Blocked domain %s', domainName);
    blockRequest(dnsPacket, rinfo, server);
    return;
  }

  // Forward the request to upstream DNS
  resolver.once('message', (response: Buffer) => {
    server.send(response, 0, response.length, rinfo.port, rinfo.address);
  });

  resolver.send(dnsPacket, 0, dnsPacket.length, 53, '8.8.8.8');
};
