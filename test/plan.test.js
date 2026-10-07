import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_KEYS, ALLOWLIST_KEYS, COLLECTION_KEYS, FREEZE_PLANS, HASH_FORM, METADATA_KEYS, MINT_KEYS, MULTISIG_KEYS, PHASE_KEYS, PLAN_LIMITS, REVEAL_KEYS, REVEAL_METHODS, ROYALTY_KEYS, Reader, STANDARDS, TIMINGS, TOP_KEYS, WITHDRAW_KEYS, checkText, cut, describe, readAmount, readBps, readJson, readPlan, standardOf, suggestKey, where } from '../src/index.js';
import { ALLOW, addr, findingsOf, hash, idsOf, lineOf, phase, plan, text, withPhases } from './helpers.js';

const readOf = (p) => readPlan(readJson(text(p)));
const messages = (p) => findingsOf(p).map((f) => [f.id, f.message]);

test('readPlan: every part and field of a clean plan, with the line of each', () => {
  const p = plan();
  const r = readOf(p);
  assert.deepEqual(r.findings, []);
  const c = r.plan;
  assert.deepEqual([c.collection.name, c.collection.symbol, c.collection.standard, c.collection.chain, c.collection.maxSupply, c.collection.reserve], ['Harbor Example Owls', 'HXO', 'ERC-721', 'evm', 1000, 50]);
  assert.equal(c.mint.timing, 'minutes');
  assert.deepEqual(c.mint.phases.map((x) => [x.name, x.start, x.end, x.priceText, x.currency, x.perWallet, x.cap]), [['allowlist', 0, 60, '0.03', 'ETH', 2, 300], ['public', 60, 120, '0.05', 'ETH', 5, 600]]);
  assert.deepEqual(c.mint.phases[0].allowList.size, 150);
  assert.deepEqual(c.mint.phases[0].allowList.root, { zero: false });
  assert.equal(c.mint.phases[1].allowList, null);
  assert.deepEqual([c.royalty.bps.value, c.royalty.receiver], [500, addr('9')]);
  assert.deepEqual([c.reveal.method, c.reveal.provenance], ['delayed', { zero: false }]);
  assert.deepEqual([c.metadata.freeze, c.metadata.erc4906], ['after-reveal', true]);
  assert.deepEqual([c.admin.owner, c.admin.minter, c.admin.multisig.threshold, c.admin.multisig.signers.length], [addr('a'), addr('b'), 2, 3]);
  assert.equal(c.withdraw.address, addr('a'));
  assert.deepEqual(c.links.map((l) => l.key), ['website']);
  assert.equal(c.collection.maxSupplyEntry.line, lineOf(text(p), '"maxSupply"'));
  assert.equal(c.mint.phases[1].line, lineOf(text(p), '"name": "public"') - 1);
});

test('readPlan: a top level that is not an object, and a part that is not an object, are findings', () => {
  const r = readPlan(readJson('[1]'));
  assert.equal(r.plan, null);
  assert.deepEqual(r.findings.map((f) => f.id), ['file-unreadable']);
  assert.match(r.findings[0].message, /^The top level of the plan is a list, not an object with the collection/);
  const part = messages({ ...plan(), admin: 'owner' });
  assert.deepEqual(part.map((x) => x[0]), ['field-invalid']);
  assert.match(part[0][1], /^The admin of the plan is text; it must be an object with the owner, the minter and the multisig\./);
  assert.deepEqual(idsOf(plan({ mint: { phases: 'all' } })), ['field-invalid']);
  assert.deepEqual(idsOf(plan({ mint: { phases: [ALLOW, 7] } })), ['field-invalid']);
});

