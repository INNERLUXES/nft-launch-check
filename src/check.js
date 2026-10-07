// A run: read the launch plan as JSON, look for keys and seeds in it, read the fields, run the checks and build the
// report object that the formats write.

import { analyze, bpsPercent } from './analyze.js';
import { LEVELS, NOTICE, POINTS, pointPage } from './data.js';
import { HASH_FORM } from './fields.js';
import { FILE_LIMITS, InputError, displayPath, locateInput, readInputText } from './files.js';
import { JsonError, isArray, isObject, isString, readJson } from './json.js';
import { readPlan } from './plan.js';
import { RULES, decide, ruleById } from './rules.js';
import { findSecrets } from './secrets.js';
import { safeText } from './text.js';

export const LIMITS = { ...FILE_LIMITS };

export { InputError };

// The default threshold of royalty-high, in basis points: 10%.
export const DEFAULT_MAX_ROYALTY_BPS = 1000;

const clean = (t, max = 900) => safeText(t, max);

const ORDER = { error: 0, warning: 1, info: 2 };

// The keys whose value is a hash of 32 bytes: a merkle root and a provenance hash. A hash is 64 hex digits, the shape the
// search for secrets reads as a private key in hex, so a value of that form under one of these keys is taken as the hash
// it is meant to be and not reported as a key. The tool never shows the value of these keys, so a key pasted there is not
// shown either (docs/limits.md).
export const HASH_KEYS = ['merkleRoot', 'provenanceHash'];

// The basis of a rule: the points with their pages.
function basisOf(rule) {
  return rule.basis.map((id) => {
    const page = pointPage(id);
    return { text: POINTS[id].text, source: page.title, url: page.url };
  });
}

// The value nodes of the plan under a key of HASH_KEYS that have the form of a hash, found without recursion.
export function hashNodes(root) {
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (isObject(node)) {
      for (const e of node.entries) {
        if (HASH_KEYS.includes(e.key) && isString(e.value) && HASH_FORM.test(e.value.value.trim())) out.push(e.value);
        else stack.push(e.value);
      }
    } else if (isArray(node)) for (const item of node.items) stack.push(item);
  }
  return out;
}

// The search for keys and seeds of the sibling tools, kept unchanged in src/secrets.js, with two changes made here: its
// finding is named for the plan, and a hash under a key of HASH_KEYS is not a finding and is read as a hash.
export function planSecrets(root) {
  const hashes = new Map(hashNodes(root).map((n) => [`${n.line}:${n.column}`, n]));
  const findings = [];
  for (const f of findSecrets(root)) {
    const node = hashes.get(`${f.line}:${f.column}`);
    if (node && f.message.endsWith('is shaped like a private key in hex. The tool never reads a seed or a key, and the value is not shown.')) {
      node.secret = false;
      continue;
    }
    findings.push({ ...f, id: 'secret-in-file', file: 'plan', subject: null, message: f.message.replace(/^The configuration holds/, 'The plan holds') });
  }
  return findings;
}

// The findings of the text of a plan, with no file system. Returns { read, analysis, findings, notes }.
export function checkText(text, { maxRoyaltyBps = DEFAULT_MAX_ROYALTY_BPS } = {}) {
  let root;
  try {
    root = readJson(text);
  } catch (error) {
    if (!(error instanceof JsonError)) throw error;
    const findings = [{ id: 'file-unreadable', file: 'plan', line: error.line, column: error.column, message: `The plan is not JSON the reader can follow: ${error.message}. Nothing in the file was checked.`, subject: null }];
    return { read: null, analysis: analyze(null), findings, notes: ['the plan was not checked, because the file is not JSON the reader can follow'] };
  }
  const secrets = planSecrets(root);
  const r = readPlan(root);
  const analysis = analyze(r.plan, { maxRoyaltyBps });
  return { read: r.plan, analysis, findings: [...secrets, ...r.findings, ...analysis.findings], notes: [...r.notes, ...analysis.notes] };
}

const lineCount = (text) => {
  const parts = text === '' ? [] : text.split(/\r\n|\r|\n/);
  return parts.length > 0 && parts.at(-1) === '' ? parts.length - 1 : parts.length;
};

