import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BEST, RULES, analyze, atOrAbove, bpsPercent, checkText, decide, linkProblem, overlaps, priceText, ruleById } from '../src/index.js';
import { ALLOW, addr, findingsOf, hash, idsOf, lineOf, ofCheck, phase, plan, sol, text, withPhases } from './helpers.js';

const ids = (findings) => findings.map((f) => f.id);

test('the rules: unique ids, a level and a kind each, a fix, and the best practice checks say so', () => {
  assert.equal(new Set(RULES.map((r) => r.id)).size, RULES.length);
  assert.equal(RULES.length, 24);
  for (const r of RULES) {
    assert.ok(['error', 'warning', 'info'].includes(r.severity), r.id);
    assert.ok(['documented', 'best practice', 'input'].includes(r.kind), r.id);
    assert.ok(r.fix.length > 20 && r.summary.length > 20, r.id);
    if (r.kind === 'best practice') assert.ok(r.own.includes(BEST), r.id);
  }
  assert.deepEqual(RULES.filter((r) => r.kind === 'documented').map((r) => r.id), ['royalty-receiver-missing', 'metadata-update-event-missing']);
  assert.equal(ruleById('supply-exceeded').severity, 'error');
  assert.equal(ruleById('nope'), undefined);
});

test('decide and atOrAbove: the result of a run from the counts by level', () => {
  assert.ok(atOrAbove('error', 'warning'));
  assert.ok(!atOrAbove('info', 'warning'));
  assert.deepEqual(decide({ error: 0, warning: 2, info: 0 }, 'error'), { pass: true, failOn: 'error', text: 'PASS - no finding at or above error (2 warning)' });
  assert.equal(decide({ error: 1, warning: 2, info: 0 }, 'warning').text, 'FAIL - 3 findings at or above warning (1 error, 2 warning)');
  assert.equal(decide({}, 'info').text, 'PASS - no finding at or above info');
});

test('a clean plan has no finding, and analyze of no plan has none either', () => {
  assert.deepEqual(findingsOf(plan()), []);
  assert.deepEqual(analyze(null), { findings: [], notes: [], summary: null });
});

test('supply-exceeded: the caps and the reserve above the max supply at its line, the reserve alone at its own; equal passes', () => {
  const p = withPhases(ALLOW, phase({ supplyCap: 700 }));
  const f = ofCheck(p, 'supply-exceeded');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(p), '"maxSupply"'));
  assert.match(f[0].message, /^The supply caps of the phases add up to 1,000 and the reserve to 50, 1,050 in all, 50 above the maxSupply of 1,000\. This is a best practice of this tool/);
  assert.deepEqual(ofCheck(withPhases(ALLOW, phase({ supplyCap: 650 })), 'supply-exceeded'), [], 'exactly the max supply passes');
  const reserve = plan({ collection: { reserve: 1001 } });
  const r = ofCheck(reserve, 'supply-exceeded');
  assert.equal(r.length, 1);
  assert.equal(r[0].line, lineOf(text(reserve), '"reserve"'));
  assert.match(r[0].message, /^The reserve of the collection is 1,001 tokens, above its maxSupply of 1,000\./);
  assert.deepEqual(ofCheck(plan({ collection: { reserve: undefined } }), 'supply-exceeded'), [], 'no reserve counts as 0');
});

test('supply-exceeded: a phase with no cap is left out of the sum, and a note says so', () => {
  const r = checkText(text(withPhases(ALLOW, phase({ supplyCap: undefined }))));
  assert.deepEqual(r.findings, []);
  assert.ok(r.notes.includes('phase public gives no supplyCap, so supply-exceeded added up only the caps that are given'));
  const two = checkText(text(withPhases(phase({ name: 'a', supplyCap: undefined }), phase({ name: 'b', start: 120, end: 180, supplyCap: undefined }))));
  assert.ok(two.notes.includes('the phases a and b give no supplyCap, so supply-exceeded added up only the caps that are given'));
});

