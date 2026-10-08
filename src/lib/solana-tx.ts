// Minimal Solana transaction builder.
//
// The official @solana/web3.js bundle cannot be built for this project's edge
// server runtime, so native SOL and SPL token transfers are assembled by hand
// with the same lightweight libraries the wallet already uses (tweetnacl, bs58).

const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export interface SolanaRpc {
  url: string;
  call<T>(method: string, params: unknown[]): Promise<T>;
}

export function solanaRpc(url: string): SolanaRpc {
  return {
    url,
    async call<T>(method: string, params: unknown[]) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const json = (await res.json()) as { result?: T; error?: { message?: string } };
      if (json.error) throw new Error(json.error.message ?? "rpc error");
      return json.result as T;
    },
  };
}

function compactU16(n: number): number[] {
  const out: number[] = [];
  let value = n;
  for (;;) {
    let byte = value & 0x7f;
    value >>= 7;
    if (value === 0) {
      out.push(byte);
      break;
    }
    byte |= 0x80;
    out.push(byte);
  }
  return out;
}

function u64le(value: bigint): number[] {
  const out: number[] = [];
  let v = value;
  for (let i = 0; i < 8; i++) {
    out.push(Number(v & 0xffn));
    v >>= 8n;
  }
  return out;
}

function u32le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");
}

async function libs() {
  const [bs58Module, naclModule] = await Promise.all([import("bs58"), import("tweetnacl")]);
  const bs58 = (bs58Module as any).default ?? bs58Module;
  const nacl = (naclModule as any).default ?? naclModule;
  return { bs58, nacl };
}

interface Instruction {
  programId: string;
  /** [account address, isSigner, isWritable] */
  keys: Array<{ pubkey: string; signer: boolean; writable: boolean }>;
  data: number[];
}

/**
 * Build, sign and send a legacy transaction with a single signer.
 * Returns the transaction signature.
 */
async function sendInstructions(
  rpc: SolanaRpc,
  feePayer: string,
  secretKey: Uint8Array,
  instructions: Instruction[],
): Promise<string> {
  const { bs58, nacl } = await libs();

  // Account ordering: fee payer first, then writable signers, writables, read-onlys.
  const meta = new Map<string, { signer: boolean; writable: boolean }>();
  meta.set(feePayer, { signer: true, writable: true });
  for (const ix of instructions) {
    for (const k of ix.keys) {
      const prev = meta.get(k.pubkey);
      meta.set(k.pubkey, {
        signer: (prev?.signer ?? false) || k.signer,
        writable: (prev?.writable ?? false) || k.writable,
      });
    }
    if (!meta.has(ix.programId)) meta.set(ix.programId, { signer: false, writable: false });
  }

  const all = [...meta.entries()].filter(([k]) => k !== feePayer);
  const writableSigners = all.filter(([, m]) => m.signer && m.writable).map(([k]) => k);
  const readonlySigners = all.filter(([, m]) => m.signer && !m.writable).map(([k]) => k);
  const writable = all.filter(([, m]) => !m.signer && m.writable).map(([k]) => k);
  const readonly = all.filter(([, m]) => !m.signer && !m.writable).map(([k]) => k);
  const accountKeys = [feePayer, ...writableSigners, ...readonlySigners, ...writable, ...readonly];
  const index = (key: string) => accountKeys.indexOf(key);

  const { blockhash } = await rpc.call<{ value: { blockhash: string } }>("getLatestBlockhash", [
    { commitment: "finalized" },
  ]).then((r: any) => r.value ?? r);

  const message: number[] = [
    1 + writableSigners.length + readonlySigners.length, // required signatures
    readonlySigners.length,
    readonly.length,
    ...compactU16(accountKeys.length),
  ];
  for (const key of accountKeys) message.push(...(bs58.decode(key) as Uint8Array));
  message.push(...(bs58.decode(blockhash) as Uint8Array));
  message.push(...compactU16(instructions.length));
  for (const ix of instructions) {
    message.push(index(ix.programId));
    message.push(...compactU16(ix.keys.length));
    for (const k of ix.keys) message.push(index(k.pubkey));
    message.push(...compactU16(ix.data.length));
    message.push(...ix.data);
  }

  const messageBytes = Uint8Array.from(message);
  const signature = nacl.sign.detached(messageBytes, secretKey) as Uint8Array;
  const tx = Uint8Array.from([...compactU16(1), ...signature, ...messageBytes]);

  return rpc.call<string>("sendTransaction", [
    toBase64(tx),
    { encoding: "base64", skipPreflight: false, maxRetries: 3 },
  ]);
}

