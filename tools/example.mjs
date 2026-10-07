// Runs the README examples, checks that they report what the README shows, and writes the reports of the two made-up
// launch plans to examples/output. CI runs it and then fails if those files changed, so the example output in the
// repository is always the real output.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');

// The arguments of the examples; every path is relative to the root of the repository.
export const BAD = ['examples/bad/plan.json'];
export const GOOD = ['examples/good/plan.json'];

// Runs the tool on files of the repository; the paths shown in the report are relative to the root of the repository.
export async function run(argv, base = root) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// What the README says of the bad plan: the counts, a finding of nearly every check, and the result.
export const EXPECTED = [
  'collection: Harbor Example Owls (HXO); ERC-721; max supply 5,000; reserve 300',
  'mint: 4 phases timed in minutes; supply caps add up to 5,300',
  'royalty: 1,250 basis points (12.5%); no receiver',
  'findings: 23 (12 error, 11 warning)',
  'The supply caps of the phases add up to 5,300 and the reserve to 300, 5,600 in all, 600 above the maxSupply of 5,000.',
  'The allow list of phase allowlist has no merkleRoot, so the contract cannot tell a listed wallet from any other.',
  'Phase holders starts at minute 4,320 and ends at minute 4,320, so it is open for no minute.',
  'The currency of phase holders is SOL, a currency of Solana, but the collection is ERC-721, on an EVM chain.',
  'Phase PUBLIC has no currency, such as ETH or SOL.',
  'The name PUBLIC is also the name of the phase at line 8',
  'The royalty is 1,250 basis points (12.5%) but names no receiver.',
  'The placeholderUri of the reveal is "placeholder.json", which is not a URI the tool reads',
  'The minter of the admin roles, "0x12345", has 5 characters after 0x, not 40',
  'The plan holds the key "seedPhrase", which names a seed, a mnemonic or a private key.',
  'The signer 0x6666666666666666666666666666666666666666 of the multisig is listed twice',
  'The withdraw address, "0x0000000000000000000000000000000000000000", is the zero address, which no one holds',
  'The key "perWalletLimt" of phase 1 is not one the tool reads',
  'The allow list of phase allowlist holds 1,500 wallets, but the phase is capped at 1,000',
  'Phase public is open to every wallet and free, with no perWalletLimit',
  'Phase public starts at minute 1,200, before phase allowlist ends at minute 1,440, so the two are open together for 240 minutes.',
  'The royalty is 1,250 basis points (12.5%), above the threshold of 1,000 (10%) of --max-royalty-bps.',
  'The reveal is delayed and gives no provenanceHash',
  'The metadata are never frozen (freeze is never)',
  'The metadata of this ERC-721 collection change after the mint (the reveal is delayed), but the plan does not say that the contract emits the events of ERC-4906 (erc4906 is false).',
  'The owner of the contract, 0x1111111111111111111111111111111111111111, is not the multisig of the plan',
  'The multisig needs only 1 signature of its 2 signers',
  'The link website, "http://harbor-owls.example", starts with http',
  'not legal or financial advice, not an audit of the contract and not a guarantee that the mint will go as planned',
  'RESULT: FAIL - 12 findings at or above error (12 error, 11 warning)'
];
// What must not be reported: the checks the bad plan does not hold, the seed, the hash of the allow list, and a pass.
export const UNWANTED = ['ERROR    file-unreadable', 'ERROR    royalty-invalid', 'ERROR    multisig-threshold-unreachable', 'lantern', '7777777777777777777777777777777777777777777777777777777777777777', 'RESULT: PASS'];

// What the README says of the good plan: no finding.
export const GOOD_EXPECTED = [
  'collection: Meadow Example Foxes (MEF); ERC-721; max supply 3,000; reserve 100',
  'mint: 2 phases timed in blocks; supply caps add up to 2,900',
  'royalty: 500 basis points (5%); to 0x9999999999999999999999999999999999999999',
  'reveal: delayed; placeholder set; provenance hash set',
  'metadata: freeze after-reveal; ERC-4906 events planned',
  'findings: 0',
  'RESULT: PASS - no finding at or above error'
];

