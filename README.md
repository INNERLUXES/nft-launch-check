# nft-launch-check

NFT launch check. Give it the launch plan of an NFT collection as JSON, before the mint goes live: the collection with
its name, standard (ERC-721, ERC-1155 or Solana), max supply and the reserve for the team; the mint phases, each with its
start and end in minutes or blocks, price, currency, per-wallet limit, supply cap and allow list with its size and merkle
root; the royalty in basis points and its receiver; the reveal with its placeholder and provenance hash; the metadata
freeze plan; the owner, the minter and the multisig with its threshold and signers; the withdraw address; and the links.
It reads the file and lists the mistakes of the plan an NFT consultant would catch: phase caps and reserve above the max
supply, phases that overlap or are empty, an allow list with no merkle root or more wallets than its phase holds, a public
phase with no per-wallet limit, a royalty that is not 0 to 10000 basis points, above a threshold or with no receiver, a
delayed reveal with no provenance hash, an ERC-721 whose metadata change with no ERC-4906 events, metadata never frozen,
an owner or withdraw address held by one key, a multisig threshold of 1 or above its signers, malformed or zero
addresses, a currency of another chain and links that are not https. Every finding has its id, level, message and line,
and the run exits with a code a pipeline can act on.

**It is an input to a review of the launch plan before the mint goes live: not legal or financial advice, not an audit
of the contract and not a guarantee that the mint will go as planned.** It is not legal advice and not financial advice.
It reads one file only: it contacts no chain, node, marketplace or API, fetches nothing, runs nothing, needs no key and
reads no clock, so it does not know whether the deployed contract matches the plan, whether the merkle root matches the
allow list or whether the links lead anywhere; the checks are a heuristic. A clean run means only that none of the
problems of its checks were found in the plan, and the team still has to check the contract against the plan, have
counsel review what the launch promises, and decide its prices and royalties itself.

A launch is decided in a handful of numbers and addresses long before the mint opens, and most of them cannot be changed
once it does. ERC-2981 lets a contract tell marketplaces how much royalty to pay and to whom; ERC-4906 gives an ERC-721
contract the events that make marketplaces refresh a token after a reveal. Everything else a careful team checks on a
plan comes from practice rather than from a standard: phases that fit the supply and each other, an allow list the
contract can verify, a limit per wallet on a cheap public phase, a provenance hash before a delayed reveal, a freeze of
the metadata, and an owner and a treasury behind more than one key. Caps that add up to more than the supply, a free
phase with no limit or proceeds withdrawn to a zero address are easy to miss in a review and costly once the mint is
live. This tool reads the plan on every change and points at the line.

- **One check per problem.** Twenty-four checks, each with what it looks at, what it cannot see, the public pages it
  rests on and what to change. Two are documented, by ERC-2981 and by ERC-4906 with ERC-721; the others are best
  practices of this tool, and each message says which. ERC-2981 speaks of a percentage of the sale price and names
  neither basis points nor a largest royalty, so the tool says that reading the royalty in basis points is its own choice.
- **The plan's own numbers.** The supply, caps, limits and royalty come from the plan. The one number of the tool's own,
  the threshold of `royalty-high`, is a warning that `--max-royalty-bps` moves.
- **No clock.** The start and the end of a phase are numbers of the plan, in minutes or blocks, so a plan is checked for
  the order it describes, on any day.
- **Never a secret.** The tool needs no private key, no seed and no API key. A key named for a private key or a seed, and
  a value shaped like a mnemonic, an extended private key, a private key in hex or a key in WIF, is an error, and the
  value is never shown in any report. A merkle root or a provenance hash is read as the hash it is, and its value is
  never shown either.
- **Numbers as written.** Prices and royalties are read from the characters of the file, never through a floating point
  number.
- **A strict reader of its own.** The JSON reader keeps the line and column of every value, so a finding points at the
  phase or the field; a key written twice stops the reader instead of letting two readers see two values. What the plan
  does not say is listed as a finding, never taken for a value that is fine.
- Reports as text, markdown, JSON and SARIF, with an exit code for a pipeline: `0` no finding at or above the
  `--fail-on` level, `1` a finding at or above it, `2` usage or input error.
- Plain JavaScript, no dependencies, no clock and no network.

```
npm test
```

```
tests 130
pass 128
fail 0
skipped 2
```

