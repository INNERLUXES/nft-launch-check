// Command line: nft-launch-check <plan.json> [options]

import { readFileSync } from 'node:fs';
import { DEFAULT_MAX_ROYALTY_BPS, InputError, LIMITS, checkFile } from './check.js';
import { LEVELS } from './data.js';
import { listChecksJson, listChecksMarkdown, listChecksText, toJson, toMarkdown, toSarif, toText } from './report.js';
import { RULES } from './rules.js';
import { safeText } from './text.js';

export const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const FORMATS = { text: toText, markdown: toMarkdown, json: toJson, sarif: toSarif };
const LISTS = { text: listChecksText, markdown: listChecksMarkdown, json: listChecksJson };

export const USAGE = `Usage: nft-launch-check <plan.json> [options]

Reads the launch plan of an NFT collection before the mint goes live (JSON: the collection with its name, standard,
max supply and reserve, the mint phases with their start and end in minutes or blocks, price, currency, per-wallet
limit, supply cap and allow list, the royalty in basis points and its receiver, the reveal, the metadata freeze, the
admin roles with the multisig, the withdraw address and the links) and lists the mistakes of the plan: phase caps and
reserve above the max supply, phases that overlap or are empty, an allow list with no merkle root or more wallets than
its phase holds, a public phase with no per-wallet limit, a royalty that is not 0 to 10000 basis points, above a
threshold or with no receiver, a delayed reveal with no provenance hash, an ERC-721 whose metadata change with no
ERC-4906 events, metadata never frozen, an owner or withdraw address that is one key, a multisig threshold of 1 or above
its signers, malformed or zero addresses, a currency of another chain, and links that are not https. A private key or
a seed in the plan is an error whose value is never shown. It reads the file and is not legal or financial advice: it
contacts no chain, fetches nothing, runs nothing, reads no clock and writes nothing to disk.

Options:
  --format <name>            text, markdown, json or sarif (default: text)
  --json                     the same as --format json
  --min-severity <level>     the lowest level of a finding that is shown: ${LEVELS.join(', ')} (default: info)
  --fail-on <level>          the lowest level of a finding that fails the run: ${LEVELS.join(', ')} (default: error)
  --max-royalty-bps <n>      the royalty above which royalty-high warns, 0 to 10000 basis points (default: ${DEFAULT_MAX_ROYALTY_BPS})
  --explain                  show the points of the pages behind each finding (text, markdown and JSON)
  --list-checks              list the checks with their level and kind, and exit
  --help                     show this text
  --version                  show the version

Checks: ${RULES.map((r) => r.id).join(', ')}.

Exit codes: 0 no finding at or above the fail-on level, 1 a finding at or above it, 2 usage or input error.
`;

const isUrl = (f) => /^[a-z][a-z0-9+.-]*:\/\//i.test(f);

export function parseArgs(argv) {
  const o = { paths: [], format: null, json: false, minSeverity: null, failOn: null, maxRoyaltyBps: null, explain: false, listChecks: false, help: false, version: false };
  const once = (name, current, value) => {
    if (current !== null) throw new Error(`${name} was given twice`);
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined || (v.startsWith('--') && v.length > 2)) throw new Error(`${a} needs a value`);
      if (v === '-') throw new Error('reading from standard input is not supported; give a file');
      i += 1;
      return v;
    };
    if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--version' || a === '-v') o.version = true;
    else if (a === '--explain') o.explain = true;
    else if (a === '--json') o.json = true;
    else if (a === '--list-checks') o.listChecks = true;
    else if (a === '--format') o.format = once(a, o.format, next());
    else if (a === '--min-severity') o.minSeverity = once(a, o.minSeverity, next());
    else if (a === '--fail-on') o.failOn = once(a, o.failOn, next());
    else if (a === '--max-royalty-bps') o.maxRoyaltyBps = once(a, o.maxRoyaltyBps, next());
    else if (a === '-') throw new Error('reading from standard input is not supported; give a file');
    else if (a.startsWith('-')) throw new Error(`unknown argument ${a}`);
    else {
      if (o.paths.length === 1) throw new Error('give one launch plan');
      o.paths.push(a);
    }
  }
  if (o.json) {
    if (o.format !== null && o.format !== 'json') throw new Error(`--json and --format ${o.format} ask for two formats; give one`);
    o.format = 'json';
  }
  if (o.format === null) o.format = 'text';
  if (!Object.hasOwn(FORMATS, o.format)) throw new Error(`unknown format ${o.format} (text, markdown, json or sarif)`);
  for (const [flag, v] of [['--min-severity', o.minSeverity], ['--fail-on', o.failOn]]) if (v !== null && !LEVELS.includes(v)) throw new Error(`${flag}: unknown level ${v} (${LEVELS.join(', ')})`);
  if (o.maxRoyaltyBps !== null) {
    if (!/^(?:0|[1-9][0-9]{0,4})$/.test(o.maxRoyaltyBps) || Number(o.maxRoyaltyBps) > 10000) throw new Error(`--max-royalty-bps: ${o.maxRoyaltyBps} is not a whole number of basis points from 0 to 10000`);
    o.maxRoyaltyBps = Number(o.maxRoyaltyBps);
  }
  if (o.listChecks && o.format === 'sarif') throw new Error('--list-checks has no SARIF form; use text, markdown or json');
  if (!o.help && !o.version && !o.listChecks) {
    if (o.paths.length !== 1) throw new Error('give the launch plan, such as nft-launch-check plan.json');
    if (isUrl(o.paths[0])) throw new Error('give a local path; the tool never fetches a URL');
    if (o.explain && o.format === 'sarif') throw new Error('--explain adds the points of the pages to the text, markdown and JSON reports; the sarif format has no place for them');
  }
  return o;
}

const clean = (text) => safeText(text, 1500);

// Exit code: 0 no finding at or above the fail-on level, 1 a finding at or above it, 2 usage or input error.
export async function main(argv, io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }, limits = undefined, base = process.cwd()) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (error) {
    io.err(`nft-launch-check: ${clean(error.message)}\n\n${USAGE}`);
    return 2;
  }
  if (o.help) {
    io.out(USAGE);
    return 0;
  }
  if (o.version) {
    io.out(`${VERSION}\n`);
    return 0;
  }
  if (o.listChecks) {
    io.out(LISTS[o.format]());
    return 0;
  }
  let report;
  try {
    report = await checkFile({ path: o.paths[0], minSeverity: o.minSeverity ?? 'info', failOn: o.failOn ?? 'error', maxRoyaltyBps: o.maxRoyaltyBps ?? DEFAULT_MAX_ROYALTY_BPS, version: VERSION, limits: { ...LIMITS, ...(limits ?? {}) }, base });
  } catch (error) {
    if (error instanceof InputError) io.err(`nft-launch-check: no result, the input has ${error.problems.length === 1 ? 'a problem' : 'problems'}:\n${error.problems.map((p) => `  ${clean(p)}`).join('\n')}\n`);
    else io.err(`nft-launch-check: ${clean(error.message)}\n`);
    return 2;
  }
  io.out(FORMATS[o.format](report, { explain: o.explain }));
  return report.result.pass ? 0 : 1;
}
