# Secure defaults

The default run is the safe run. Nothing in the first section needs a flag, and none of it can be switched off. The rest
of the document is about what the tool cannot do for you: which plan you give it, where the output goes, and who may
change the plan it reads. A clean result is not legal or financial advice, not an audit of the contract and not a
guarantee that the mint will go as planned; it is a plan with none of the problems the checks look for, not a finding
that the launch is sound.

## How the tool behaves by default

- **Never a secret.** The tool needs no private key, no seed, no API key and no address of a node, and has no option to
  take one. A key named for a key or a seed, and a value shaped like one, anywhere in the plan, is a `secret-in-file`
  error that fails the run; the value is left out of every check and never written to a report or an error message, in
  any format. The value of a merkle root or a provenance hash is never shown either, only whether it is set.
- **Reads, never sends.** The tool reads the one plan it is given. It follows no symbolic link, fetches no URL, opens no
  link of the plan, refuses an argument that looks like an address, contacts no chain, node, marketplace or API,
  evaluates nothing and writes nothing to disk. It cannot send a transaction.
- **Every check on from the first run.** Caps and a reserve above the max supply, an empty phase, an allow list with no
  root, a royalty that is not 0 to 10000 basis points or has no receiver, a multisig that can never act, a malformed or
  zero address and a currency of another chain are errors; overlapping phases, an allow list larger than its phase, a
  public phase with no per-wallet limit, a royalty above the threshold, a delayed reveal with no provenance hash,
  metadata that change with no events of ERC-4906 or are never frozen, an owner or withdraw address that is not the
  multisig, a threshold of 1 and a link that is not https are warnings. There is no configuration file of the tool that
  could set a check off.
- **No clock.** The start and the end of a phase are numbers of the plan, in minutes or blocks. A phase with no start or
  end is a finding, never checked against the time of the run.
- **Fail closed on what it cannot read.** A file that is not strict JSON is an error finding that fails the run at the
  default `--fail-on` of `error`. A missing field and a value of the wrong type are findings of their own, so a part of
  the plan that was not read is never taken for one that is fine. A misspelt key is a warning that names the key it is
  probably meant to be. A file that is not text, is too large or is a link stops the run with exit code `2` and no
  report.
- **Numbers as written.** A price is read from the characters of the file into a whole number and a scale, never through
  a floating point number, and the royalty into a whole number of basis points; a number with an exponent or a separator
  is refused.
- **Unknown arguments are errors.** An option the tool does not know, a value that looks like an option and an option
  given twice stop the run, so a typo such as `--fail-no` cannot leave a default in place. A threshold of
  `--max-royalty-bps` that is not a whole number from 0 to 10000 is refused.
- **No pattern from the input.** No regular expression is built from the plan or from an argument.
- **Bounded work.** The reader has limits of size, nesting, values and string length, the JSON reader, the search for
  secrets and the walk for hashes work with stacks of their own, and the plan has at most 100 phases and 50 links read
  (docs/limits.md), so a large or deep file cannot exhaust the stack, the memory or the time.
- **No prototype tricks.** Keys from the plan are kept in lists and compared with the names the tool reads, never set as
  properties of an object, so `__proto__` is only a name.
- **Clean output.** Text from the input, file names, collection names, phase names, addresses and links included, has
  control characters, line separators and direction controls replaced and its length capped before it reaches a report
  or an error message; the markdown report also escapes what markdown gives a meaning to.
- **The same input gives the same output.** No clock, no zone, no locale and no random number
  ([decision 1](decisions/0001-read-no-clock-and-keep-dates-out-of-the-repository.md)).
- **No dependencies.** Node 22 or newer and nothing else.

## Settings that make the check stricter

- **`--fail-on warning`.** Overlapping phases, an allow list larger than its phase, a public phase with no limit, a high
  royalty, a reveal with no provenance hash, metadata without the events or a freeze, an owner or withdraw address that
  is one key, a threshold of 1, an http link and misspelt keys fail the run too. Use it on the plan that is about to be
  deployed, and record in the review each warning the team keeps on purpose.
