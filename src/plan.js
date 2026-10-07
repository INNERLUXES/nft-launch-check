// Reading the launch plan of an NFT collection from the nodes of the JSON reader: the collection, the mint with its
// phases, the royalty, the reveal, the metadata, the admin roles, the withdraw address and the links. Every field is read
// with the line and column of its key. A field that is missing, of the wrong type or unknown is a finding of its own,
// and the value is left out of the checks that need it; nothing that was not read is taken for a value that is fine.
// The start and the end of a phase are whole numbers on the scale the plan names (minutes from a point of its own, or
// block numbers); the tool reads no clock.

import { isObject } from './json.js';
import { Reader, cut, describe, readAmount, readBps, where } from './fields.js';

export const PLAN_LIMITS = { maxWhole: 999999999999, maxPhases: 100, maxSigners: 100, maxLinks: 50, maxThreshold: 1000 };

export const TOP_KEYS = ['collection', 'mint', 'royalty', 'reveal', 'metadata', 'admin', 'withdraw', 'links', 'notes'];
export const COLLECTION_KEYS = ['name', 'symbol', 'standard', 'maxSupply', 'reserve', 'notes'];
export const MINT_KEYS = ['timing', 'phases', 'notes'];
export const PHASE_KEYS = ['name', 'start', 'end', 'price', 'currency', 'perWalletLimit', 'supplyCap', 'allowList', 'notes'];
export const ALLOWLIST_KEYS = ['size', 'merkleRoot', 'notes'];
export const ROYALTY_KEYS = ['bps', 'receiver', 'notes'];
export const REVEAL_KEYS = ['method', 'placeholderUri', 'provenanceHash', 'notes'];
export const METADATA_KEYS = ['freeze', 'erc4906', 'notes'];
export const ADMIN_KEYS = ['owner', 'minter', 'multisig', 'notes'];
export const MULTISIG_KEYS = ['address', 'threshold', 'signers', 'notes'];
export const WITHDRAW_KEYS = ['address', 'notes'];

export const TIMINGS = ['minutes', 'blocks'];
export const REVEAL_METHODS = ['instant', 'delayed'];
export const FREEZE_PLANS = ['at-mint', 'after-reveal', 'never'];

// The names a plan may give a standard by, compared in small letters with spaces left out, and the chain of each.
export const STANDARDS = [
  { name: 'ERC-721', chain: 'evm', names: ['erc-721', 'erc721', 'eip-721', 'eip721'] },
  { name: 'ERC-1155', chain: 'evm', names: ['erc-1155', 'erc1155', 'eip-1155', 'eip1155'] },
  { name: 'Solana', chain: 'solana', names: ['solana', 'metaplex', 'spl'] }
];
export const standardOf = (text) => STANDARDS.find((s) => s.names.includes(text.toLowerCase().replace(/\s+/g, ''))) ?? null;

// The schemes a placeholder URI may have: content addresses, a web address and a data URI.
const PLACEHOLDER = /^(?:ipfs:\/\/|ar:\/\/|https:\/\/|data:)\S+$/i;