These are the summary lines that `npm test` prints at the end on Windows. The skipped tests are the ones that need a
symbolic link or a device (a link to a plan, and `/dev/null` named as a file); they are guarded with `process.platform`,
run on Linux and macOS, and none of them asserts a line. `npm run test:coverage` runs the same tests with coverage; their
time limits are four times wider when coverage is on.

## Quick start

Requires Node 22 or newer. There is nothing to install.

```
git clone https://github.com/INNERLUXES/nft-launch-check.git
cd nft-launch-check
node bin/nft-launch-check.js examples/bad/plan.json
```

Or without a clone, in your own project:

```
npx --yes github:INNERLUXES/nft-launch-check plan.json
```

`examples/` holds two made-up launch plans. Every name in them is made up, every address and hash is one character
written many times, and none holds a real key or seed. The bad plan, in `examples/bad`, holds a finding of nearly every
check: phase caps and a reserve of 300 that come to 5,600 for a supply of 5,000, an allow list of 1,500 wallets with no
merkle root for a phase of 1,000, a misspelt per-wallet limit, a free public phase with no limit that opens 240 minutes
before the allow list closes, a phase that ends when it starts and is priced in SOL on ERC-721, a second phase named
public with no currency, a royalty of 12.5% with no receiver, a delayed reveal with a placeholder that is not a URI and no
provenance hash, metadata never frozen and no ERC-4906 events, an owner that is not the multisig, a minter address cut
short, a seed phrase next to the owner, a multisig of threshold 1 with a signer listed twice, a withdraw to the zero
address and an http link. The good plan, in `examples/good`, passes at error, warning and info level: an ERC-721
collection of 3,000 with a reserve of 100, an allow list phase and a public phase that follow each other in blocks and
fill the supply exactly, a royalty of 5% to a receiver, a delayed reveal with a provenance hash, a freeze after the
reveal with the events of ERC-4906, and an owner and a withdraw address that are a multisig of 2 of 3.

## Usage

```
nft-launch-check <plan.json> [options]
```

```
--format <name>            text, markdown, json or sarif (default: text)
--json                     the same as --format json
--min-severity <level>     the lowest level of a finding that is shown: info, warning, error (default: info)
--fail-on <level>          the lowest level of a finding that fails the run: info, warning, error (default: error)
--max-royalty-bps <n>      the royalty above which royalty-high warns, 0 to 10000 basis points (default: 1000)
--explain                  show the points of the pages behind each finding (text, markdown and JSON)
--list-checks              list the checks with their level and kind, and exit
--help                     show the usage
--version                  show the version
```

[docs/inputs.md](docs/inputs.md) lists every field. The path in the report is relative to the folder you run the command
in, with forward slashes on every system, followed by the line.

A short plan looks like this:

```json
{
  "collection": { "name": "Harbor Example Owls", "symbol": "HXO", "standard": "ERC-721", "maxSupply": 5000, "reserve": 300 },
  "mint": {
    "timing": "minutes",
    "phases": [
      { "name": "allowlist", "start": 0, "end": 1440, "price": "0.04", "currency": "ETH", "perWalletLimit": 2, "supplyCap": 1000, "allowList": { "size": 500, "merkleRoot": "0x7777777777777777777777777777777777777777777777777777777777777777" } },
      { "name": "public", "start": 1440, "end": 4320, "price": "0.06", "currency": "ETH", "perWalletLimit": 5, "supplyCap": 3700 }
    ]
  },
  "royalty": { "bps": 500, "receiver": "0x9999999999999999999999999999999999999999" },
  "reveal": { "method": "delayed", "placeholderUri": "ipfs://bafyexample/hidden.json", "provenanceHash": "0x4444444444444444444444444444444444444444444444444444444444444444" },
  "metadata": { "freeze": "after-reveal", "erc4906": true },
  "admin": {
    "owner": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "multisig": { "address": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "threshold": 2, "signers": ["0xcccccccccccccccccccccccccccccccccccccccc", "0xdddddddddddddddddddddddddddddddddddddddd", "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"] }
  },
  "withdraw": { "address": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
  "links": { "website": "https://harbor-owls.example" }
}
```

The report of the bad example starts with what was read, the findings in one line, and the checks with the number of
findings of each; then the findings, errors first, each with what to change:

```
nft-launch-check: examples/bad/plan.json
file: examples/bad/plan.json (JSON, 24 lines, 1,764 bytes)
collection: Harbor Example Owls (HXO); ERC-721; max supply 5,000; reserve 300
mint: 4 phases timed in minutes; supply caps add up to 5,300
royalty: 1,250 basis points (12.5%); no receiver
reveal: delayed; no placeholder; no provenance hash
metadata: freeze never; ERC-4906 events not planned
admin: owner 0x1111111111111111111111111111111111111111; multisig 0x5555555555555555555555555555555555555555, 1 of 3 signers
withdraw: 0x0000000000000000000000000000000000000000
findings: 23 (12 error, 11 warning)

Checks (24)

  check                           level    kind           findings
  file-unreadable                 error    input          0
  field-missing                   error    input          1
  field-unknown                   warning  input          1
  field-invalid                   error    input          1
  field-duplicate                 error    input          2
  secret-in-file                  error    input          1
  supply-exceeded                 error    best practice  1
  phase-empty                     error    best practice  1
  phase-overlap                   warning  best practice  1
  allowlist-root-missing          error    best practice  1
  allowlist-oversubscribed        warning  best practice  1
  public-phase-unlimited          warning  best practice  1
  royalty-invalid                 error    best practice  0
  royalty-receiver-missing        error    documented     1
  royalty-high                    warning  best practice  1
  reveal-provenance-missing       warning  best practice  1
  metadata-update-event-missing   warning  documented     1
  metadata-freeze-missing         warning  best practice  1
  admin-single-key                warning  best practice  1
  multisig-threshold-low          warning  best practice  1
  multisig-threshold-unreachable  error    best practice  0
  address-malformed               error    best practice  2
  currency-mismatch               error    best practice  1
  link-invalid                    warning  best practice  1

```

A finding names its check, its level, the line of the field and what to change. With `--explain` it also gives the
points of the pages behind it and, for a best practice check, the tool's own choice:

```
  WARNING  metadata-update-event-missing   examples/bad/plan.json:15
           The metadata of this ERC-721 collection change after the mint (the reveal is delayed), but the plan does not say that the contract emits the events of ERC-4906 (erc4906 is false). A contract with that extension emits MetadataUpdate or BatchMetadataUpdate when the JSON metadata change, so that marketplaces refresh the tokens.
           fix: Add the ERC-4906 extension to the contract, emit BatchMetadataUpdate at the reveal and MetadataUpdate on each later change, and set metadata.erc4906 to true.
           basis: ERC-4906 is an optional extension of ERC-721 with two events, MetadataUpdate and BatchMetadataUpdate; a contract that has it emits one of them whenever the JSON metadata of a token, or of a run of tokens, changes, so that marketplaces show the new metadata. (ERC-4906: EIP-721 Metadata Update Extension, https://eips.ethereum.org/EIPS/eip-4906)
           basis: The optional metadata extension of ERC-721 gives each token a tokenURI, a URI that may point to a JSON file with the name, the description and the image of the token. (ERC-721: Non-Fungible Token Standard, https://eips.ethereum.org/EIPS/eip-721)
```

After the findings comes the table of the phases: the window, the price, the per-wallet limit, the cap, the size of the
allow list and whether its merkle root is set:

```
Phases (4)

  phase      start  end    price     per wallet  cap    allow list  merkle root
  allowlist  0      1,440  0.04 ETH  -           1,000  1,500       missing
  public     1,200  4,320  free      -           3,800  -           -
  holders    4,320  4,320  0.03 SOL  1           300    200         set
  PUBLIC     4,320  5,760  0.05      3           200    -           -
```

The end of the report holds the notes, if any, the notice and the result:

```
This report is an input to a review of the launch plan before the mint goes live: not legal or financial advice, not an audit of the contract and not a guarantee that the mint will go as planned.

RESULT: FAIL - 12 findings at or above error (12 error, 11 warning)
```

The good example passes:

```
  none

Phases (2)

  phase      start  end     price     per wallet  cap    allow list  merkle root
  allowlist  100    7,300   0.03 ETH  2           1,200  600         set
  public     7,300  14,500  0.05 ETH  5           1,700  -           -

This report is an input to a review of the launch plan before the mint goes live: not legal or financial advice, not an audit of the contract and not a guarantee that the mint will go as planned.

RESULT: PASS - no finding at or above error
```

## How the plan is read

1. The path is resolved against the folder you run the command in. A link, a folder, a device or a file over 16 MB is
   refused, and so is a file that is not UTF-8 (or UTF-16 with a byte order mark) or holds a null byte, with exit code
   `2` and no report.
2. The plan is read as strict JSON, whatever the name of the file. The reader keeps the line and column of every value
   and refuses a key written twice in one object.