test('phase-empty: an end at or before the start, at the line of the end; one minute passes', () => {
  const p = withPhases(ALLOW, phase({ start: 120, end: 120 }));
  const f = ofCheck(p, 'phase-empty');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(p), '"end": 120'));
  assert.match(f[0].message, /^Phase public starts at minute 120 and ends at minute 120, so it is open for no minute\. This is/);
  assert.match(ofCheck(withPhases(ALLOW, phase({ start: 120, end: 90 })), 'phase-empty')[0].message, /ends at minute 90, so it is open for no minute: it ends before it starts\./);
  assert.match(ofCheck(plan({ mint: { timing: 'blocks', phases: [phase({ start: 9, end: 9 })] } }), 'phase-empty')[0].message, /starts at block 9 and ends at block 9, so it is open for no block/);
  assert.deepEqual(ofCheck(withPhases(ALLOW, phase({ start: 60, end: 61 })), 'phase-empty'), []);
});

test('phase-overlap: two phases open at once, at the start of the later one, with the length; a phase that starts at the end of another passes', () => {
  const p = withPhases(ALLOW, phase({ start: 45 }));
  const f = ofCheck(p, 'phase-overlap');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(p), '"start": 45'));
  assert.match(f[0].message, /^Phase public starts at minute 45, before phase allowlist ends at minute 60, so the two are open together for 15 minutes\./);
  assert.deepEqual(ofCheck(plan(), 'phase-overlap'), [], 'a phase that starts when the one before ends');
  const inside = ofCheck(withPhases(phase({ name: 'a', start: 0, end: 100 }), phase({ name: 'b', start: 10, end: 20 })), 'phase-overlap');
  assert.match(inside[0].message, /open together for 10 minutes/);
  const one = ofCheck(withPhases(phase({ name: 'a', start: 0, end: 61 }), phase({ name: 'b', start: 60, end: 120 })), 'phase-overlap');
  assert.match(one[0].message, /for 1 minute\./);
  assert.deepEqual(ofCheck(withPhases(phase({ name: 'a', start: 50, end: 50 }), phase({ name: 'b', start: 0, end: 100 })), 'phase-overlap'), [], 'an empty phase is phase-empty, not an overlap');
  assert.equal(overlaps([phase({ name: 'a', start: 0, end: 10 }), phase({ name: 'b', start: 5, end: 15 }), phase({ name: 'c', start: 8, end: 9 })].map((x, i) => ({ ...x, index: i + 1 }))).length, 3);
});

test('allowlist-root-missing: an allow list with no merkle root or a root of zeros; a root passes', () => {
  const p = withPhases(phase({ ...ALLOW, allowList: { size: 150 } }), phase());
  const f = ofCheck(p, 'allowlist-root-missing');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(p), '"allowList"'));
  assert.match(f[0].message, /^The allow list of phase allowlist has no merkleRoot, so the contract cannot tell a listed wallet from any other\./);
  const zero = ofCheck(withPhases(phase({ ...ALLOW, allowList: { size: 150, merkleRoot: hash('0') } }), phase()), 'allowlist-root-missing');
  assert.match(zero[0].message, /is all zeros, which is the root of no list/);
  assert.deepEqual(ofCheck(withPhases(phase({ ...ALLOW, allowList: { size: 150, merkleRoot: '1'.repeat(64) } }), phase()), 'allowlist-root-missing'), [], 'a root with no 0x in front');
  assert.deepEqual(idsOf(withPhases(phase({ ...ALLOW, allowList: { size: 150, merkleRoot: '0x1234' } }), phase())), ['field-invalid'], 'a root of the wrong form is field-invalid only');
});

