import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { JSON_LIMITS, PLAN_LIMITS, checkText } from '../src/index.js';
import { ALLOW, ARGS, GOOD, addr, allowed, cli, phase, plan, run, text, withFiles, withPhases } from './helpers.js';

// Each test builds input meant to make the tool slow or to exhaust the stack or the memory, and checks that it ends with
// an answer in good time. The time allowed is four times as long under coverage (NODE_V8_COVERAGE is set only when
// coverage is on).

function timed(fn) {
  const start = process.hrtime.bigint();
  const value = fn();
  return { value, ms: Number(process.hrtime.bigint() - start) / 1e6 };
}

test('a hundred thousand phases: the first hundred are read, all open at once, every pair compared once, in good time', () => {
  const phases = Array.from({ length: 100000 }, (_, i) => phase({ name: `p${i}`, start: 0, end: 1000, supplyCap: 1 }));
  const { value, ms } = timed(() => checkText(text(plan({ collection: { maxSupply: 1000 }, mint: { phases } }))));
  assert.equal(value.read.mint.phases.length, PLAN_LIMITS.maxPhases);
  const n = PLAN_LIMITS.maxPhases;
  assert.equal(value.findings.filter((f) => f.id === 'phase-overlap').length, (n * (n - 1)) / 2);
  assert.ok(ms < allowed(15000), `took ${ms} ms`);
});

test('deep nesting ends with a file-unreadable finding at the limit, never a stack overflow, and the secret scan does not recurse', () => {
  const deep = `${'['.repeat(100000)}${']'.repeat(100000)}`;
  const { value } = timed(() => checkText(deep));
  assert.equal(value.findings[0].id, 'file-unreadable');
  assert.match(value.findings[0].message, new RegExp(`nested more than ${JSON_LIMITS.maxDepth} deep`));
  const nested = text(plan()).replace('"links": {', `"notes": ${'['.repeat(JSON_LIMITS.maxDepth - 2)}"x"${']'.repeat(JSON_LIMITS.maxDepth - 2)}, "links": {`);
  assert.deepEqual(checkText(nested).findings, []);
  const keyed = `{"privateKey": ${'{"a": '.repeat(JSON_LIMITS.maxDepth - 1)}1${'}'.repeat(JSON_LIMITS.maxDepth - 1)}}`;
  assert.equal(checkText(keyed).findings.filter((f) => f.id === 'secret-in-file').length, 1);
  const roots = `{"merkleRoot": ${'{"merkleRoot": '.repeat(JSON_LIMITS.maxDepth - 2)}"${'1'.repeat(64)}"${'}'.repeat(JSON_LIMITS.maxDepth - 1)}`;
  assert.deepEqual(checkText(roots).findings.filter((f) => f.id === 'secret-in-file'), [], 'the walk for hashes does not recurse either');
});

test('numbers with thousands of digits and huge exponents are refused, not worked out', () => {
  const huge = `1${'0'.repeat(5000)}`;
  const big = text(withPhases(ALLOW, phase({ price: huge }))).replace('"maxSupply": 1000', `"maxSupply": ${huge}`).replace('"bps": 500', `"bps": ${huge}`);
  const { value, ms } = timed(() => checkText(big));
  assert.ok(value.findings.some((f) => f.id === 'field-invalid' && /maxSupply/.test(f.message)));
  assert.ok(value.findings.some((f) => f.id === 'field-invalid' && /price of phase public/.test(f.message)));
  assert.ok(value.findings.some((f) => f.id === 'field-invalid' && /bps of the royalty/.test(f.message)));
  assert.ok(value.findings.every((f) => f.message.length < 700));
  assert.ok(ms < allowed(3000), `took ${ms} ms`);
  const exp = checkText(text(plan()).replace('"bps": 500', '"bps": 1e999999'));
  assert.ok(exp.findings.some((f) => f.id === 'field-invalid' && /bps/.test(f.message)));
  const start = checkText(text(withPhases(ALLOW, phase({ start: Number.MAX_SAFE_INTEGER }))));
  assert.ok(start.findings.some((f) => f.id === 'field-invalid' && /start of phase public/.test(f.message)));
});

test('long strings, long names and long fields are read in good time, and the messages stay short', () => {
  const long = plan({ collection: { name: 'n'.repeat(200000) } });
  const { value, ms } = timed(() => checkText(text(long)));
  assert.deepEqual(value.findings, []);
  assert.ok(ms < allowed(5000), `took ${ms} ms`);
  const wide = checkText(text(plan({ withdraw: { address: `0x${'1'.repeat(200000)}` }, links: { website: `https://${'w'.repeat(200000)}.example` } })));
  const f = wide.findings.find((x) => x.id === 'address-malformed');
  assert.ok(f.message.length < 600);
  assert.ok(wide.findings.every((x) => x.message.length < 900));
  const name = checkText(text(withPhases(ALLOW, phase({ name: 'p'.repeat(200000), perWalletLimit: undefined }))));
  assert.ok(name.findings.every((x) => x.message.length < 900 && (x.subject ?? '').length < 200));
});

test('names such as __proto__, constructor and toString are only names', () => {
  const t = text(plan()).replace('"collection": {', '"__proto__": {"polluted": 1}, "hasOwnProperty": 2, "collection": {').replace('"website":', '"__proto__": "https://p.example", "constructor": "x", "website":');
  const { value } = timed(() => checkText(t));
  assert.ok(value.findings.some((f) => f.id === 'field-unknown' && /"__proto__"/.test(f.message)));
  assert.ok(value.findings.some((f) => f.id === 'field-unknown' && /"hasOwnProperty"/.test(f.message)));
  assert.ok(value.findings.some((f) => f.id === 'link-invalid' && /link constructor/.test(f.message)));
  assert.equal({}.polluted, undefined);
  const cur = checkText(text(withPhases(ALLOW, phase({ currency: '__proto__', name: 'constructor' }))));
  assert.deepEqual(cur.findings, []);
  assert.ok(cur.notes.some((n) => n.includes('__PROTO__ is not one the tool knows')));
  const signers = checkText(text(plan({ admin: { multisig: { address: addr('a'), threshold: 2, signers: ['__proto__', 'toString', addr('c')] } } })));
  assert.equal(signers.findings.filter((f) => f.id === 'address-malformed').length, 2);
});

test('a run leaves the folder as it was: the tool writes nothing', async () => {
  await withFiles(GOOD, async (dir) => {
    const before = (await readdir(dir, { recursive: true })).sort();
    await cli([...ARGS, '--format', 'sarif'], dir);
    await cli([...ARGS, '--json', '--explain'], dir);
    assert.deepEqual((await readdir(dir, { recursive: true })).sort(), before);
  });
  assert.equal((await run(GOOD, ARGS)).code, 0);
});
