// The checks on what was read: the supply against the phases and the reserve, the phases one by one and against each
// other, the allow lists, the royalty, the reveal and the metadata, the admin roles and the withdraw address, the
// currencies and the links. Each finding names the line of the field it is about. The start and the end of a phase are
// whole numbers of the plan; the tool reads no clock and never turns one into a date.

import { addressKey, addressProblem, currencyChain } from './addresses.js';
import { formatDecimal } from './decimal.js';
import { BEST } from './rules.js';
import { grouped, listText, plural } from './size.js';

const BP = `This is ${BEST}.`;
const at = (e) => ({ line: e.line, column: e.column });
const shown = (text, max = 60) => (text.length > max ? `${text.slice(0, max - 3)}...` : text);

// A royalty in basis points as a percent: 500 is 5%, 1250 is 12.5%, 75 is 0.75%.
export function bpsPercent(bps) {
  const whole = Math.floor(bps / 100);
  const rest = String(bps % 100).padStart(2, '0').replace(/0+$/, '');
  return `${whole}${rest ? `.${rest}` : ''}%`;
}

// The price of a phase as a report shows it: free, or the amount and the currency.
export function priceText(phase) {
  if (!phase.price) return null;
  if (phase.price.int === 0n) return 'free';
  return `${formatDecimal(phase.price)}${phase.currency ? ` ${phase.currency}` : ''}`;
}

// The pairs of phases that are open at the same time: each phase is open from its start up to, not at, its end. Phases
// with no start or end that could be read, and empty ones, are left out.
export function overlaps(phases) {
  const open = phases.filter((p) => p.start !== null && p.end !== null && p.end > p.start).sort((a, b) => a.start - b.start || a.index - b.index);
  const pairs = [];
  for (let i = 0; i < open.length; i += 1) {
    for (let j = i + 1; j < open.length && open[j].start < open[i].end; j += 1) pairs.push([open[i], open[j], Math.min(open[i].end, open[j].end) - open[j].start]);
  }
  return pairs;
}

