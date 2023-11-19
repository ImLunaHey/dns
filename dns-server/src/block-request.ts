import type dgram from 'dgram';

export const blockRequest = (
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
  response.writeUInt32BE(0x7f000001, dnsPacket.length + 12);

  // Send the response
  server.send(response, 0, response.length, rinfo.port, rinfo.address);
};