test('field-missing: each part and each field the checks need, with the part or the field named', () => {
  for (const key of ['collection', 'mint', 'reveal', 'metadata', 'admin', 'withdraw']) {
    const m = messages(plan({ [key]: undefined })).filter((x) => x[0] === 'field-missing').map((x) => x[1]);
    assert.deepEqual(m, [`The plan has no ${key}.`], key);
  }
  for (const key of ['name', 'standard', 'maxSupply']) assert.deepEqual(messages(plan({ collection: { [key]: undefined } })), [['field-missing', `The collection has no ${key}.`]], key);
  assert.deepEqual(messages(plan({ mint: { timing: undefined } })), [['field-missing', 'The mint has no timing; write minutes or blocks, the scale of the start and the end of each phase.']]);
  assert.deepEqual(messages(plan({ mint: { phases: undefined } })), [['field-missing', 'The mint has no phases.']]);
  assert.deepEqual(messages(plan({ mint: { phases: [] } })), [['field-missing', 'The mint holds no phase.']]);
  for (const key of ['start', 'end']) assert.deepEqual(messages(withPhases(ALLOW, phase({ [key]: undefined }))).filter((x) => x[0] === 'field-missing'), [['field-missing', `Phase public has no ${key}.`]], key);
  assert.deepEqual(messages(withPhases(ALLOW, phase({ price: undefined }))), [['field-missing', 'Phase public has no price; write 0 for a free phase.']]);
  assert.deepEqual(messages(withPhases(ALLOW, phase({ currency: undefined }))), [['field-missing', 'Phase public has no currency, such as ETH or SOL.']]);
  assert.deepEqual(idsOf(withPhases(ALLOW, phase({ price: '0', currency: undefined }))), [], 'a free phase needs no currency');
  assert.deepEqual(messages(withPhases(ALLOW, phase({ name: undefined }))), [['field-missing', 'Phase 2 of the mint has no name.']]);
  assert.deepEqual(messages(withPhases(phase({ ...ALLOW, allowList: { merkleRoot: hash() } }), phase())), [['field-missing', 'The allow list of phase allowlist has no size, the number of wallets on it.']]);
  assert.deepEqual(messages(plan({ reveal: { method: undefined } })), [['field-missing', 'The reveal has no method; write instant or delayed.']]);
  assert.deepEqual(messages(plan({ reveal: { placeholderUri: undefined } })), [['field-missing', 'The delayed reveal has no placeholderUri, the metadata every token shows until the reveal.']]);
  assert.deepEqual(messages(plan({ metadata: { freeze: undefined } })), [['field-missing', 'The metadata has no freeze; write at-mint, after-reveal or never.']]);
  assert.deepEqual(messages(plan({ admin: { owner: undefined } })), [['field-missing', 'The admin roles has no owner.']]);
  assert.deepEqual(messages(plan({ withdraw: { address: undefined } })), [['field-missing', 'The withdraw has no address.']]);
  assert.deepEqual(messages(plan({ royalty: { bps: undefined } })), [['field-missing', 'The royalty has no bps.']]);
  for (const key of ['address', 'threshold', 'signers']) assert.equal(messages(plan({ admin: { multisig: { address: addr('a'), threshold: 2, signers: [addr('c'), addr('d')], [key]: undefined } } })).filter((x) => x[0] === 'field-missing').length, 1, key);
  assert.deepEqual(messages(plan({ admin: { multisig: { address: addr('a'), threshold: 1, signers: [] } } })).filter((x) => x[0] === 'field-missing'), [['field-missing', 'The multisig lists no signer.']]);
  assert.deepEqual(idsOf(plan({ royalty: undefined, links: undefined, collection: { symbol: undefined, reserve: undefined }, admin: { minter: undefined } })), [], 'the optional parts and fields');
});

test('field-unknown: a misspelt key at every level, with the key it is probably meant to be', () => {
  const p = withPhases(phase({ ...ALLOW, perWalletLimt: 2 }), phase());
  const f = findingsOf(p).filter((x) => x.id === 'field-unknown');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(p), '"perWalletLimt"'));
  assert.match(f[0].message, /^The key "perWalletLimt" of phase 1 is not one the tool reads, so its value was left out of every check\. Did you mean "perWalletLimit"\? The keys of phase 1 are name, start, end/);
  assert.match(findingsOf({ ...plan(), Royality: {} }).find((x) => x.id === 'field-unknown').message, /"Royality" of the plan .*Did you mean "royalty"\?/);
  assert.match(findingsOf(plan({ collection: { max_supply: 9 } })).find((x) => x.id === 'field-unknown').message, /Did you mean "maxSupply"\?/);
  for (const [part, key] of [['reveal', 'provenance'], ['metadata', 'frozen'], ['admin', 'admins'], ['withdraw', 'wallet'], ['royalty', 'percent'], ['mint', 'schedule']]) {
    assert.ok(findingsOf(plan({ [part]: { [key]: 1 } })).some((x) => x.id === 'field-unknown' && x.message.includes(`"${key}"`)), `${part}.${key}`);
  }
  assert.equal(suggestKey('xy', ['xyz']), null, 'too short to guess');
});

