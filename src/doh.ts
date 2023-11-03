const forwardRequest = (
  msg: Buffer,
  rinfo: { address: string; port: number; family: string; size: number },
  domainName: string,
  type: RecordType,
  server: Socket,
) => {
  const requestOptions = {
    hostname: 'cloudflare-dns.com',
    port: 443,
    path: `/dns-query?name=${domainName}&type=${type}`,
    method: 'GET',
    headers: {
      Accept: 'application/dns-json',
    },
  };

  const dohReq = https.request(requestOptions, (dohRes) => {
    let data = '';

    dohRes.on('data', (chunk) => {
      data += chunk;
    });

    dohRes.on('end', () => {
      const jsonData = JSON.parse(data) as {
        Status: number;
        TC: boolean;
        RD: boolean;
        RA: boolean;
        AD: boolean;
        CD: boolean;
        Question: { name: string; type: number }[];
        Answer: { name: string; type: number; TTL: number; data: string }[];
      };

      const ip = jsonData.Answer ? jsonData.Answer[0].data : null;

      if (ip) {
        // Assuming msg is the original DNS query as a Buffer
        // We'll construct a new DNS response based on this query
        const response = Buffer.alloc(msg.length + 16); // Allocating extra space for the answer section
        msg.copy(response); // Copy original message into response

        // Update header fields
        response.writeUInt16BE(0x8180, 2); // Flags: Standard query response, No error
        response.writeUInt16BE(1, 6); // Number of Answer RRs

        // We'll manually craft an answer section and append it to the DNS response.
        // We assume the original message ends at msg.length, so we start appending the answer there.

        // Pointer to the domain name (commonly occurs at the 12th byte in the query)
        response.writeUInt8(0xc0, msg.length);
        response.writeUInt8(0x0c, msg.length + 1);

        // Type: A (1)
        response.writeUInt16BE(1, msg.length + 2);

        // Class: IN (1)
        response.writeUInt16BE(1, msg.length + 4);

        // TTL: 60 seconds
        response.writeUInt32BE(60, msg.length + 6);

        // RDLENGTH: 4 bytes
        response.writeUInt16BE(4, msg.length + 10);

        // IP address, e.g., 192.0.2.1
        const ipParts = ip.split('.').map((part) => parseInt(part));
        response.writeUInt8(ipParts[0], msg.length + 12);
        response.writeUInt8(ipParts[1], msg.length + 13);
        response.writeUInt8(ipParts[2], msg.length + 14);
        response.writeUInt8(ipParts[3], msg.length + 15);

        // Now, `response` contains the full DNS response message
        server.send(response, 0, response.length, rinfo.port, rinfo.address);
      }
    });
  });

  dohReq.on('error', (error) => {
    console.error('Error in DoH request:', error);
  });

  dohReq.end();
};