3. Every key and value of the plan is looked at for a private key or a seed. One that is found is an error at its line,
   and its value is left out of everything that follows and never shown. A hash under `merkleRoot` or `provenanceHash`
   is read as a hash.
4. The fields of the plan are read with their lines. A key the tool does not read is a `field-unknown` finding; a missing
   field and a value of the wrong type are findings of their own, and that value is left out of the checks that need it.
5. The supply, the phases, the allow lists, the royalty, the reveal and the metadata, the roles and the addresses, the
   currencies and the links are checked.

[docs/method.md](docs/method.md) says what each check reads, and [docs/inputs.md](docs/inputs.md) lists the fields and
the scale of time.

## What it checks

| Check | Level | Kind | What it reports |
| --- | --- | --- | --- |
| `supply-exceeded` | error | best practice | phase caps and the reserve above the max supply |
| `phase-empty` | error | best practice | a phase that ends at or before its start |
| `phase-overlap` | warning | best practice | two phases open at the same time |
| `allowlist-root-missing` | error | best practice | an allow list with no merkle root, or a root of zeros |
| `allowlist-oversubscribed` | warning | best practice | an allow list whose wallets times the per-wallet limit come to more than the cap of its phase |
| `public-phase-unlimited` | warning | best practice | a public phase, free or priced, with no per-wallet limit |
| `royalty-invalid` | error | best practice | a royalty that is not a whole number of basis points from 0 to 10000 |
| `royalty-receiver-missing` | error | documented | a royalty above 0 with no receiver |
| `royalty-high` | warning | best practice | a royalty above `--max-royalty-bps`, 1000 by default |
| `reveal-provenance-missing` | warning | best practice | a delayed reveal with no provenance hash |
| `metadata-update-event-missing` | warning | documented | an ERC-721 whose metadata change after the mint with no ERC-4906 events |
| `metadata-freeze-missing` | warning | best practice | metadata never frozen |
| `admin-single-key` | warning | best practice | an owner or a withdraw address that is not the multisig |
| `multisig-threshold-low` | warning | best practice | a multisig of threshold 1 |
| `multisig-threshold-unreachable` | error | best practice | a threshold above the number of signers |
| `address-malformed` | error | best practice | an address not in the form of its chain, or the zero address |
| `currency-mismatch` | error | best practice | a currency of another chain than the standard |
| `link-invalid` | warning | best practice | a link that is not https |
| `secret-in-file` | error | input | a key or a seed; its value is never shown |
| `field-duplicate` | error | input | two phases of one name, or a signer listed twice |
| `field-invalid` | error | input | a value of the wrong type or form |
| `field-unknown` | warning | input | a key the tool does not read, often a misspelt one |
| `field-missing` | error | input | a field the checks need |
| `file-unreadable` | error | input | a file that is not strict JSON, or holds no object |

A documented check rests on ERC-2981, ERC-4906 or ERC-721. A best practice check is this tool's own choice, and its
message says "a best practice of this tool, not a rule in the pages it cites". `--list-checks` shows the kind of each
check. Some of the choices are worth a word:

- `royalty-receiver-missing` is documented: the royaltyInfo of ERC-2981 answers with the address the royalty is sent to.
  `royalty-invalid` is a best practice: ERC-2981 asks for a percentage of the sale price and names neither basis points
  nor a largest value, and the tool reads basis points and refuses more than the whole price as its own choice.
- `metadata-update-event-missing` is a warning, because ERC-4906 is optional for an ERC-721 contract; it applies to
  ERC-721 only.
- `public-phase-unlimited` reports every public phase with no per-wallet limit, free or priced: the tool cannot know
  which price is low for a collection, so it says when a phase is free and gives the price when it is not.
- `allowlist-oversubscribed` is a warning: many launches list more wallets than a phase holds on purpose.
- `phase-overlap`, `metadata-freeze-missing`, `admin-single-key` and `multisig-threshold-low` are warnings too: each can
  be a choice a team makes knowingly.
- A value of 64 hex digits under `merkleRoot` or `provenanceHash` has the shape of a private key in hex and is read as
  the hash it is; under any other key it is `secret-in-file`.

## What is not checked

[docs/limits.md](docs/limits.md) lists what the tool cannot see. Among them: the law, taxes and prices (ask counsel and
decide them yourself); whether the deployed contract matches the plan; whether the merkle root matches the allow list;
bots with many wallets and limits per transaction; how long a number of blocks takes; how marketplaces pay royalties; the
checksum of an address; currencies outside a short list; whether a link leads anywhere; and secrets in a shape the search
does not know.