test('allowlist-oversubscribed: the wallets times the limit above the cap of the phase, at the size; exactly the cap passes', () => {
  const p = withPhases(phase({ ...ALLOW, allowList: { size: 151, merkleRoot: hash() } }), phase());
  const f = ofCheck(p, 'allowlist-oversubscribed');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(p), '"size"'));
  assert.match(f[0].message, /^The allow list of phase allowlist holds 151 wallets that may mint up to 2 each, 302 tokens, but the phase is capped at 300, so some listed wallets may find it sold out\./);
  assert.deepEqual(ofCheck(plan(), 'allowlist-oversubscribed'), [], '150 wallets of 2 fill a cap of 300 exactly');
  const noLimit = ofCheck(withPhases(phase({ ...ALLOW, perWalletLimit: undefined, allowList: { size: 301, merkleRoot: hash() } }), phase()), 'allowlist-oversubscribed');
  assert.match(noLimit[0].message, /holds 301 wallets, but the phase is capped at 300/, 'with no limit each wallet counts once');
  assert.deepEqual(ofCheck(withPhases(phase({ ...ALLOW, supplyCap: undefined }), phase()), 'allowlist-oversubscribed'), [], 'no cap, nothing to compare');
});

test('public-phase-unlimited: a phase with no allow list and no per-wallet limit, free or priced; a limit or an allow list passes', () => {
  const free = withPhases(ALLOW, phase({ price: '0', perWalletLimit: undefined }));
  const f = ofCheck(free, 'public-phase-unlimited');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(free), '"name": "public"'));
  assert.match(f[0].message, /^Phase public is open to every wallet and free, with no perWalletLimit, so one wallet, or a set of bots, can mint as much of it as it can pay for\./);
  assert.match(ofCheck(withPhases(ALLOW, phase({ perWalletLimit: undefined })), 'public-phase-unlimited')[0].message, /open to every wallet at 0\.05 ETH, with no perWalletLimit/);
  assert.deepEqual(ofCheck(withPhases(phase({ ...ALLOW, perWalletLimit: undefined }), phase()), 'public-phase-unlimited'), [], 'an allow list phase');
  assert.deepEqual(idsOf(withPhases(ALLOW, phase({ perWalletLimit: 0 }))), ['field-invalid'], 'a limit of 0 is field-invalid, not unlimited');
});

test('royalty-invalid: below 0, a fraction and above 10000, at the bps; 0 and 10000 pass the check', () => {
  for (const [bps, pattern] of [[-1, /below 0/], ['12.5', /not a whole number of basis points/], [10001, /above 10000 basis points, which would be more than the whole sale price/]]) {
    const p = plan({ royalty: { bps } });
    const f = ofCheck(p, 'royalty-invalid');
    assert.equal(f.length, 1, String(bps));
    assert.match(f[0].message, pattern);
    assert.equal(f[0].line, lineOf(text(p), '"bps"'));
    assert.deepEqual(ofCheck(p, 'royalty-high'), [], `${bps}: not also high`);
  }
  assert.deepEqual(ofCheck(plan({ royalty: { bps: '500.00' } }), 'royalty-invalid'), [], 'a whole number written with zeros after the point');
  assert.deepEqual(idsOf(plan({ royalty: { bps: 0, receiver: undefined } })), [], 'a royalty of 0 needs no receiver');
  assert.deepEqual(idsOf(plan({ royalty: { bps: 10000 } }), { maxRoyaltyBps: 10000 }), []);
  assert.deepEqual(idsOf(plan({ royalty: { bps: '5%' } })), ['field-invalid'], 'a percent sign is not read');
  assert.deepEqual(idsOf(plan({ royalty: { bps: 1e3 } })), [], 'a number of JSON written as 1000');
});

test('royalty-receiver-missing: a royalty above 0 with no receiver, at the royalty, citing ERC-2981', () => {
  const p = plan({ royalty: { receiver: undefined } });
  const f = ofCheck(p, 'royalty-receiver-missing');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(p), '"royalty"'));
  assert.match(f[0].message, /^The royalty is 500 basis points \(5%\) but names no receiver\. The royaltyInfo of ERC-2981 answers a marketplace with the address the royalty is sent to/);
  assert.deepEqual(ofCheck(plan({ royalty: { receiver: 12 } }), 'royalty-receiver-missing'), [], 'a receiver of the wrong type is field-invalid');
  assert.deepEqual(ofCheck(plan(), 'royalty-receiver-missing'), []);
});

