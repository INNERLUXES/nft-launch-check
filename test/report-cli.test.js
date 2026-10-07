import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MAX_ROYALTY_BPS, RULES, USAGE, VERSION, buildReport, checkText, listChecksJson, listChecksMarkdown, listChecksText, parseArgs, toJson, toMarkdown, toSarif, toText } from '../src/index.js';
import { ALLOW, ARGS, BAD, GOOD, cli, phase, plan, run, text, withPhases } from './helpers.js';

const ch = (...codes) => String.fromCharCode(...codes);
// A plan with an error and a warning: the phases and the reserve above the max supply, and a freeze of never.
const MIXED = { 'plan.json': text(plan({ mint: { phases: [ALLOW, phase({ supplyCap: 700 })] }, metadata: { freeze: 'never' } })) };
const file = { file: 'mem.json', bytes: 1, lines: 1 };

test('exit codes: 0 for a pass, 1 for a finding at or above the fail-on level, 2 for a usage or input error', async () => {
  assert.equal((await run(GOOD, ARGS)).code, 0);
  assert.equal((await run(BAD, ARGS)).code, 1);
  assert.equal((await run(GOOD, ['nothing.json'])).code, 2);
  assert.equal((await run(GOOD, [])).code, 2);
  assert.equal((await run(GOOD, ['plan.json', 'other.json'])).code, 2);
  assert.equal((await run(GOOD, ['plan.json', '--bogus'])).code, 2);
  const none = await run({}, ['a.json']);
  assert.equal(none.code, 2);
  assert.match(none.err, /the input has a problem:\n {2}a\.json: does not exist\n/);
});

test('--fail-on and --min-severity: a warning fails the run at warning, and a hidden finding still counts for the result', async () => {
  const w = { 'w.json': text(plan({ metadata: { freeze: 'never' } })) };
  assert.equal((await run(w, ['w.json'])).code, 0);
  assert.equal((await run(w, ['w.json', '--fail-on', 'warning'])).code, 1);
  assert.equal((await run(w, ['w.json', '--fail-on', 'info'])).code, 1);
  const r = await run(MIXED, [...ARGS, '--min-severity', 'error']);
  assert.match(r.out, /findings: 1 \(1 error\); 1 below error not shown\n/);
  const hidden = await run(w, ['w.json', '--min-severity', 'error', '--fail-on', 'warning']);
  assert.match(hidden.out, /findings: 0; 1 below error not shown/);
  assert.equal(hidden.code, 1);
});

test('--max-royalty-bps: a whole number from 0 to 10000, given once, that moves the threshold of royalty-high', async () => {
  assert.equal(DEFAULT_MAX_ROYALTY_BPS, 1000);
  assert.equal(parseArgs(['p.json']).maxRoyaltyBps, null);
  assert.equal(parseArgs(['p.json', '--max-royalty-bps', '0']).maxRoyaltyBps, 0);
  assert.equal(parseArgs(['p.json', '--max-royalty-bps', '10000']).maxRoyaltyBps, 10000);
  for (const bad of ['10001', '-1', '7.5', '05', 'ten', '1e3']) assert.throws(() => parseArgs(['p.json', '--max-royalty-bps', bad]), /--max-royalty-bps: .* is not a whole number of basis points from 0 to 10000/, bad);
  assert.throws(() => parseArgs(['p.json', '--max-royalty-bps', '1', '--max-royalty-bps', '2']), /given twice/);
  const r = await run(GOOD, [...ARGS, '--max-royalty-bps', '250']);
  assert.equal(r.code, 0);
  assert.match(r.out, /WARNING {2}royalty-high/);
  assert.match(r.out, /above the threshold of 250 \(2\.5%\) of --max-royalty-bps/);
  assert.equal(JSON.parse((await run(GOOD, [...ARGS, '--json', '--max-royalty-bps', '250'])).out).config.maxRoyaltyBps, 250);
});