/** Transfer lamports from the wallet to a destination address. */
export async function sendSol(
  rpc: SolanaRpc,
  from: string,
  secretKey: Uint8Array,
  to: string,
  lamports: number,
) {
  return sendInstructions(rpc, from, secretKey, [
    {
      programId: SYSTEM_PROGRAM,
      keys: [
        { pubkey: from, signer: true, writable: true },
        { pubkey: to, signer: false, writable: true },
      ],
      data: [...u32le(2), ...u64le(BigInt(lamports))],
    },
  ]);
}

/** Transfer SPL tokens between two existing token accounts. */
export async function sendSplToken(
  rpc: SolanaRpc,
  owner: string,
  secretKey: Uint8Array,
  sourceTokenAccount: string,
  destinationTokenAccount: string,
  amount: bigint,
) {
  return sendInstructions(rpc, owner, secretKey, [
    {
      programId: TOKEN_PROGRAM,
      keys: [
        { pubkey: sourceTokenAccount, signer: false, writable: true },
        { pubkey: destinationTokenAccount, signer: false, writable: true },
        { pubkey: owner, signer: true, writable: false },
      ],
      data: [3, ...u64le(amount)],
    },
  ]);
}

export interface ParsedTokenAccount {
  pubkey: string;
  mint: string;
  amount: string;
  decimals: number;
}

/** Every SPL token account owned by an address, with parsed balances. */
export async function getTokenAccounts(rpc: SolanaRpc, owner: string): Promise<ParsedTokenAccount[]> {
  const res = await rpc.call<any>("getTokenAccountsByOwner", [
    owner,
    { programId: TOKEN_PROGRAM },
    { encoding: "jsonParsed" },
  ]);
  return (res?.value ?? []).map((v: any) => ({
    pubkey: String(v.pubkey),
    mint: String(v.account?.data?.parsed?.info?.mint ?? ""),
    amount: String(v.account?.data?.parsed?.info?.tokenAmount?.amount ?? "0"),
    decimals: Number(v.account?.data?.parsed?.info?.tokenAmount?.decimals ?? 0),
  }));
}

/** The destination's existing token account for a mint, if it has one. */
export async function findTokenAccountForMint(rpc: SolanaRpc, owner: string, mint: string) {
  const res = await rpc.call<any>("getTokenAccountsByOwner", [
    owner,
    { mint },
    { encoding: "jsonParsed" },
  ]);
  const first = (res?.value ?? [])[0];
  return first ? String(first.pubkey) : null;
}

export async function getSolBalance(rpc: SolanaRpc, address: string) {
  const res = await rpc.call<any>("getBalance", [address]);
  return Number(res?.value ?? 0);
}

/** Ed25519 keypair for the wallet's Solana account, derived from the mnemonic. */
export async function solanaKeypairFromMnemonic(mnemonic: string) {
  const [bip39, ed25519, { bs58, nacl }] = await Promise.all([
    import("bip39"),
    import("ed25519-hd-key"),
    libs(),
  ]);
  const seedHex = Buffer.from(bip39.mnemonicToSeedSync(mnemonic)).toString("hex");
  const { key } = ed25519.derivePath("m/44'/501'/0'/0'", seedHex);
  const pair = nacl.sign.keyPair.fromSeed(new Uint8Array(key));
  return {
    address: bs58.encode(pair.publicKey) as string,
    secretKey: pair.secretKey as Uint8Array,
  };
}

export const LAMPORTS_PER_SOL = 1_000_000_000;