test('royalty-high: above --max-royalty-bps, 1000 by default; at the threshold passes', () => {
  const f = ofCheck(plan({ royalty: { bps: 1001 } }), 'royalty-high');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /^The royalty is 1,001 basis points \(10\.01%\), above the threshold of 1,000 \(10%\) of --max-royalty-bps\./);
  assert.deepEqual(ofCheck(plan({ royalty: { bps: 1000 } }), 'royalty-high'), []);
  assert.equal(ofCheck(plan(), 'royalty-high', { maxRoyaltyBps: 499 }).length, 1);
  assert.deepEqual(ofCheck(plan(), 'royalty-high', { maxRoyaltyBps: 500 }), []);
  assert.ok(checkText(text(plan({ royalty: undefined }))).notes.includes('the plan sets no royalty, so the royalty checks did not run'));
});

test('bpsPercent and priceText: basis points as a percent, and a price as a report shows it', () => {
  assert.equal(bpsPercent(500), '5%');
  assert.equal(bpsPercent(1250), '12.5%');
  assert.equal(bpsPercent(75), '0.75%');
  assert.equal(bpsPercent(1), '0.01%');
  assert.equal(bpsPercent(10000), '100%');
  assert.equal(priceText({ price: null }), null);
  assert.equal(priceText({ price: { int: 0n, scale: 2 }, currency: 'ETH' }), 'free');
  assert.equal(priceText({ price: { int: 50n, scale: 3 }, currency: 'ETH' }), '0.05 ETH');
  assert.equal(priceText({ price: { int: 5n, scale: 0 }, currency: null }), '5');
});

test('reveal-provenance-missing: a delayed reveal with no provenance hash or one of zeros; an instant reveal passes', () => {
  const p = plan({ reveal: { provenanceHash: undefined } });
  const f = ofCheck(p, 'reveal-provenance-missing');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(p), '"method"'));
  assert.match(f[0].message, /^The reveal is delayed and gives no provenanceHash, so collectors cannot check/);
  assert.match(ofCheck(plan({ reveal: { provenanceHash: hash('0') } }), 'reveal-provenance-missing')[0].message, /its provenanceHash is all zeros/);
  assert.deepEqual(idsOf(plan({ reveal: { method: 'instant', placeholderUri: undefined, provenanceHash: undefined } })), []);
});

test('metadata-update-event-missing: an ERC-721 whose metadata change with no ERC-4906 events; ERC-1155, Solana, a freeze at mint or the events pass', () => {
  const p = plan({ metadata: { erc4906: false } });
  const f = ofCheck(p, 'metadata-update-event-missing');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(p), '"erc4906"'));
  assert.match(f[0].message, /^The metadata of this ERC-721 collection change after the mint \(the reveal is delayed\), but the plan does not say that the contract emits the events of ERC-4906 \(erc4906 is false\)/);
  const instant = plan({ reveal: { method: 'instant', placeholderUri: undefined, provenanceHash: undefined }, metadata: { erc4906: undefined } });
  assert.match(ofCheck(instant, 'metadata-update-event-missing')[0].message, /\(the metadata are frozen only after the reveal\).*\(erc4906 is not given\)/);
  const never = plan({ reveal: { method: 'instant', placeholderUri: undefined, provenanceHash: undefined }, metadata: { freeze: 'never', erc4906: undefined } });
  assert.match(ofCheck(never, 'metadata-update-event-missing')[0].message, /\(the metadata are frozen never\)/);
  assert.deepEqual(ofCheck(plan({ reveal: { method: 'instant', placeholderUri: undefined, provenanceHash: undefined }, metadata: { freeze: 'at-mint', erc4906: undefined } }), 'metadata-update-event-missing'), []);
  assert.deepEqual(ofCheck(plan({ collection: { standard: 'ERC-1155' }, metadata: { erc4906: false } }), 'metadata-update-event-missing'), []);
  assert.deepEqual(ofCheck(plan({ collection: { standard: 'eip721' }, metadata: { erc4906: true } }), 'metadata-update-event-missing'), []);
});