test('the text report names the file, the plan, the checks, each finding with its line and fix, the phases, and ends with the notice and the result', async () => {
  const r = await run(MIXED, ARGS);
  assert.match(r.out, /^nft-launch-check: plan\.json\n/);
  assert.match(r.out, /\nfile: plan\.json \(JSON, \d+ lines, [\d,]+ bytes\)\n/);
  assert.match(r.out, /\ncollection: Harbor Example Owls \(HXO\); ERC-721; max supply 1,000; reserve 50\n/);
  assert.match(r.out, /\nmint: 2 phases timed in minutes; supply caps add up to 1,000\n/);
  assert.match(r.out, /\nroyalty: 500 basis points \(5%\); to 0x9{40}\n/);
  assert.match(r.out, /\nreveal: delayed; placeholder set; provenance hash set\n/);
  assert.match(r.out, /\nmetadata: freeze never; ERC-4906 events planned\n/);
  assert.match(r.out, /\nadmin: owner 0xa{40}; multisig 0xa{40}, 2 of 3 signers\n/);
  assert.match(r.out, /\nwithdraw: 0xa{40}\n/);
  assert.match(r.out, /\nfindings: 2 \(1 error, 1 warning\)\n/);
  assert.match(r.out, /ERROR {4}supply-exceeded {17}plan\.json:\d+\n/);
  assert.match(r.out, /fix: Lower the caps of the phases or the reserve/);
  assert.match(r.out, /\nChecks \(24\)\n/);
  assert.ok(r.out.includes(['Phases (2)', '', '  phase      start  end  price     per wallet  cap  allow list  merkle root', '  allowlist  0      60   0.03 ETH  2           300  150         set', '  public     60     120  0.05 ETH  5           700  -           -'].join('\n')));
  assert.match(r.out, /will go as planned\.\n\nRESULT: FAIL - 1 finding at or above error \(1 error, 1 warning\)\n$/);
  const good = await run(GOOD, ARGS);
  assert.match(good.out, /Findings \(0\)\n\n {2}none\n/);
  const bare = await run({ 'p.json': text(plan({ royalty: undefined, admin: { multisig: undefined, owner: undefined }, collection: { reserve: undefined, symbol: undefined } })) }, ['p.json']);
  assert.match(bare.out, /\ncollection: Harbor Example Owls; ERC-721; max supply 1,000; reserve not given\n/);
  assert.match(bare.out, /\nroyalty: none set\n/);
  assert.match(bare.out, /\nadmin: owner not read; no multisig\n/);
  assert.match(bare.out, /\nnote: the plan sets no royalty, so the royalty checks did not run\n/);
});

