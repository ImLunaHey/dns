import 'dotenv/config';
import dgram from 'dgram';
import { decode } from 'dns-packet';
import { Agent } from 'undici';
import { Axiom } from '@axiomhq/js';
import { checkRateLimit } from './rate-limiting';
import { blockedDomains } from './blocked-domains';
import { lookup } from 'fetch-dns-lookup';
import { setGlobalDispatcher } from 'undici';

setGlobalDispatcher(
  new Agent({
    connect: {
      lookup: (hostname, options, callback) => {
        return lookup(hostname, options, callback);
      },
    },
  }),
);

const axiom = new Axiom({
  token: process.env.AXIOM_TOKEN!,
});

const server = dgram.createSocket('udp4');
const resolver = dgram.createSocket('udp4');

// Increase the max listeners to prevent memory leaks
process.setMaxListeners(0);

const blockRequest = (
  dnsPacket: Buffer,
  rinfo: { address: string; port: number; family: string; size: number },
  server: dgram.Socket,
) => {
  // Create a response that returns localhost
  const response = Buffer.alloc(dnsPacket.length + 16);
  dnsPacket.copy(response);
  response.writeUInt16BE(0x8183, 2); // Flags: Standard query response, Name error
  response.writeUInt16BE(1, 6); // Number of Answer RRs
  response.writeUInt8(0xc0, dnsPacket.length); // Pointer to the domain name
  response.writeUInt8(0x0c, dnsPacket.length + 1); // Pointer to the domain name
  response.writeUInt16BE(1, dnsPacket.length + 2); // Type: A (1)
  response.writeUInt16BE(1, dnsPacket.length + 4); // Class: IN (1)
  response.writeUInt32BE(60, dnsPacket.length + 6); // TTL: 60 seconds
  response.writeUInt16BE(4, dnsPacket.length + 10); // RDLENGTH: 4 bytes
  response.writeUInt32BE(0x7f000001, dnsPacket.length + 12); // IP address:
  //

  server.send(response, 0, response.length, rinfo.port, rinfo.address);
};

server.on('message', (dnsPacket: Buffer, rinfo: { address: string; port: number; family: string; size: number }) => {
  // Rate limit check
  if (checkRateLimit(rinfo.address)) {
    console.warn(`Rate limit exceeded for ${rinfo.address}`);
    return;
  }

  const message = decode(dnsPacket);
  const domainName = message.questions?.[0].name;
  const type = message.questions?.[0].type.replace('UNKNOWN_', 'TYPE');

  axiom.ingest('dns', {
    ip: rinfo.address,
    message,
  });

  // Check if the DNS request is valid
  if (!domainName || !type || domainName.startsWith('https://')) {
    return;
  }

  console.info('Received message from %s for %s [%s]', rinfo.address, message.questions?.[0].name, type);

  // Check if the request is for a domain we want to block
  if (blockedDomains.has(domainName)) {
    console.info('Blocked domain %s', domainName);
    blockRequest(dnsPacket, rinfo, server);
    return;
  }

  // Forward the request to Cloudflare DNS
  // forwardRequest(dnsPacket, rinfo, domainName, type as RecordType, server);
  resolver.once('message', (response: Buffer) => {
    server.send(response, 0, response.length, rinfo.port, rinfo.address);
  });

  resolver.send(dnsPacket, 0, dnsPacket.length, 53, '8.8.8.8');
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Perform cleanup if necessary
  // Exit or restart the service if required
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Perform cleanup if necessary
  // Exit or restart the service if required
});

server.bind(53, () => {
  console.log('DNS server listening');
});

server.on('error', (err) => {
  console.error(err);
  server.close();
});