test('metadata-freeze-missing: a freeze of never, at its line; a freeze at mint or after the reveal passes', () => {
  const p = plan({ metadata: { freeze: 'never' } });
  const f = ofCheck(p, 'metadata-freeze-missing');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(p), '"freeze"'));
  assert.match(f[0].message, /^The metadata are never frozen \(freeze is never\)/);
  assert.deepEqual(ofCheck(plan(), 'metadata-freeze-missing'), []);
  assert.deepEqual(ofCheck(plan({ metadata: { freeze: 'NEVER' } }), 'metadata-freeze-missing').length, 1, 'in any case');
});

test('admin-single-key: an owner or a withdraw address that is not the multisig, or no multisig at all', () => {
  const p = plan({ admin: { owner: addr('1') } });
  const f = ofCheck(p, 'admin-single-key');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(p), '"owner"'));
  assert.match(f[0].message, /^The owner of the contract, 0x1{40}, is not the multisig of the plan, so one key can change the contract/);
  const w = ofCheck(plan({ withdraw: { address: addr('2') } }), 'admin-single-key');
  assert.match(w[0].message, /^The withdraw address, 0x2{40}, is not the multisig of the plan, so one key receives the proceeds of the mint/);
  const none = ofCheck(plan({ admin: { multisig: undefined } }), 'admin-single-key');
  assert.equal(none.length, 2);
  assert.match(none[0].message, /is not the multisig of the plan, which names none/);
  assert.deepEqual(ofCheck(plan({ admin: { owner: `0x${'A'.repeat(40)}` } }), 'admin-single-key'), [], 'the case of an EVM address does not matter');
  assert.deepEqual(ofCheck(plan({ withdraw: { address: addr('0') } }), 'admin-single-key'), [], 'a malformed address is address-malformed only');
});

test('multisig-threshold-low and multisig-threshold-unreachable: 1, and above the signers; 2 of 3 and 3 of 3 pass', () => {
  const low = plan({ admin: { multisig: { address: addr('a'), threshold: 1, signers: [addr('c'), addr('d')] } } });
  const f = ofCheck(low, 'multisig-threshold-low');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(low), '"threshold"'));
  assert.match(f[0].message, /^The multisig needs only 1 signature of its 2 signers, so any one signer acts alone\./);
  const high = ofCheck(plan({ admin: { multisig: { address: addr('a'), threshold: 4, signers: [addr('c'), addr('d'), addr('e')] } } }), 'multisig-threshold-unreachable');
  assert.match(high[0].message, /^The multisig needs 4 signatures but lists 3 signers, so it can never act\./);
  const dup = findingsOf(plan({ admin: { multisig: { address: addr('a'), threshold: 3, signers: [addr('c'), addr('d'), `0x${'C'.repeat(40)}`] } } }));
  assert.deepEqual(ids(dup), ['field-duplicate', 'multisig-threshold-unreachable'], 'a signer listed twice counts once');
  assert.match(dup[0].message, /^The signer 0xC{40} of the multisig is listed twice; it was counted once\./);
  assert.deepEqual(idsOf(plan({ admin: { multisig: { address: addr('a'), threshold: 3, signers: [addr('c'), addr('d'), addr('e')] } } })), []);
  assert.deepEqual(idsOf(plan({ admin: { multisig: { address: addr('a'), threshold: 0, signers: [addr('c')] } } })), ['field-invalid'], 'a threshold of 0 is not read');
});

test('address-malformed: every address of the plan in the form of its chain, with the zero address', () => {
  const p = plan({ admin: { minter: '0x12345', multisig: { address: addr('a'), threshold: 2, signers: [addr('c'), 'c', addr('e')] } }, royalty: { receiver: addr('0') }, withdraw: { address: 'aaaa' } });
  const f = ofCheck(p, 'address-malformed');
  assert.deepEqual(f.map((x) => x.message.split(',')[0]), ['The minter of the admin roles', 'Signer 2 of the multisig', 'The receiver of the royalty', 'The withdraw address']);
  assert.equal(f[0].line, lineOf(text(p), '"minter"'));
  assert.match(f[2].message, /is the zero address, which no one holds/);
  assert.match(f[3].message, /does not start with 0x/);
  const solana = plan({ collection: { standard: 'Solana' }, mint: { phases: [phase({ ...ALLOW, currency: 'SOL' }), phase({ currency: 'SOL' })] }, metadata: { erc4906: undefined }, royalty: { receiver: sol('R') }, admin: { owner: sol('M'), minter: sol('N'), multisig: { address: sol('M'), threshold: 2, signers: [sol('S'), sol('T')] } }, withdraw: { address: sol('M') } });
  assert.deepEqual(findingsOf(solana), [], 'a Solana plan with Solana addresses');
  assert.match(ofCheck(plan({ collection: { standard: 'Solana' }, mint: { phases: [phase({ currency: 'SOL' })] } }), 'address-malformed')[0].message, /not base58/);
});