test('--explain adds the points of the pages to text, markdown and JSON, and the tool\'s own choice to a best practice check', async () => {
  const set = { 'plan.json': text(plan({ royalty: { receiver: undefined }, metadata: { freeze: 'never' } })) };
  const r = await run(set, [...ARGS, '--explain']);
  assert.match(r.out, /basis: The royaltyInfo function of ERC-2981 answers a marketplace with two values for a sale.*\(ERC-2981: NFT Royalty Standard, https:\/\/eips\.ethereum\.org\/EIPS\/eip-2981\)/);
  assert.match(r.out, /the tool's own choice: asking for a freeze of the metadata is a best practice of this tool/);
  const md = (await run(set, [...ARGS, '--format', 'markdown', '--explain'])).out;
  assert.match(md, /## Basis\n\n### royalty-receiver-missing\n\n- The royaltyInfo function of ERC-2981/);
  const json = JSON.parse((await run(set, [...ARGS, '--json', '--explain'])).out);
  assert.equal(json.findings[0].basis[0].url, 'https://eips.ethereum.org/EIPS/eip-2981');
  const plain = JSON.parse((await run(set, [...ARGS, '--json'])).out);
  assert.equal(plain.findings[0].basis, undefined);
  assert.equal((await run(set, [...ARGS, '--format', 'sarif', '--explain'])).code, 2);
});

test('the JSON report: the tool, the input, the plan, totals by level, the rules, the findings, the phases and the result', async () => {
  const r = JSON.parse((await run(BAD, [...ARGS, '--json'])).out);
  assert.equal(r.tool, 'nft-launch-check');
  assert.equal(r.version, VERSION);
  assert.equal(r.input.file, 'plan.json');
  assert.equal(r.input.format, 'json');
  assert.deepEqual(r.plan.collection, { name: 'Harbor Example Owls', symbol: 'HXO', standard: 'ERC-721', maxSupply: 1000, reserve: 50 });
  assert.deepEqual(r.plan.mint, { timing: 'minutes', phases: 2, capped: 1000, uncapped: 0 });
  assert.deepEqual(r.plan.royalty, { bps: 500, percent: '5%', receiver: `0x${'9'.repeat(40)}` });
  assert.deepEqual(r.plan.reveal, { method: 'delayed', placeholder: true, provenanceHash: true });
  assert.equal(r.plan.admin.multisig.threshold, 2);
  assert.deepEqual(r.totals, { findings: 1, byLevel: { error: 1, warning: 0, info: 0 }, hidden: 0 });
  assert.equal(r.rules.length, RULES.length);
  assert.deepEqual(r.config, { minSeverity: 'info', failOn: 'error', maxRoyaltyBps: 1000 });
  const f = r.findings[0];
  assert.deepEqual(Object.keys(f), ['id', 'severity', 'message', 'file', 'line', 'column', 'at', 'subject', 'fix', 'kind']);
  assert.deepEqual([f.id, f.file, f.at.startsWith('plan.json:')], ['supply-exceeded', 'plan.json', true]);
  assert.deepEqual(r.phases[0], { name: 'allowlist', start: 0, end: 60, price: '0.03 ETH', perWallet: 2, cap: 300, allowList: 150, merkleRoot: 'set' });
  assert.deepEqual(r.result, { pass: false, failOn: 'error', text: 'FAIL - 1 finding at or above error (1 error)' });
  assert.ok(!JSON.stringify(r).includes('8'.repeat(64)), 'the merkle root is never shown');
});

test('the SARIF report: version 2.1.0, every check as a rule, the plan as the artifact and a result with its line and column', async () => {
  const s = JSON.parse((await run(MIXED, [...ARGS, '--format', 'sarif'])).out);
  assert.equal(s.version, '2.1.0');
  const runOf = s.runs[0];
  assert.equal(runOf.tool.driver.name, 'nft-launch-check');
  assert.equal(runOf.tool.driver.rules.length, RULES.length);
  assert.deepEqual(runOf.artifacts.map((a) => a.location.uri), ['plan.json']);
  assert.deepEqual(runOf.results.map((x) => [x.ruleId, x.level, x.locations[0].physicalLocation.artifactLocation.uri]), [['supply-exceeded', 'error', 'plan.json'], ['metadata-freeze-missing', 'warning', 'plan.json']]);
  assert.ok(runOf.results[0].locations[0].physicalLocation.region.startLine > 1);
  assert.equal(runOf.results[0].ruleIndex, RULES.findIndex((x) => x.id === 'supply-exceeded'));
  assert.equal(runOf.properties.sources.length, 3);
});

test('the markdown report escapes what markdown gives a meaning to, and every format replaces control and direction characters', async () => {
  const name = `Example [link](https://x.example) | ${ch(0x1b)}[31m red ${ch(0x202e)}rtl ${ch(7)}`;
  const set = { 'plan.json': text(plan({ collection: { name, symbol: `X${ch(0x2028)}O` }, mint: { phases: [ALLOW, phase({ name: `P|${ch(0x1b)}9`, perWalletLimit: undefined })] } })) };
  for (const format of ['text', 'markdown', 'json', 'sarif']) {
    const out = (await run(set, [...ARGS, '--format', format])).out;
    assert.ok(![...out].some((c) => [0x1b, 0x202e, 0x2028, 7].includes(c.charCodeAt(0))), format);
  }
  const md = (await run(set, [...ARGS, '--format', 'markdown'])).out;
  assert.match(md, /Phase P\\\| 9 is open to every wallet/);
  assert.doesNotMatch(md, /\]\(https/);
});

test('--list-checks in text, markdown and JSON, and no SARIF form', async () => {
  assert.match((await cli(['--list-checks'], process.cwd())).out, /^nft-launch-check checks\n\n {2}file-unreadable/);
  assert.equal(listChecksText().split('\n').filter((l) => /^ {2}[a-z]/.test(l)).length, RULES.length);
  assert.match(listChecksText(), /None of it is legal or financial advice\./);
  assert.match(listChecksMarkdown(), /\| royalty-receiver-missing \| error \| documented \|/);
  assert.equal(JSON.parse(listChecksJson()).length, RULES.length);
  assert.equal((await cli(['--list-checks', '--format', 'markdown'], process.cwd())).code, 0);
  assert.equal((await cli(['--list-checks', '--format', 'sarif'], process.cwd())).code, 2);
});

test('--help, --version and usage errors: the usage names every check and option, and a value that looks like an option is refused', async () => {
  const help = await cli(['--help'], process.cwd());
  assert.equal(help.code, 0);
  for (const r of RULES) assert.ok(help.out.includes(r.id), r.id);
  for (const o of ['--format', '--json', '--min-severity', '--fail-on', '--max-royalty-bps', '--explain', '--list-checks', '--help', '--version']) assert.ok(USAGE.includes(o), o);
  assert.match(USAGE, /is not legal or financial advice/);
  assert.equal((await cli(['--version'], process.cwd())).out, `${VERSION}\n`);
  assert.throws(() => parseArgs(['a', '--fail-on', '--json']), /--fail-on needs a value/);
  assert.throws(() => parseArgs(['a', '--fail-on', 'fatal']), /unknown level fatal/);
  assert.throws(() => parseArgs(['a', '--format', 'xml']), /unknown format xml/);
  assert.throws(() => parseArgs(['a', '--json', '--format', 'text']), /ask for two formats/);
  assert.throws(() => parseArgs(['-']), /standard input is not supported/);
  assert.throws(() => parseArgs(['a', '--format', '-']), /standard input is not supported/);
  assert.throws(() => parseArgs(['https://example.com/plan.json']), /never fetches a URL/);
  assert.throws(() => parseArgs(['a', '--fail-on', 'error', '--fail-on', 'warning']), /given twice/);
  assert.throws(() => parseArgs([]), /give the launch plan/);
  const err = await cli(['--bogus'], process.cwd());
  assert.match(err.err, /^nft-launch-check: unknown argument --bogus\n\nUsage:/);
});

test('buildReport and the formats can be used without the file system, and a plan that could not be read', () => {
  const report = buildReport({ file, checked: checkText(text(withPhases(ALLOW, phase()))), version: '0' });
  assert.match(toText(report), /^nft-launch-check: mem\.json/);
  assert.match(toMarkdown(report), /^# nft-launch-check: mem\.json/);
  assert.equal(JSON.parse(toJson(report)).input.file, 'mem.json');
  assert.equal(JSON.parse(toSarif(report)).runs[0].results.length, 0);
  const none = buildReport({ file, checked: checkText('['), version: '0' });
  assert.match(toText(none), /\nplan: not read\n/);
  assert.equal(none.plan, null);
  assert.equal(none.phases, null);
  assert.match(toMarkdown(none), /- Plan: not read/);
  const top = buildReport({ file, checked: checkText('[1]'), version: '0' });
  assert.equal(top.plan, null);
  const empty = buildReport({ file, checked: checkText(text(plan({ mint: { phases: 'x' } }))), version: '0' });
  assert.match(toText(empty), /\nmint: no phase was read\n/);
});
