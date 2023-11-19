import dgram from 'dgram';
import { Agent } from 'undici';
import { lookup } from 'fetch-dns-lookup';
import { setGlobalDispatcher } from 'undici';
import { BufferAnswer, decode, encode } from 'dns-packet';
import { checkRateLimit } from './rate-limiting';
import { isClientIpAllowed } from './allowed-ips';
import { blockRequest } from './block-request';
import { server } from './server';
import { database } from './database';
import { CachedSet } from './cached-set';
import { TTLMap } from './ttl-map';
import { axiom } from './axiom';

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

const blockedDomains = new CachedSet<string>(1000);
const allowedDomains = new CachedSet<string>(1000);
const cachedQueries = new TTLMap<string, Buffer>();

const cache = process.env.CACHE === 'true';

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
  const hostname = message.questions?.[0].name;
  const type = message.questions?.[0].type.replace('UNKNOWN_', 'TYPE');

  // Check if the DNS request is valid
  if (!hostname || !type || hostname.startsWith('https://')) {
    return;
  }

  // Check if the client IP is allowed
  if (!(await isClientIpAllowed(rinfo.address))) {
    console.warn(`Client IP ${rinfo.address} is not allowed`);
    return;
  }

  // Log the request to Axiom
  axiom.ingest('dns', {
    ip: rinfo.address,
    status: blockedDomains.has(hostname) ? 'blocked' : 'allowed',
    message,
  });

  console.info('Received message from %s for %s [%s]', rinfo.address, message.questions?.[0].name, type);

  // Check if the request is for a domain we want to allow
  const isAllowed = allowedDomains.has(hostname);

  // Check if the request is for a domain we want to block
  const isBlocked =
    !isAllowed &&
    (blockedDomains.has(hostname) ||
      (await database
        .execute('SELECT 1 as blocked FROM blocked_domains WHERE hostname = ?', [hostname])
        .then((result) => {
          const row = result.rows[0] as { blocked: `${number}` } | undefined;
          const blocked = row?.blocked === '1';

          // Cache the block status
          if (blocked) blockedDomains.add(hostname);
          else allowedDomains.add(hostname);

          return blocked;
        })
        .catch((error) => {
          console.error('Failed to check if domain is blocked via DB', error);
          return false;
        })));

  // Check if the request is for a domain we want to block
  if (isBlocked) {
    console.info('Blocked domain %s', hostname);
    blockRequest(dnsPacket, rinfo, server);
    return;
  }

  const cacheKey = hostname + message.questions?.[0].type;
  if (cache) {
    // Check if the request is cached
    if (cachedQueries.has(cacheKey)) {
      console.info('Found cached query for %s', cacheKey);
      const response = cachedQueries.get(cacheKey)!;
      server.send(
        encode({
          ...decode(response.value),
          id: message.id,
          answers: (decode(response.value).answers ?? []).map((answer) => {
            return {
              ...answer,
              ttl: Math.floor((response.delete_at - Date.now()) / 1000),
            };
          }),
        }),
        0,
        response.value.length,
        rinfo.port,
        rinfo.address,
      );
      return;
    }
  }

  // Forward the request to upstream DNS
  resolver.once('message', (response: Buffer) => {
    // Cache the response
    const ttl = (decode(response).answers?.[0] as BufferAnswer)?.ttl ?? 60;
    if (cache) cachedQueries.add(cacheKey, response, ttl * 1000);
    server.send(response, 0, response.length, rinfo.port, rinfo.address);
  });

  resolver.send(dnsPacket, 0, dnsPacket.length, 53, '8.8.8.8');
};