// Reads the plan from the root node: { plan, findings, notes }. plan is null when the top level is not an object.
export function readPlan(root, limits = PLAN_LIMITS) {
  const reader = new Reader('plan');
  const notes = [];
  if (!isObject(root)) {
    reader.add('file-unreadable', where(root), `The top level of the plan is ${describe(root)}, not an object with the collection, the mint, the reveal, the metadata, the admin roles and the withdraw address, so nothing was checked.`);
    return { plan: null, findings: reader.findings, notes: ['the plan was not checked, because it holds no object at its top level'] };
  }
  const max = limits.maxWhole;
  const top = reader.fields(root, TOP_KEYS, 'the plan');
  const missing = (at, Label, key) => reader.add('field-missing', at, `${Label} has no ${key}.`);
  const part = (key, what, required = true) => {
    const o = reader.object(top, key, 'the plan', what);
    if (!o.entry && required) missing(where(root), 'The plan', key);
    return o;
  };

  // The collection.
  const collection = { entry: null, name: null, symbol: null, standard: null, standardEntry: null, chain: null, maxSupply: null, maxSupplyEntry: null, reserve: null, reserveEntry: null };
  const c = part('collection', 'its name, symbol, standard, maxSupply and reserve');
  collection.entry = c.entry;
  if (c.value) {
    const m = reader.fields(c.value, COLLECTION_KEYS, 'the collection');
    const name = reader.text(m, 'name', 'the collection');
    collection.name = name.value;
    if (name.value === null && !name.invalid) missing(where(c.entry), 'The collection', 'name');
    collection.symbol = reader.text(m, 'symbol', 'the collection').value;
    const std = reader.text(m, 'standard', 'the collection');
    collection.standardEntry = std.entry;
    if (std.value === null && !std.invalid) missing(where(c.entry), 'The collection', 'standard');
    else if (std.value !== null) {
      const s = standardOf(std.value);
      if (s) {
        collection.standard = s.name;
        collection.chain = s.chain;
      } else reader.add('field-invalid', where(std.entry), `The standard of the collection is "${cut(std.value, 40)}", which is not one the tool reads; write ERC-721, ERC-1155 or Solana.`);
    }
    const ms = reader.whole(m, 'maxSupply', 'the collection', { min: 1, max, what: 'tokens' });
    collection.maxSupply = ms.value;
    collection.maxSupplyEntry = ms.entry;
    if (!ms.entry) missing(where(c.entry), 'The collection', 'maxSupply');
    const rs = reader.whole(m, 'reserve', 'the collection', { min: 0, max, what: 'tokens' });
    collection.reserve = rs.value;
    collection.reserveEntry = rs.entry;
  }

  // The mint and its phases.
  const mint = { entry: null, timing: null, timingEntry: null, phases: null, phasesEntry: null };
  const mi = part('mint', 'its timing and its phases');
  mint.entry = mi.entry;
  if (mi.value) {
    const m = reader.fields(mi.value, MINT_KEYS, 'the mint');
    const timing = reader.choice(m, 'timing', 'the mint', TIMINGS);
    mint.timing = timing.value;
    mint.timingEntry = timing.entry;
    if (!timing.entry) missing(where(mi.entry), 'The mint', 'timing; write minutes or blocks, the scale of the start and the end of each phase');
    const pe = m.get('phases');
    mint.phasesEntry = pe ?? null;
    if (!pe) missing(where(mi.entry), 'The mint', 'phases');
    else if (!pe.value.secret) {
      if (pe.value.kind !== 'array') reader.add('field-invalid', where(pe), `The phases of the mint are ${describe(pe.value)}; they must be a list of objects, one for each phase.`);
      else {
        if (pe.value.items.length === 0) reader.add('field-missing', where(pe), 'The mint holds no phase.');
        if (pe.value.items.length > limits.maxPhases) notes.push(`the mint holds ${pe.value.items.length} phases; the tool read the first ${limits.maxPhases} and left the rest out`);
        mint.phases = [];
        for (const [index, node] of pe.value.items.slice(0, limits.maxPhases).entries()) {
          const n = index + 1;
          if (node.secret) continue;
          if (!isObject(node)) {
            reader.add('field-invalid', where(node), `Phase ${n} of the mint is ${describe(node)}; it must be an object.`);
            continue;
          }
          mint.phases.push(readPhase(reader, node, n, max));
        }
      }
    }
  }

  // The royalty, which a plan may leave out.
  let royalty = null;
  const ro = part('royalty', 'bps and the receiver', false);
  if (ro.value) {
    const m = reader.fields(ro.value, ROYALTY_KEYS, 'the royalty');
    royalty = { entry: ro.entry, bps: null, bpsEntry: null, receiver: null, receiverRaw: null, receiverEntry: null, receiverInvalid: false };
    const b = reader.amount(m, 'bps', 'the royalty');
    royalty.bpsEntry = b.entry;
    if (b.value !== null) {
      const bps = readBps(b.value);
      if (bps.state === 'nan') reader.add('field-invalid', where(b.entry), `The bps of the royalty is "${cut(b.value, 40)}", which is not a plain number such as 500: no exponent, separator or unit.`);
      else royalty.bps = bps;
    } else if (!b.invalid) missing(where(b.entry ?? ro.entry), 'The royalty', 'bps');
    const r = reader.text(m, 'receiver', 'the royalty');
    royalty.receiver = r.value;
    royalty.receiverRaw = r.raw ?? null;
    royalty.receiverEntry = r.entry;
    royalty.receiverInvalid = Boolean(r.invalid);
  } else if (!ro.entry) notes.push('the plan sets no royalty, so the royalty checks did not run');

  // The reveal.
  const reveal = { entry: null, method: null, methodEntry: null, placeholder: null, placeholderEntry: null, provenance: null, provenanceEntry: null };
  const rv = part('reveal', 'its method, placeholderUri and provenanceHash');
  reveal.entry = rv.entry;
  if (rv.value) {
    const m = reader.fields(rv.value, REVEAL_KEYS, 'the reveal');
    const method = reader.choice(m, 'method', 'the reveal', REVEAL_METHODS);
    reveal.method = method.value;
    reveal.methodEntry = method.entry;
    if (!method.entry) missing(where(rv.entry), 'The reveal', 'method; write instant or delayed');
    const ph = reader.text(m, 'placeholderUri', 'the reveal');
    reveal.placeholderEntry = ph.entry;
    if (ph.value !== null) {
      if (PLACEHOLDER.test(ph.value)) reveal.placeholder = ph.value;
      else reader.add('field-invalid', where(ph.entry), `The placeholderUri of the reveal is "${cut(ph.value, 60)}", which is not a URI the tool reads; write ipfs://, ar://, https:// or data: with the rest of the address.`);
    }
    if (reveal.method === 'delayed' && ph.value === null && !ph.invalid) missing(where(ph.entry ?? rv.entry), 'The delayed reveal', 'placeholderUri, the metadata every token shows until the reveal');
    const pv = reader.hash(m, 'provenanceHash', 'the reveal');
    reveal.provenance = pv.value === null ? null : { zero: pv.zero };
    reveal.provenanceEntry = pv.entry;
  }

  // The metadata.
  const metadata = { entry: null, freeze: null, freezeEntry: null, erc4906: null, erc4906Entry: null };
  const md = part('metadata', 'its freeze plan and whether the contract emits the events of ERC-4906');
  metadata.entry = md.entry;
  if (md.value) {
    const m = reader.fields(md.value, METADATA_KEYS, 'the metadata');
    const fr = reader.choice(m, 'freeze', 'the metadata', FREEZE_PLANS);
    metadata.freeze = fr.value;
    metadata.freezeEntry = fr.entry;
    if (!fr.entry) missing(where(md.entry), 'The metadata', 'freeze; write at-mint, after-reveal or never');
    if (fr.value === 'at-mint' && reveal.method === 'delayed') reader.add('field-invalid', where(fr.entry), 'The metadata are frozen at-mint, but the reveal is delayed, and a delayed reveal changes the metadata after the mint; write after-reveal, or reveal at once.');
    const ev = reader.flag(m, 'erc4906', 'the metadata');
    metadata.erc4906 = ev.value;
    metadata.erc4906Entry = ev.entry;
  }

  // The admin roles.
  const admin = { entry: null, read: false, owner: null, ownerRaw: null, ownerEntry: null, minter: null, minterRaw: null, minterEntry: null, multisig: null };
  const ad = part('admin', 'the owner, the minter and the multisig');
  admin.entry = ad.entry;
  if (ad.value) {
    admin.read = true;
    const m = reader.fields(ad.value, ADMIN_KEYS, 'the admin roles');
    const owner = reader.text(m, 'owner', 'the admin roles');
    Object.assign(admin, { owner: owner.value, ownerRaw: owner.raw ?? null, ownerEntry: owner.entry });
    if (owner.value === null && !owner.invalid) missing(where(ad.entry), 'The admin roles', 'owner');
    const minter = reader.text(m, 'minter', 'the admin roles');
    Object.assign(admin, { minter: minter.value, minterRaw: minter.raw ?? null, minterEntry: minter.entry });
    const ms = reader.object(m, 'multisig', 'the admin roles', 'its address, threshold and signers');
    if (ms.value) {
      const mm = reader.fields(ms.value, MULTISIG_KEYS, 'the multisig');
      const address = reader.text(mm, 'address', 'the multisig');
      if (address.value === null && !address.invalid) missing(where(ms.entry), 'The multisig', 'address');
      const threshold = reader.whole(mm, 'threshold', 'the multisig', { min: 1, max: limits.maxThreshold, what: 'signatures' });
      if (!threshold.entry) missing(where(ms.entry), 'The multisig', 'threshold');
      const signers = reader.list(mm, 'signers', 'the multisig');
      if (!signers.entry) missing(where(ms.entry), 'The multisig', 'signers');
      else if (signers.value && signers.value.length === 0) reader.add('field-missing', where(signers.entry), 'The multisig lists no signer.');
      admin.multisig = { entry: ms.entry, address: address.value, addressRaw: address.raw ?? null, addressEntry: address.entry, threshold: threshold.value, thresholdEntry: threshold.entry, signers: signers.value === null ? null : signers.value.slice(0, limits.maxSigners), signersEntry: signers.entry };
    }
  }

  // The withdraw address.
  const withdraw = { entry: null, address: null, addressRaw: null, addressEntry: null };
  const wd = part('withdraw', 'the address the proceeds of the mint are withdrawn to');
  withdraw.entry = wd.entry;
  if (wd.value) {
    const m = reader.fields(wd.value, WITHDRAW_KEYS, 'the withdraw');
    const a = reader.text(m, 'address', 'the withdraw');
    Object.assign(withdraw, { address: a.value, addressRaw: a.raw ?? null, addressEntry: a.entry });
    if (a.value === null && !a.invalid) missing(where(wd.entry), 'The withdraw', 'address');
  }

  // The links: any names, each with a text.
  const links = [];
  const ln = part('links', 'a web address for each name, such as {"website": "https://..."}', false);
  if (ln.value) {
    for (const e of ln.value.entries.slice(0, limits.maxLinks)) {
      if (e.secret) continue;
      const r = reader.text(new Map([[e.key, e]]), e.key, 'the links');
      if (r.value !== null) links.push({ key: e.key, value: r.value, entry: e });
    }
    if (ln.value.entries.length > limits.maxLinks) notes.push(`the plan holds ${ln.value.entries.length} links; the tool read the first ${limits.maxLinks}`);
  }

  return { plan: { root, collection, mint, royalty, reveal, metadata, admin, withdraw, links }, findings: reader.findings, notes };
}