const textOf = (v, max) => (v === null || v === undefined ? null : clean(v, max));

// What the plan says, as the report shows it. The value of a hash and of a merkle root is never shown, only whether it
// is set.
function planOf(plan, summary) {
  if (!plan) return null;
  const c = plan.collection;
  const r = plan.royalty;
  const ms = plan.admin.multisig;
  return {
    collection: { name: textOf(c.name, 120), symbol: textOf(c.symbol, 20), standard: c.standard, maxSupply: c.maxSupply, reserve: c.reserve },
    mint: { timing: plan.mint.timing, phases: plan.mint.phases ? plan.mint.phases.length : null, capped: summary.capped, uncapped: summary.uncapped },
    royalty: r ? { bps: r.bps && r.bps.state === 'ok' ? r.bps.value : null, percent: r.bps && r.bps.state === 'ok' ? bpsPercent(r.bps.value) : null, receiver: textOf(r.receiver, 60) } : null,
    reveal: { method: plan.reveal.method, placeholder: plan.reveal.placeholder !== null, provenanceHash: Boolean(plan.reveal.provenance && !plan.reveal.provenance.zero) },
    metadata: { freeze: plan.metadata.freeze, erc4906: plan.metadata.erc4906 },
    admin: { owner: textOf(plan.admin.owner, 60), minter: textOf(plan.admin.minter, 60), multisig: ms ? { address: textOf(ms.address, 60), threshold: ms.threshold, signers: ms.signers ? ms.signers.length : null } : null },
    withdraw: textOf(plan.withdraw.address, 60),
    links: plan.links.length
  };
}

// The report object for the findings of the plan. file is { file, bytes, lines }.
export function buildReport({ file, checked, version, minSeverity = 'info', failOn = 'error', maxRoyaltyBps = DEFAULT_MAX_ROYALTY_BPS }) {
  const all = checked.findings.map((f) => {
    const rule = ruleById(f.id);
    return {
      id: f.id,
      severity: rule.severity,
      message: clean(f.message),
      file: file.file,
      line: f.line,
      column: f.column,
      at: `${file.file}:${f.line}`,
      subject: f.subject == null ? null : clean(f.subject, 120),
      fix: rule.fix,
      kind: rule.kind,
      basis: basisOf(rule),
      own: rule.own ?? null
    };
  });
  all.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.line - b.line || a.column - b.column || a.id.localeCompare(b.id, 'en'));
  const shown = all.filter((f) => LEVELS.indexOf(f.severity) >= LEVELS.indexOf(minSeverity));
  const byLevel = { error: 0, warning: 0, info: 0 };
  for (const f of shown) byLevel[f.severity] += 1;
  const allByLevel = { error: 0, warning: 0, info: 0 };
  for (const f of all) allByLevel[f.severity] += 1;
  const summary = checked.analysis.summary;
  return {
    tool: 'nft-launch-check',
    version,
    input: { file: file.file, format: 'json', bytes: file.bytes, lines: file.lines },
    plan: summary ? planOf(checked.read, summary) : null,
    totals: { findings: shown.length, byLevel, hidden: all.length - shown.length },
    rules: RULES.map((r) => ({ id: r.id, level: r.severity, kind: r.kind, findings: shown.filter((f) => f.id === r.id).length })),
    config: { minSeverity, failOn, maxRoyaltyBps },
    findings: shown,
    phases: summary ? summary.phases.map((p) => ({ ...p, name: clean(p.name, 60), price: p.price === null ? null : clean(p.price, 60) })) : null,
    notes: checked.notes.map((n) => clean(n)),
    notice: NOTICE,
    result: decide(allByLevel, failOn)
  };
}

// Reads the plan and builds the report.
export async function checkFile({ path, minSeverity = 'info', failOn = 'error', maxRoyaltyBps = DEFAULT_MAX_ROYALTY_BPS, version, limits = LIMITS, base = process.cwd() }) {
  const absolute = await locateInput(path, base);
  const { text, bytes } = await readInputText(absolute, base, limits);
  const checked = checkText(text, { maxRoyaltyBps });
  return buildReport({ file: { file: displayPath(absolute, base), bytes, lines: lineCount(text) }, checked, version, minSeverity, failOn, maxRoyaltyBps });
}
