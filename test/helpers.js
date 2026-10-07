// Shared test helpers: launch plans built inline, checked in memory or written into a temporary folder that is removed
// after the test. Paths are built with resolve() from forward-slash names, so the same test runs on Linux, macOS and
// Windows. The line a test expects is found with lineOf(), which counts lines the way the reader does, so a test never
// holds a line number worked out by hand for one system only. No test reads the clock, the time zone or the locale.
// Every name is made up and every address and hash is one character written many times.

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { checkText, main } from '../src/index.js';

export async function withFiles(files, fn) {
  const dir = await mkdtemp(resolve(tmpdir(), 'nft-launch-check-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      await mkdir(dirname(resolve(dir, rel)), { recursive: true });
      await writeFile(resolve(dir, rel), content);
    }
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// The line (from 1) of the n-th place where needle starts in text.
export function lineOf(text, needle, n = 1) {
  let at = -1;
  for (let i = 0; i < n; i += 1) {
    at = text.indexOf(needle, at + 1);
    if (at < 0) throw new Error(`${needle} is not in the text ${n} times`);
  }
  return text.slice(0, at).split('\n').length;
}

// A made-up EVM address of one character, or of a short run of characters, written to 40 hex digits.
export const addr = (c = '1') => `0x${c.repeat(40 / c.length)}`;

// A made-up hash of 32 bytes: one hex digit written 64 times, with 0x in front.
export const hash = (c = '8') => `0x${c.repeat(64)}`;

// A made-up Solana address: one base58 character written 44 times.
export const sol = (c = 'A') => c.repeat(44);

const drop = (out) => {
  for (const [k, v] of Object.entries(out)) if (v === undefined) delete out[k];
  return out;
};

// A phase that passes every check: a public phase from minute 60 to 120 at 0.05 ETH, 5 for each wallet, capped at 600.
// over replaces fields, and a field set to undefined is left out.
export const phase = (over = {}) => drop({ name: 'public', start: 60, end: 120, price: '0.05', currency: 'ETH', perWalletLimit: 5, supplyCap: 600, ...over });

// An allow list phase that passes every check: from minute 0 to 60 at 0.03 ETH, 2 for each of 150 wallets, capped at 300.
export const ALLOW = phase({ name: 'allowlist', start: 0, end: 60, price: '0.03', perWalletLimit: 2, supplyCap: 300, allowList: { size: 150, merkleRoot: hash('8') } });

// A plan that passes every check: an ERC-721 collection of 1000 tokens with a reserve of 50, an allow list phase and a
// public phase that add up to 900, a royalty of 5% to a receiver, a delayed reveal with a provenance hash, a freeze
// after the reveal with the events of ERC-4906, an owner and a withdraw address that are the multisig, 2 of 3 signers,
// and an https link. over replaces fields of each part, and a field or a part set to undefined is left out.
export function plan(over = {}) {
  const parts = {
    collection: { name: 'Harbor Example Owls', symbol: 'HXO', standard: 'ERC-721', maxSupply: 1000, reserve: 50 },
    mint: { timing: 'minutes', phases: [ALLOW, phase()] },
    royalty: { bps: 500, receiver: addr('9') },
    reveal: { method: 'delayed', placeholderUri: 'ipfs://bafyexampleharborowls/hidden.json', provenanceHash: hash('4') },
    metadata: { freeze: 'after-reveal', erc4906: true },
    admin: { owner: addr('a'), minter: addr('b'), multisig: { address: addr('a'), threshold: 2, signers: [addr('c'), addr('d'), addr('e')] } },
    withdraw: { address: addr('a') },
    links: { website: 'https://harbor-owls.example' }
  };
  const out = {};
  for (const [k, v] of Object.entries(parts)) {
    if (Object.hasOwn(over, k) && over[k] === undefined) continue;
    out[k] = drop({ ...v, ...(over[k] ?? {}) });
  }
  for (const [k, v] of Object.entries(over)) if (!Object.hasOwn(parts, k) && v !== undefined) out[k] = v;
  return out;
}

// A plan with these phases.
export const withPhases = (...phases) => plan({ mint: { phases } });

export const text = (obj) => `${JSON.stringify(obj, null, 2)}\n`;

// The findings of a run in memory, for a plan object or a text.
export const findingsOf = (p = plan(), options = {}) => checkText(typeof p === 'string' ? p : text(p), options).findings;

// The ids of the findings of a run.
export const idsOf = (p, options) => findingsOf(p, options).map((f) => f.id);

// The findings of one check.
export const ofCheck = (p, id, options) => findingsOf(p, options).filter((f) => f.id === id);

// Runs the command line with exactly these arguments, in a folder.
export async function cli(argv, base) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// Writes the files and runs the command line in the folder.
export async function run(files, args) {
  return withFiles(files, (dir) => cli(args, dir));
}

// A clean plan, and one whose phases and reserve add up to more than the max supply, for the command line tests.
export const GOOD = { 'plan.json': text(plan()) };
export const BAD = { 'plan.json': text(withPhases(ALLOW, phase({ supplyCap: 700 }))) };
export const ARGS = ['plan.json'];

// The time a hostile test may take: four times as long when the runner collects coverage, which sets NODE_V8_COVERAGE.
export const allowed = (ms) => (process.env.NODE_V8_COVERAGE ? ms * 4 : ms);