test('field-invalid: whole numbers, choices, prices, hashes, the placeholder, the standard and flags of the wrong form', () => {
  const cases = [
    [plan({ collection: { maxSupply: 0 } }), /^The maxSupply of the collection is the number 0; it must be a whole number of tokens from 1 to 999999999999\.$/],
    [plan({ collection: { maxSupply: '1,000' } }), /is "1,000"; it must be a whole number/],
    [plan({ collection: { maxSupply: 1.5 } }), /is the number 1\.5/],
    [plan({ mint: { timing: 'hours' } }), /^The timing of the mint is "hours"; it must be one of minutes, blocks\.$/],
    [withPhases(ALLOW, phase({ start: -1 })), /^The start of phase public is the number -1/],
    [withPhases(ALLOW, phase({ price: '-0.1' })), /^The price of phase public is "-0\.1"; it must be a plain decimal number of 0 or more/],
    [withPhases(ALLOW, phase({ price: '1e-2' })), /^The price of phase public is "1e-2"/],
    [withPhases(ALLOW, phase({ price: true })), /^The price of phase public is true; it must be a decimal number/],
    [withPhases(phase({ ...ALLOW, allowList: { size: 150, merkleRoot: '0xabc' } }), phase()), /^The merkleRoot of the allow list of phase allowlist is not a hash of 32 bytes; it must be 64 hex digits, with or without 0x in front\.$/],
    [plan({ reveal: { method: 'later' } }), /^The method of the reveal is "later"; it must be one of instant, delayed\.$/],
    [plan({ reveal: { placeholderUri: 'hidden.json' } }), /^The placeholderUri of the reveal is "hidden\.json", which is not a URI the tool reads/],
    [plan({ reveal: { provenanceHash: 'abc' } }), /^The provenanceHash of the reveal is not a hash of 32 bytes/],
    [plan({ metadata: { freeze: 'soon' } }), /it must be one of at-mint, after-reveal, never\.$/],
    [plan({ metadata: { erc4906: 'yes' } }), /^The erc4906 of the metadata is "yes"; it must be true or false\.$/],
    [plan({ reveal: { method: 'delayed' }, metadata: { freeze: 'at-mint' } }), /^The metadata are frozen at-mint, but the reveal is delayed/],
    [plan({ admin: { owner: 42 } }), /^The owner of the admin roles is the number 42; it must be text\.$/],
    [plan({ admin: { multisig: { address: addr('a'), threshold: 2, signers: [addr('c'), 5] } } }), /^An item of the signers of the multisig is the number 5; it must be text\.$/],
    [plan({ admin: { multisig: { address: addr('a'), threshold: 2, signers: addr('c') } } }), /^The signers of the multisig is text; it must be a list of texts\.$/],
    [plan({ collection: { standard: 'ERC-20' } }), /^The standard of the collection is "ERC-20", which is not one the tool reads/]
  ];
  for (const [p, pattern] of cases) {
    const f = findingsOf(p).filter((x) => x.id === 'field-invalid');
    assert.equal(f.length, 1, String(pattern));
    assert.match(f[0].message, pattern);
  }
  for (const uri of ['ar://abc', 'https://harbor-owls.example/hidden.json', 'data:application/json;base64,e30=', 'IPFS://bafyexample']) assert.deepEqual(idsOf(plan({ reveal: { placeholderUri: uri } })), [], uri);
  assert.deepEqual(idsOf(plan({ collection: { maxSupply: '1000' } })), [], 'a whole number written as text');
});

