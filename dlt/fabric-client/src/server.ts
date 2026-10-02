import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createPrivateKey, timingSafeEqual } from 'node:crypto';
import * as grpc from '@grpc/grpc-js';
import { connect, hash, signers } from '@hyperledger/fabric-gateway';

const host = process.env.FABRIC_BRIDGE_HOST || '127.0.0.1';
const port = Number(process.env.FABRIC_BRIDGE_PORT || '8099');
const bridgeToken = process.env.FABRIC_BRIDGE_TOKEN || '';
const channelName = process.env.FABRIC_CHANNEL_NAME || 'aquatrust-channel';
const chaincodeName = process.env.FABRIC_CHAINCODE_NAME || 'aquatrust-records';

function equalToken(received: string): boolean {
  if (!bridgeToken) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(bridgeToken);
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (Buffer.concat(chunks).length > 1024 * 1024) throw new Error('Request body too large');
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function main(): Promise<void> {
  const required = ['FABRIC_MSP_ID', 'FABRIC_PEER_ENDPOINT', 'FABRIC_TLS_CERT_PATH', 'FABRIC_CERT_PATH', 'FABRIC_PRIVATE_KEY_PATH'];
  for (const name of required) if (!process.env[name]) throw new Error(`${name} is required in FABRIC mode`);
  if (!bridgeToken) throw new Error('FABRIC_BRIDGE_TOKEN is required; the bridge will not start without it');

  const privateKeyLocation = process.env.FABRIC_PRIVATE_KEY_PATH!;
  const keyLocation = (await stat(privateKeyLocation)).isDirectory()
    ? `${privateKeyLocation}/${(await readdir(privateKeyLocation)).filter((name) => name.endsWith('_sk') || name.endsWith('.pem')).sort()[0]}`
    : privateKeyLocation;
  const [tlsRoot, certificate, privateKey] = await Promise.all([
    readFile(process.env.FABRIC_TLS_CERT_PATH!),
    readFile(process.env.FABRIC_CERT_PATH!),
    readFile(keyLocation),
  ]);
  const grpcClient = new grpc.Client(
    process.env.FABRIC_PEER_ENDPOINT!,
    grpc.credentials.createSsl(tlsRoot),
    process.env.FABRIC_PEER_HOST_ALIAS ? { 'grpc.ssl_target_name_override': process.env.FABRIC_PEER_HOST_ALIAS } : undefined,
  );
  const gateway = connect({
    client: grpcClient,
    identity: { mspId: process.env.FABRIC_MSP_ID!, credentials: certificate },
    signer: signers.newPrivateKeySigner(createPrivateKey(privateKey)),
    hash: hash.sha256,
    evaluateOptions: () => ({ deadline: Date.now() + Number(process.env.FABRIC_EVALUATE_TIMEOUT_MS || 5000) }),
    endorseOptions: () => ({ deadline: Date.now() + Number(process.env.FABRIC_ENDORSE_TIMEOUT_MS || 15000) }),
    submitOptions: () => ({ deadline: Date.now() + Number(process.env.FABRIC_SUBMIT_TIMEOUT_MS || 15000) }),
    commitStatusOptions: () => ({ deadline: Date.now() + Number(process.env.FABRIC_COMMIT_TIMEOUT_MS || 60000) }),
  });
  const contract = gateway.getNetwork(channelName).getContract(chaincodeName);

  const server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      const healthToken = (req.headers.authorization || '').replace(/^Bearer /, '');
      if (!equalToken(healthToken)) {
        send(res, 401, { error: 'unauthorized' });
        return;
      }
      try {
        const state = await contract.evaluateTransaction('GetStatus');
        send(res, 200, { mode: 'FABRIC', online: true, ...JSON.parse(Buffer.from(state).toString('utf8')) });
      } catch (error) {
        send(res, 503, { mode: 'FABRIC', online: false, error: error instanceof Error ? error.message : 'Fabric is unavailable' });
      }
      return;
    }
    const authorization = req.headers.authorization || '';
    const receivedToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!equalToken(receivedToken)) {
      send(res, 401, { error: 'unauthorized' });
      return;
    }
    if (req.method !== 'POST' || (req.url !== '/invoke' && req.url !== '/query')) {
      send(res, 404, { error: 'not_found' });
      return;
    }
    try {
      const body = await readBody(req);
      if (!body || typeof body.function !== 'string' || !Array.isArray(body.args) || body.args.some((arg: unknown) => typeof arg !== 'string')) {
        send(res, 400, { error: 'function and string[] args are required' });
        return;
      }
      const args = body.args as string[];
      if (req.url === '/query') {
        const result = await contract.evaluateTransaction(body.function, ...args);
        send(res, 200, { result: result.length ? JSON.parse(Buffer.from(result).toString('utf8')) : null });
        return;
      }
      const proposal = contract.newProposal(body.function, { arguments: args });
      const transactionId = proposal.getTransactionId();
      const endorsed = await proposal.endorse();
      const result = endorsed.getResult();
      const committed = await endorsed.submit();
      const commitStatus = await committed.getStatus();
      if (!commitStatus.successful) throw new Error(`Fabric committed transaction with status code ${commitStatus.code}`);
      send(res, 200, {
        result: result.length ? JSON.parse(Buffer.from(result).toString('utf8')) : null,
        transactionId,
        commitStatus: 'VALID',
        blockNumber: Number(commitStatus.blockNumber),
      });
    } catch (error) {
      send(res, 502, { error: error instanceof Error ? error.message : 'Fabric transaction failed' });
    }
  });

  server.listen(port, host);
  const shutdown = () => {
    server.close();
    gateway.close();
    grpcClient.close();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