test('an unknown standard is field-invalid, and the addresses and the currencies are then not checked, with a note', () => {
  const r = checkText(text(plan({ collection: { standard: 'ERC-404' }, withdraw: { address: 'x' } })));
  assert.deepEqual(ids(r.findings), ['field-invalid']);
  assert.match(r.findings[0].message, /^The standard of the collection is "ERC-404", which is not one the tool reads; write ERC-721, ERC-1155 or Solana\./);
  assert.ok(r.notes.some((n) => n.startsWith('the standard of the collection could not be read, so the addresses and the currencies were not checked')));
});

test('currency-mismatch: SOL on an EVM chain and ETH on Solana; stable coins and unknown currencies pass, with a note', () => {
  const p = withPhases(ALLOW, phase({ currency: 'sol' }));
  const f = ofCheck(p, 'currency-mismatch');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(p), '"currency": "sol"'));
  assert.match(f[0].message, /^The currency of phase public is SOL, a currency of Solana, but the collection is ERC-721, on an EVM chain\./);
  const onSolana = plan({ collection: { standard: 'metaplex' }, mint: { phases: [phase({ currency: 'ETH' })] }, admin: { owner: sol('M'), minter: undefined, multisig: { address: sol('M'), threshold: 2, signers: [sol('S'), sol('T')] } }, royalty: { receiver: sol('R') }, withdraw: { address: sol('M') } });
  assert.match(ofCheck(onSolana, 'currency-mismatch')[0].message, /is ETH, a currency of an EVM chain, but the collection is Solana, on Solana/);
  assert.deepEqual(ofCheck(withPhases(ALLOW, phase({ currency: 'USDC' })), 'currency-mismatch'), []);
  const unknown = checkText(text(withPhases(ALLOW, phase({ currency: 'DOGE' }))));
  assert.deepEqual(unknown.findings, []);
  assert.ok(unknown.notes.includes('the currency DOGE is not one the tool knows, so it was not compared with the chain of the standard'));
});

test('link-invalid: http, another scheme, no web address and a user name; https passes', () => {
  const p = plan({ links: { website: 'http://harbor-owls.example', x: 'https://x.example/owls' } });
  const f = ofCheck(p, 'link-invalid');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(p), '"website"'));
  assert.match(f[0].message, /^The link website, "http:\/\/harbor-owls\.example", starts with http, which anyone on the way can change; write https\./);
  assert.match(linkProblem('ipfs://bafyexample'), /has the scheme ipfs:, not https/);
  assert.match(linkProblem('harbor-owls.example'), /is not a web address/);
  assert.match(linkProblem('https://user:pass@harbor-owls.example'), /carries a user name or a password/);
  assert.equal(linkProblem('https://harbor-owls.example/a?b=c'), null);
  assert.deepEqual(idsOf(plan({ links: { website: 7 } })), ['field-invalid']);
  assert.deepEqual(idsOf(plan({ links: undefined })), [], 'links may be left out');
});

test('field-duplicate: two phases of one name, in any case, at the second name; distinct names pass', () => {
  const p = withPhases(ALLOW, phase(), phase({ name: ' Public ', start: 120, end: 180, supplyCap: 50 }));
  const f = ofCheck(p, 'field-duplicate');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(text(p), '" Public "'));
  assert.match(f[0].message, new RegExp(`^The name Public is also the name of the phase at line ${lineOf(text(p), '"name": "public"') - 1}`));
});