test('the standards by their names, and the choices of the plan', () => {
  for (const [name, std] of [['ERC-721', 'ERC-721'], ['erc721', 'ERC-721'], ['EIP 1155', 'ERC-1155'], ['Solana', 'Solana'], ['Metaplex', 'Solana']]) assert.equal(standardOf(name).name, std, name);
  assert.equal(standardOf('ERC-404'), null);
  assert.deepEqual(STANDARDS.map((s) => s.chain), ['evm', 'evm', 'solana']);
  assert.deepEqual(TIMINGS, ['minutes', 'blocks']);
  assert.deepEqual(REVEAL_METHODS, ['instant', 'delayed']);
  assert.deepEqual(FREEZE_PLANS, ['at-mint', 'after-reveal', 'never']);
  assert.deepEqual(TOP_KEYS, ['collection', 'mint', 'royalty', 'reveal', 'metadata', 'admin', 'withdraw', 'links', 'notes']);
  for (const keys of [COLLECTION_KEYS, MINT_KEYS, PHASE_KEYS, ALLOWLIST_KEYS, ROYALTY_KEYS, REVEAL_KEYS, METADATA_KEYS, ADMIN_KEYS, MULTISIG_KEYS, WITHDRAW_KEYS]) assert.ok(keys.includes('notes'));
});

test('readAmount, readBps and the form of a hash: read from the characters, never through a floating point number', () => {
  assert.equal(readAmount('0.05').state, 'ok');
  assert.equal(readAmount('0').state, 'zero');
  assert.equal(readAmount('-1').state, 'negative');
  assert.equal(readAmount('1e3').state, 'nan');
  assert.deepEqual(readBps('500'), { state: 'ok', value: 500, text: '500' });
  assert.equal(readBps('500.00').value, 500);
  assert.equal(readBps('-0').state, 'ok');
  assert.equal(readBps('-5').state, 'negative');
  assert.equal(readBps('2.5').state, 'fraction');
  assert.equal(readBps('10001').state, 'above');
  assert.equal(readBps(`1${'0'.repeat(30)}`).state, 'above');
  assert.equal(readBps('5%').state, 'nan');
  assert.ok(HASH_FORM.test(hash('a')) && HASH_FORM.test('f'.repeat(64)));
  assert.ok(!HASH_FORM.test(`0x${'a'.repeat(63)}`) && !HASH_FORM.test(addr()));
});

test('the Reader and the helpers: lines of entries, cut texts and descriptions', () => {
  const reader = new Reader();
  reader.add('field-missing', { line: 3, column: 4 }, 'x');
  assert.deepEqual(reader.findings, [{ id: 'field-missing', file: 'plan', line: 3, column: 4, message: 'x', subject: null }]);
  assert.deepEqual(where({ line: 1, column: 2, key: 'k' }), { line: 1, column: 2 });
  assert.equal(cut('x'.repeat(200), 10), 'xxxxxxx...');
  assert.equal(describe({ kind: 'null' }), 'null');
  assert.equal(describe({ kind: 'string', secret: true }), 'a value that is not shown');
});

test('limits: more phases than the limit are left out with a note, and links past the limit too', () => {
  const many = Array.from({ length: PLAN_LIMITS.maxPhases + 5 }, (_, i) => phase({ name: `p${i}`, start: i * 10, end: i * 10 + 10, supplyCap: 1 }));
  const r = checkText(text(plan({ collection: { maxSupply: 1000 }, mint: { phases: many } })));
  assert.equal(r.read.mint.phases.length, PLAN_LIMITS.maxPhases);
  assert.ok(r.notes.includes(`the mint holds ${PLAN_LIMITS.maxPhases + 5} phases; the tool read the first ${PLAN_LIMITS.maxPhases} and left the rest out`));
  const links = Object.fromEntries(Array.from({ length: PLAN_LIMITS.maxLinks + 1 }, (_, i) => [`l${i}`, `https://l${i}.example`]));
  const l = checkText(text({ ...plan(), links }));
  assert.equal(l.read.links.length, PLAN_LIMITS.maxLinks);
  assert.ok(l.notes.some((n) => n.startsWith(`the plan holds ${PLAN_LIMITS.maxLinks + 1} links`)));
});