// One phase of the mint.
function readPhase(reader, node, n, max) {
  const m = reader.fields(node, PHASE_KEYS, `phase ${n}`);
  const name = reader.text(m, 'name', `phase ${n}`);
  const title = name.value === null ? `${n}` : cut(name.value, 60);
  const of = `phase ${title}`;
  const Of = `Phase ${title}`;
  const p = { index: n, node, line: node.line, column: node.column, title, name: name.value, nameEntry: name.entry };
  if (name.value === null && !name.invalid) reader.add('field-missing', where(node), `Phase ${n} of the mint has no name.`, title);
  for (const key of ['start', 'end']) {
    const r = reader.whole(m, key, of, { min: 0, max, what: 'minutes or blocks' });
    p[key] = r.value;
    p[`${key}Entry`] = r.entry;
    if (!r.entry) reader.add('field-missing', where(node), `${Of} has no ${key}.`, title);
  }
  const price = reader.amount(m, 'price', of);
  p.priceEntry = price.entry;
  p.price = null;
  p.priceText = price.value;
  if (price.value !== null) {
    const a = readAmount(price.value);
    if (a.state === 'ok' || a.state === 'zero') p.price = a.value;
    else reader.add('field-invalid', where(price.entry), `The price of ${of} is "${cut(price.value, 40)}"; it must be a plain decimal number of 0 or more, such as 0.05, with no sign, exponent or separator.`, title);
  } else if (!price.invalid) reader.add('field-missing', where(price.entry ?? node), `${Of} has no price; write 0 for a free phase.`, title);
  const cur = reader.text(m, 'currency', of);
  p.currency = cur.value === null ? null : cur.value.toUpperCase();
  p.currencyEntry = cur.entry;
  if (cur.value === null && !cur.invalid && !(p.price && p.price.int === 0n)) reader.add('field-missing', where(cur.entry ?? node), `${Of} has no currency, such as ETH or SOL.`, title);
  const limit = reader.whole(m, 'perWalletLimit', of, { min: 1, max, what: 'tokens' });
  p.perWallet = limit.value;
  p.perWalletEntry = limit.entry;
  p.perWalletInvalid = Boolean(limit.invalid);
  const cap = reader.whole(m, 'supplyCap', of, { min: 1, max, what: 'tokens' });
  p.cap = cap.value;
  p.capEntry = cap.entry;
  p.capInvalid = Boolean(cap.invalid);
  p.allowList = null;
  const al = reader.object(m, 'allowList', of, 'its size and merkleRoot');
  p.allowListInvalid = Boolean(al.invalid);
  if (al.value) {
    const am = reader.fields(al.value, ALLOWLIST_KEYS, `the allow list of ${of}`);
    const size = reader.whole(am, 'size', `the allow list of ${of}`, { min: 1, max, what: 'wallets' });
    if (!size.entry) reader.add('field-missing', where(al.entry), `The allow list of ${of} has no size, the number of wallets on it.`, title);
    const root = reader.hash(am, 'merkleRoot', `the allow list of ${of}`);
    p.allowList = { entry: al.entry, size: size.value, sizeEntry: size.entry, root: root.value === null ? null : { zero: root.zero }, rootEntry: root.entry, rootInvalid: Boolean(root.invalid) };
  }
  return p;
}