- **A lower `--max-royalty-bps`.** Set the threshold to what the marketplaces of the collection honour or what the team
  promised its buyers, so that a royalty above it is a warning.
- **Caps and limits in the plan.** Give every phase a `supplyCap` and a `perWalletLimit`; a cap the plan does not give
  is a sum that does not run, and a note says so.

## Running it in a pipeline

```yaml
permissions:
  contents: read
steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
    with:
      node-version: 22
  - name: NFT launch check
    run: npx --yes github:INNERLUXES/nft-launch-check launch/plan.json --format markdown >> "$GITHUB_STEP_SUMMARY"
```

- Give the job read access to the contents and nothing more. The tool needs no secret, no API key and no access to a
  node; never give it one.
- Pin every action to a full commit, as above, and pin the tool to a release commit or a tag you have read, because
  `npx` runs what it downloads.
- Run the tool on the exact plan the contract is deployed from, and check the deployed contract against the plan before
  the mint opens. A plan edited after the check is not what was checked.
- Keep the plan of an unannounced collection out of public repositories: it holds the addresses of the team, the size
  of the allow list and the prices before they are public. Run the tool where the plan already is, and keep its reports
  with the same care, because a finding quotes names, addresses and numbers of the plan.
- Do not hide the exit code with a trailing `|| true`. To keep the report without failing, keep `--fail-on` at `error`
  and keep the SARIF or JSON report as an artifact of the job.
- Treat a report built from a plan you do not trust as untrusted data.
- If the tool ever reports `secret-in-file`, treat the key or seed as exposed: remove it from the plan and from every
  place the plan was copied to, and move what it controls to a new key. The tool does not show the value, but the file
  itself was readable to everyone with access to it.

## Protecting the launch

A mint moves tokens and money as soon as it opens, and many of its settings cannot be changed afterwards. Keep the
plan in code, review a change to it like code, keep the owner and the proceeds behind a multisig with more than one
signer, publish the provenance hash before the mint, and have counsel and the team review what the plan promises to
buyers. Check every change of the plan with this tool in that process: it reads the plan as the file writes it, not
whether the contract does what the plan says.

## SSDF

The repository is checked against NIST SP 800-218 (SSDF) in its own pipeline and before every release, with
`ssdf-repo-check` pinned to its release commit. The evidence it looks for is in these files:

| Practice | Evidence in this repository |
| --- | --- |
| PO.1 Define security requirements | CONTRIBUTING.md, docs/secure-defaults.md |
| PO.2 Roles and responsibilities | .github/CODEOWNERS |
| PO.3 Toolchain | .github/workflows/ci.yml, codeql.yml, release.yml |
| PO.4 Criteria for security checks | CodeQL with the security-extended queries, the SSDF gate in ci.yml and release.yml |
| PO.5 Secure environments | a `permissions:` block in every workflow, actions pinned to commits |
| PS.1 Protect the code | .gitignore for keys and `.env`, `npm run check` for committed secrets |
| PS.2 Integrity of releases | SHA-256 checksums and a build provenance attestation in release.yml |
| PS.3 Archive and provenance | a CycloneDX SBOM and the CHANGELOG with every release |
| PW.1 Design for security | docs/threat-model.md |
| PW.2 Review the design | docs/decisions |
| PW.4 Reuse secure components | no runtime dependencies, a lock file, Dependabot |
| PW.5 Secure coding | CONTRIBUTING.md, `npm run check` |
| PW.6 Build settings | `npm ci` from the lock file |
| PW.7 Code review | the pull request template and CODEOWNERS |
| PW.8 Testing | `npm test` on Linux, Windows and macOS with Node 22 and 24, `npm run test:coverage`, hostile input tests |
| PW.9 Secure defaults | this document |
| RV.1 Find vulnerabilities | SECURITY.md, Dependabot |
| RV.2 Respond to vulnerabilities | SECURITY.md |
