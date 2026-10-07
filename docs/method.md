# Method

This document says how the tool reads a launch plan and what each check looks at. The tool is an input to a review of
the launch plan before the mint goes live: not legal or financial advice, not an audit of the contract and not a
guarantee that the mint will go as planned. A clean run means only that none of the problems below were found in the
plan.

## Why the plan

An NFT launch is decided long before the mint opens: how many tokens there will be and how many the team keeps, the
phases with their windows, prices and limits, who is on the allow list, what the royalty is and who receives it, how and
when the art is revealed, when the metadata stop changing, who owns the contract and where the money goes. Most of the
mistakes that hurt a launch are in those numbers and addresses: phases that promise more tokens than exist, an allow list
the contract cannot check, a free public phase that bots empty in a block, a royalty with no receiver, a reveal no one
can verify, an owner that is one key on one laptop, proceeds withdrawn to an address with a typo.

All of it can be written down as one file before the contract is deployed. The tool reads that file as it is, so the
same check runs on every change, in a pipeline or by hand, and every finding points at a line.

## Reading the plan

1. The path is resolved against the folder the command runs in. A link, a folder, a device or a pipe is refused; a file
   over 16 MB is refused before it is read; a file with a null byte, or bytes that are not UTF-8 (or UTF-16 with a byte
   order mark), is refused with exit code `2` and no report.
2. The plan goes to the JSON reader of the sibling tools (`src/json.js`, kept unchanged), which keeps the line and column
   of every value and the characters every number was written with: a comment, a trailing comma, a key written twice in
   one object or text after the value is `file-unreadable`, and so is a top level that is not an object.
3. Every key and value of the plan is looked at for a key or a seed (`src/secrets.js`, kept unchanged from the sibling
   tools). A key named for a private key, a seed or a mnemonic, and a value shaped like a mnemonic, an extended private
   key, a private key in hex or a key in WIF, is `secret-in-file`. The value is marked and left out of everything that
   follows, and no report shows it. A value of 64 hex digits under `merkleRoot` or `provenanceHash` is the hash it is
   meant to be, not a key (decision 2), and is never shown either.
4. The fields are read (`src/plan.js`) as docs/inputs.md lists them. A missing field is `field-missing`, a key the tool
   does not read is `field-unknown`, and a value of the wrong type or form is `field-invalid`. The value is then left out
   of every check that needs it. Prices are read by `src/decimal.js` into a whole number and a scale, from the
   characters of the file, and the royalty into a whole number of basis points.

## The checks of the supply

- The caps of the phases and the reserve (`supply-exceeded`): the `supplyCap` of every phase that gives one, plus the
  `reserve`, above `maxSupply`; or the reserve alone above it. A phase with no cap is left out of the sum, and a note
  names it.

## The checks of the phases

The phases are compared on the scale of `mint.timing`, each open from its start up to, not at, its end.

- A phase that ends at or before its start (`phase-empty`).
- Two phases open at the same time (`phase-overlap`), reported once for each pair at the start of the later one, with
  the number of minutes or blocks they share. An empty phase is left out of this check.
- Two phases of one name, compared without case and outer spaces (`field-duplicate`).
- A phase with an allow list and no merkle root, or a root of zeros (`allowlist-root-missing`).
- An allow list whose wallets, times the per-wallet limit of the phase or times 1 when it has none, come to more than
  the cap of the phase (`allowlist-oversubscribed`). With no cap there is nothing to compare.
- A phase with no allow list and no per-wallet limit (`public-phase-unlimited`); the message says when the phase is free
  and gives the price when it is not.
- A currency of another chain than the standard (`currency-mismatch`): SOL or WSOL for ERC-721 or ERC-1155, and ETH,
  WETH, POL, MATIC, APE, AVAX, BNB or DAI for Solana. USDC and USDT are on both; another currency is not compared, and a
  note names it.

## The checks of the royalty

- A royalty that is not a whole number of basis points from 0 to 10000 (`royalty-invalid`): below 0, with a fraction,
  or above 10000, the whole sale price.
- A royalty above 0 with no receiver (`royalty-receiver-missing`).
- A royalty above the threshold of `--max-royalty-bps`, 1000 basis points by default (`royalty-high`).

A plan with no royalty runs none of these, and a note says so.

## The checks of the reveal and the metadata

- A delayed reveal with no provenance hash, or a hash of zeros (`reveal-provenance-missing`).
- An ERC-721 collection whose metadata change after the mint, because the reveal is delayed or the freeze is
  `after-reveal` or `never`, and whose plan does not set `erc4906` to true (`metadata-update-event-missing`).
- A freeze of `never` (`metadata-freeze-missing`).
- A freeze `at-mint` next to a delayed reveal is `field-invalid`: the two cannot both hold.

## The checks of the roles and the addresses

- Every address of the plan (the owner, the minter, the multisig and each signer, the receiver of the royalty and the
  withdraw address) in the form of the chain of the standard (`address-malformed`): 0x and 40 hex digits and not the zero
  address on an EVM chain, 32 to 44 base58 characters and not the system program on Solana.
- The owner and the withdraw address, each compared with the address of the multisig (`admin-single-key`); with no
  multisig in the plan both are reported. A malformed address is `address-malformed` only.
- A threshold of 1 (`multisig-threshold-low`), and a threshold above the number of signers, each counted once
  (`multisig-threshold-unreachable`). A signer listed twice is `field-duplicate`.

## The checks of the links

- A link that is not an https address with a host, or that carries a user name or a password (`link-invalid`). The tool
  reads the form with the URL parser of Node and never opens the link.

## The checks of the file

- `file-unreadable`, `field-missing`, `field-unknown`, `field-invalid`, `field-duplicate` and `secret-in-file` are about
  the file itself; they have no page behind them.

## Levels

An error is a plan that cannot launch as written or would lose tokens, royalties or proceeds: a supply that does not
add up, an empty phase, an allow list with no root, a royalty that is not a share of the price or has no receiver, a
multisig that can never act, a malformed or zero address, a currency of another chain, a secret, and a file or field
that cannot be read. A warning is a choice a team may make on purpose and should make knowingly: phases that overlap,
an allow list larger than its phase, a public phase with no limit, a high royalty, a delayed reveal with no provenance
hash, metadata without the events of ERC-4906 or never frozen, an owner or withdraw address that is one key, a threshold
of 1, an http link and a misspelt key. No check is at the level of info. `--fail-on warning` makes every warning fail the
run.

## Notes

The report adds a note when part of the plan was not checked: no royalty, phases with no cap, currencies the tool does
not know, a standard it could not read, more phases or links than it reads, or a file it could not read at all.

## What a documented check rests on

Two checks are documented: `royalty-receiver-missing` by ERC-2981 and `metadata-update-event-missing` by ERC-4906 and
ERC-721. Every other check of the plan is a best practice of this tool, not a rule in the pages it cites, and says so in
its message. [rules-and-sources.md](rules-and-sources.md) lists the points of the pages and the tool's own choice of
each check, and [../research/sources.md](../research/sources.md) says what the pages say and what they do not.