const problems = [];
function expect(name, result, code, expected, unwanted, stream = 'out') {
  const text = result[stream];
  const missing = expected.filter((e) => !text.includes(e));
  const wrong = unwanted.filter((e) => text.includes(e));
  if (result.code !== code || missing.length || wrong.length) {
    problems.push(`${name}: unexpected report (exit code ${result.code}, expected ${code}; missing: ${missing.join(' / ') || 'none'}; should not appear: ${wrong.join(' / ') || 'none'})${result.err ? `\n${result.err}` : ''}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bad = await run(BAD);
  process.stdout.write(bad.out);
  expect('bad plan', bad, 1, EXPECTED, UNWANTED);

  const good = await run(GOOD);
  expect('good plan', good, 0, GOOD_EXPECTED, ['ERROR    ', 'WARNING  ', 'RESULT: FAIL', '8888888888888888888888888888888888888888888888888888888888888888', '4444444444444444444444444444444444444444444444444444444444444444']);
  // The good plan also passes when warnings and notes fail the run.
  expect('good, fail on warning', await run([...GOOD, '--fail-on', 'warning']), 0, ['RESULT: PASS - no finding at or above warning'], []);
  expect('good, fail on info', await run([...GOOD, '--fail-on', 'info']), 0, ['RESULT: PASS - no finding at or above info'], []);
  // A lower threshold of the royalty makes the good plan warn, and the warning fails the run at warning.
  expect('good, royalty threshold 400', await run([...GOOD, '--max-royalty-bps', '400', '--fail-on', 'warning']), 1, ['WARNING  royalty-high', 'above the threshold of 400 (4%)'], []);
  // The bad plan with only the errors shown still counts the rest.
  expect('bad, errors only', await run([...BAD, '--min-severity', 'error']), 1, ['findings: 12 (12 error); 11 below error not shown'], ['WARNING  ']);
  // A file that is not there stops the run with no report, and so does a threshold that is not a whole number.
  expect('missing file', await run(['examples/none/plan.json']), 2, ['examples/none/plan.json: does not exist'], [], 'err');
  expect('threshold not whole', await run([...GOOD, '--max-royalty-bps', '7.5']), 2, ['--max-royalty-bps: 7.5 is not a whole number of basis points from 0 to 10000'], [], 'err');

  // The README shows the head of the report of the bad plan with its table of checks, one finding, the table of phases and
  // the end of the report, and the end of the report of the good plan.
  const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
  const lines = bad.out.split('\n');
  const head = lines.slice(0, lines.findIndex((l) => l.startsWith('Findings ('))).join('\n');
  if (!readme.includes(head)) problems.push('README: the head of the sample output of the bad plan differs from a real run');
  const explained = (await run([...BAD, '--explain'])).out.split('\n');
  const at = explained.findIndex((l) => l.includes('metadata-update-event-missing') && l.includes('examples/bad/plan.json:'));
  const sample = explained.slice(at, at + 5).join('\n');
  if (at < 0 || !readme.includes(sample)) problems.push('README: the sample finding of the ERC-4906 check differs from a real run');
  const t = lines.findIndex((l) => l.startsWith('Phases ('));
  const table = lines.slice(t, t + 7).join('\n');
  if (t < 0 || !readme.includes(table)) problems.push('README: the table of phases of the bad plan differs from a real run');
  const tail = lines.slice(-4).join('\n');
  if (!readme.includes(tail)) problems.push('README: the tail of the sample output of the bad plan differs from a real run');
  const goodTail = good.out.split('\n').slice(-12).join('\n');
  if (!readme.includes(goodTail)) problems.push('README: the tail of the sample output of the good plan differs from a real run');

  await mkdir(resolve(root, 'examples/output'), { recursive: true });
  await writeFile(resolve(root, 'examples/output/bad.txt'), bad.out);
  await writeFile(resolve(root, 'examples/output/good.txt'), good.out);
  const outputs = [
    ['bad-explain.txt', [...BAD, '--explain'], 1],
    ['bad.md', [...BAD, '--format', 'markdown'], 1],
    ['bad-explain.md', [...BAD, '--format', 'markdown', '--explain'], 1],
    ['bad.json', [...BAD, '--json', '--explain'], 1],
    ['bad.sarif', [...BAD, '--format', 'sarif'], 1],
    ['good.md', [...GOOD, '--format', 'markdown'], 0],
    ['good.json', [...GOOD, '--json'], 0],
    ['good.sarif', [...GOOD, '--format', 'sarif'], 0],
    ['checks.txt', ['--list-checks'], 0],
    ['checks.json', ['--list-checks', '--format', 'json'], 0]
  ];
  for (const [name, args, code] of outputs) {
    const r = await run(args);
    if (r.code !== code) problems.push(`${name}: exit code ${r.code}, expected ${code}`);
    await writeFile(resolve(root, 'examples/output', name), r.out);
  }

  if (problems.length) {
    for (const p of problems) console.error(`example: ${p}`);
    process.exit(1);
  }
}