## Formats

`--format text` (the default) is for a terminal. `--format markdown` is a report for a job summary or a pull request,
with a table of findings and the table of phases. `--format json` writes every finding with its `id`, `severity`,
`message`, `file`, `line`, `column`, `subject` and `fix`, what the plan says, the table of phases, and with `--explain`
the points of the pages. `--format sarif` writes SARIF 2.1.0, with the checks as rules, the plan as the artifact and a
result for each finding with its line and column, for code scanning; the table of phases has no place in it. The saved
output of the examples is in [examples/output](examples/output).

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | no finding at or above the `--fail-on` level (default `error`) |
| `1` | a finding at or above it |
| `2` | a usage error, such as an unknown option or a `--max-royalty-bps` that is not a whole number from 0 to 10000, or an input error such as a path that does not exist, a link or a folder, or a file that is not text or is too large; there is no report |

Findings below `--min-severity` are not shown, and still count for the result.

## Limits

The tool reads the one file it is given; it contacts no chain, node or marketplace and connects to nothing. A run
reports the problems of docs/method.md that the plan holds. [docs/limits.md](docs/limits.md) lists what it cannot see,
with the size limits: 16 MB for the file, 100 phases, 50 links, 100 signers, JSON nested up to 1,000 deep, prices of up
to 40 digits on each side of the point, and whole numbers up to 999,999,999,999. [docs/threat-model.md](docs/threat-model.md)
lists the risks of reading a plan from a pull request or an upload and their controls, and
[docs/secure-defaults.md](docs/secure-defaults.md) the defaults and how to run the tool in a pipeline.

## Architecture

Plain ES modules in `src/`, with no dependencies.

| File | Job |
| --- | --- |
| `src/cli.js` | the command line, the usage and the exit codes |
| `src/check.js` | reads the plan as JSON, looks for keys and seeds with the hashes set apart, reads the fields, runs the checks and builds the report of the run |
| `src/files.js` | the bounded reading of a file by its byte order mark, with no link followed |
| `src/json.js` | the JSON reader of the sibling tools: lines and columns, keys written twice, limits, a stack of its own |
| `src/secrets.js` | the search for keys and seeds by the name of a key and the shape of a value, kept from the sibling tools |
| `src/fields.js` | reading text, choices, prices, basis points, whole numbers, flags, hashes and lists with their lines |
| `src/plan.js` | the fields of the plan: the collection, the mint and its phases, the royalty, the reveal, the metadata, the admin roles, the withdraw address and the links |
| `src/decimal.js` | prices read from the characters of a file and compared with BigInt |
| `src/addresses.js` | the form of an address on an EVM chain and on Solana, and the chain of each known currency |
| `src/analyze.js` | the checks on what was read |
| `src/rules.js` | the checks, their levels and kinds, and the result |
| `src/report.js`, `src/text.js`, `src/size.js` | the text, markdown, JSON and SARIF output, the cleaning of text from the input and number formats |
| `src/data.js` | the public pages and the points the checks rest on, in this project's own words |
| `research/sources/` | text copies of the pages, as they were read |
| `tools/check.mjs`, `tools/example.mjs` | the repository checks, and the examples with their real output |

## Where the facts come from

The documented checks rest on three public pages, nothing else. Each was read before it was listed, a text copy of it
is kept in [research/sources](research/sources), and [research/sources.md](research/sources.md) has a note on each,
says what the pages do not say, and lists the lines the copies leave out.
[docs/rules-and-sources.md](docs/rules-and-sources.md) lists every check with the points of the pages it rests on, what
it cannot see and what to change. Where a check is a best practice and not a rule in the pages, it says so.

- ERC-2981, NFT Royalty Standard: https://eips.ethereum.org/EIPS/eip-2981
- ERC-4906, EIP-721 Metadata Update Extension: https://eips.ethereum.org/EIPS/eip-4906
- ERC-721, Non-Fungible Token Standard: https://eips.ethereum.org/EIPS/eip-721

## Background

A launch plan is reviewed by the people who run the launch, and the mint turns it into tokens and money that cannot be
called back. It is read line by line when a collection is first planned, when a phase or a price changes the week
before the mint, when a collection moves to another chain, or when engineers and advisers are brought in to write the
contract, the mint page and the reveal. How such work is staffed and carried out is described on the page
[NFT Consulting Services](https://innerluxes.dev/blockchain/nft-consulting).

## License

MIT