// The checks: { findings, notes, summary }. plan may be null when the file could not be read.
export function analyze(plan = null, { maxRoyaltyBps = 1000 } = {}) {
  const findings = [];
  const notes = [];
  const add = (id, where, message, subject = null) => findings.push({ id, file: 'plan', line: where.line, column: where.column, message, subject });
  if (!plan) return { findings, notes, summary: null };
  const { collection, mint, royalty, reveal, metadata, admin, withdraw, links } = plan;
  const chain = collection.chain;
  const phases = mint.phases ?? [];
  const unit = mint.timing === 'blocks' ? 'block' : mint.timing === 'minutes' ? 'minute' : 'unit';

  // The form of every address, on the chain of the standard.
  const addresses = [
    [admin.owner, admin.ownerRaw, admin.ownerEntry, 'The owner of the admin roles'],
    [admin.minter, admin.minterRaw, admin.minterEntry, 'The minter of the admin roles'],
    [admin.multisig?.address ?? null, admin.multisig?.addressRaw ?? null, admin.multisig?.addressEntry ?? null, 'The address of the multisig'],
    ...(admin.multisig?.signers ?? []).map((s, i) => [s.value, s.raw, s.node, `Signer ${i + 1} of the multisig`]),
    [royalty?.receiver ?? null, royalty?.receiverRaw ?? null, royalty?.receiverEntry ?? null, 'The receiver of the royalty'],
    [withdraw.address, withdraw.addressRaw, withdraw.addressEntry, 'The withdraw address']
  ];
  const valid = new Set();
  if (chain) {
    for (const [value, raw, entry, label] of addresses) {
      if (value === null) continue;
      const problem = addressProblem(raw ?? value, chain);
      if (problem) add('address-malformed', at(entry), `${label}, "${shown(value)}", ${problem}; an address of ${chain === 'solana' ? 'Solana is 32 to 44 base58 characters' : 'an EVM chain is 0x followed by 40 hex digits'}. ${BP}`);
      else valid.add(entry);
    }
  } else if (addresses.some(([v]) => v !== null)) notes.push('the standard of the collection could not be read, so the addresses and the currencies were not checked against its chain, and the owner and the withdraw address were not compared with the multisig');

  // The supply: the caps of the phases and the reserve against the max supply.
  let capped = 0;
  const uncapped = [];
  for (const p of phases) {
    if (p.cap !== null) capped += p.cap;
    else if (!p.capInvalid) uncapped.push(p.title);
  }
  const reserve = collection.reserve ?? 0;
  if (collection.maxSupply !== null) {
    const max = collection.maxSupply;
    if (reserve > max) add('supply-exceeded', at(collection.reserveEntry), `The reserve of the collection is ${grouped(reserve)} tokens, above its maxSupply of ${grouped(max)}. ${BP}`);
    else if (capped + reserve > max) add('supply-exceeded', at(collection.maxSupplyEntry), `The supply caps of the phases add up to ${grouped(capped)} and the reserve to ${grouped(reserve)}, ${grouped(capped + reserve)} in all, ${grouped(capped + reserve - max)} above the maxSupply of ${grouped(max)}. ${BP}`);
    if (uncapped.length && phases.length) notes.push(`${uncapped.length === 1 ? 'phase' : 'the phases'} ${listText(uncapped, 8)} ${uncapped.length === 1 ? 'gives' : 'give'} no supplyCap, so supply-exceeded added up only the caps that are given`);
  }

  // Phases written twice, empty phases and phases open at the same time.
  const names = new Map();
  for (const p of phases) {
    if (p.name === null) continue;
    const k = p.name.toLowerCase();
    if (names.has(k)) add('field-duplicate', at(p.nameEntry), `The name ${shown(p.name, 40)} is also the name of the phase at line ${names.get(k).line}; each phase needs a name of its own.`, p.title);
    else names.set(k, p);
  }
  for (const p of phases) {
    if (p.start === null || p.end === null || p.end > p.start) continue;
    add('phase-empty', at(p.endEntry), `Phase ${p.title} starts at ${unit} ${grouped(p.start)} and ends at ${unit} ${grouped(p.end)}, so it is open for no ${unit}${p.end < p.start ? ': it ends before it starts' : ''}. ${BP}`, p.title);
  }
  for (const [a, b, length] of overlaps(phases)) {
    add('phase-overlap', at(b.startEntry), `Phase ${b.title} starts at ${unit} ${grouped(b.start)}, before phase ${a.title} ends at ${unit} ${grouped(a.end)}, so the two are open together for ${plural(length, unit)}. ${BP}`, b.title);
  }
  if (phases.length > 1 && mint.timing === null) notes.push('the timing of the mint could not be read, so the starts and the ends were compared as numbers of one scale');

  // The allow lists and the public phases.
  for (const p of phases) {
    const al = p.allowList;
    if (al) {
      if (!al.root && !al.rootInvalid) add('allowlist-root-missing', at(al.entry), `The allow list of phase ${p.title} has no merkleRoot, so the contract cannot tell a listed wallet from any other. ${BP}`, p.title);
      else if (al.root?.zero) add('allowlist-root-missing', at(al.rootEntry), `The merkleRoot of the allow list of phase ${p.title} is all zeros, which is the root of no list. ${BP}`, p.title);
      if (al.size !== null && p.cap !== null) {
        const each = p.perWallet ?? 1;
        if (al.size * each > p.cap) add('allowlist-oversubscribed', at(al.sizeEntry), `The allow list of phase ${p.title} holds ${plural(al.size, 'wallet')}${p.perWallet !== null ? ` that may mint up to ${grouped(each)} each, ${grouped(al.size * each)} tokens` : ''}, but the phase is capped at ${grouped(p.cap)}, so some listed wallets may find it sold out. ${BP}`, p.title);
      }
    } else if (!p.allowListInvalid && p.perWallet === null && !p.perWalletInvalid) {
      const price = priceText(p);
      add('public-phase-unlimited', at(p.nameEntry ?? p), `Phase ${p.title} is open to every wallet${price === 'free' ? ' and free' : price ? ` at ${price}` : ''}, with no perWalletLimit, so one wallet, or a set of bots, can mint as much of it as it can pay for. ${BP}`, p.title);
    }
  }

  // The currencies against the chain of the standard.
  if (chain) {
    for (const p of phases) {
      if (p.currency === null) continue;
      const c = currencyChain(p.currency);
      if (c && c !== 'both' && c !== chain) add('currency-mismatch', at(p.currencyEntry), `The currency of phase ${p.title} is ${shown(p.currency, 20)}, a currency of ${c === 'solana' ? 'Solana' : 'an EVM chain'}, but the collection is ${collection.standard}, on ${chain === 'solana' ? 'Solana' : 'an EVM chain'}. ${BP}`, p.title);
    }
    const unknown = [...new Set(phases.filter((p) => p.currency !== null && currencyChain(p.currency) === null).map((p) => shown(p.currency, 20)))];
    if (unknown.length) notes.push(`the ${unknown.length === 1 ? 'currency' : 'currencies'} ${listText(unknown, 8)} ${unknown.length === 1 ? 'is' : 'are'} not one the tool knows, so ${unknown.length === 1 ? 'it was' : 'they were'} not compared with the chain of the standard`);
  }

  // The royalty.
  if (royalty && royalty.bps) {
    const b = royalty.bps;
    if (b.state === 'negative') add('royalty-invalid', at(royalty.bpsEntry), `The bps of the royalty is ${shown(b.text, 30)}, below 0. A royalty is a share of the sale price from 0 to 10000 basis points. ${BP}`);
    else if (b.state === 'fraction') add('royalty-invalid', at(royalty.bpsEntry), `The bps of the royalty is ${shown(b.text, 30)}, which is not a whole number of basis points; a basis point is already a hundredth of a percent. ${BP}`);
    else if (b.state === 'above') add('royalty-invalid', at(royalty.bpsEntry), `The bps of the royalty is ${shown(b.text, 30)}, above 10000 basis points, which would be more than the whole sale price. ${BP}`);
    else {
      if (b.value > 0 && royalty.receiver === null && !royalty.receiverInvalid) add('royalty-receiver-missing', at(royalty.entry), `The royalty is ${grouped(b.value)} basis points (${bpsPercent(b.value)}) but names no receiver. The royaltyInfo of ERC-2981 answers a marketplace with the address the royalty is sent to, and a royalty with no receiver has nowhere to go.`);
      if (b.value > maxRoyaltyBps) add('royalty-high', at(royalty.bpsEntry), `The royalty is ${grouped(b.value)} basis points (${bpsPercent(b.value)}), above the threshold of ${grouped(maxRoyaltyBps)} (${bpsPercent(maxRoyaltyBps)}) of --max-royalty-bps. ${BP}`);
    }
  }

  // The reveal and the metadata.
  const delayed = reveal.method === 'delayed';
  if (delayed && (!reveal.provenance || reveal.provenance.zero)) add('reveal-provenance-missing', at(reveal.provenanceEntry ?? reveal.methodEntry), `The reveal is delayed${reveal.provenance?.zero ? ' and its provenanceHash is all zeros' : ' and gives no provenanceHash'}, so collectors cannot check that the order of the art was fixed before the mint. ${BP}`);
  const changes = delayed || (metadata.freeze !== null && metadata.freeze !== 'at-mint');
  if (collection.standard === 'ERC-721' && changes && metadata.erc4906 !== true && metadata.entry) {
    const why = delayed ? 'the reveal is delayed' : `the metadata are frozen ${metadata.freeze === 'never' ? 'never' : 'only after the reveal'}`;
    add('metadata-update-event-missing', at(metadata.erc4906Entry ?? metadata.entry), `The metadata of this ERC-721 collection change after the mint (${why}), but the plan does not say that the contract emits the events of ERC-4906 (erc4906 is ${metadata.erc4906 === false ? 'false' : 'not given'}). A contract with that extension emits MetadataUpdate or BatchMetadataUpdate when the JSON metadata change, so that marketplaces refresh the tokens.`);
  }
  if (metadata.freeze === 'never') add('metadata-freeze-missing', at(metadata.freezeEntry), `The metadata are never frozen (freeze is never), so the owner can change the art and the traits of every token after the sale. ${BP}`);

  // The admin roles and the withdraw address.
  const ms = admin.multisig;
  const msKey = ms && ms.address !== null && valid.has(ms.addressEntry) ? addressKey(ms.address, chain) : null;
  for (const [value, entry, label] of [[admin.owner, admin.ownerEntry, 'The owner of the contract'], [withdraw.address, withdraw.addressEntry, 'The withdraw address']]) {
    if (!admin.read || value === null || !valid.has(entry)) continue;
    if (msKey === null || addressKey(value, chain) !== msKey) add('admin-single-key', at(entry), `${label}, ${shown(value, 50)}, is not the multisig of the plan${ms ? '' : ', which names none'}, so one key ${label.startsWith('The owner') ? 'can change the contract, its supply, its price and its metadata' : 'receives the proceeds of the mint'}. ${BP}`);
  }
  if (ms) {
    const seen = new Map();
    let count = 0;
    for (const s of ms.signers ?? []) {
      const k = chain ? addressKey(s.value, chain) : s.value.toLowerCase();
      if (seen.has(k)) add('field-duplicate', at(s.node), `The signer ${shown(s.value, 50)} of the multisig is listed twice; it was counted once.`);
      else {
        seen.set(k, s);
        count += 1;
      }
    }
    if (ms.threshold === 1) add('multisig-threshold-low', at(ms.thresholdEntry), `The multisig needs only 1 signature${count ? ` of its ${plural(count, 'signer')}` : ''}, so any one signer acts alone. ${BP}`);
    if (ms.threshold !== null && ms.signers && count > 0 && ms.threshold > count) add('multisig-threshold-unreachable', at(ms.thresholdEntry), `The multisig needs ${plural(ms.threshold, 'signature')} but lists ${plural(count, 'signer')}, so it can never act. ${BP}`);
  }

  // The links.
  for (const l of links) {
    const problem = linkProblem(l.value);
    if (problem) add('link-invalid', at(l.entry), `The link ${shown(l.key, 40)}, "${shown(l.value)}", ${problem}. ${BP}`);
  }

  const summary = {
    phases: phases.map((p) => ({ name: p.title, start: p.start, end: p.end, price: priceText(p), perWallet: p.perWallet, cap: p.cap, allowList: p.allowList ? p.allowList.size : null, merkleRoot: p.allowList ? (p.allowList.root && !p.allowList.root.zero ? 'set' : 'missing') : null })),
    capped,
    reserve: collection.reserve,
    uncapped: uncapped.length
  };
  return { findings, notes, summary };
}

// What is wrong with a link, or null: it must be an https address with a host, and no user name or password.
export function linkProblem(text) {
  let u;
  try {
    u = new URL(text);
  } catch {
    return 'is not a web address';
  }
  if (u.protocol === 'http:') return 'starts with http, which anyone on the way can change; write https';
  if (u.protocol !== 'https:') return `has the scheme ${shown(u.protocol, 20)}, not https`;
  if (!u.hostname) return 'has no host';
  if (u.username || u.password) return 'carries a user name or a password';
  return null;
}
