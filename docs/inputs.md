# Inputs

The tool takes the path of the launch plan of an NFT collection, a JSON file. There is no configuration file of the
tool itself, no environment variable and no standard input; the options are on the command line. The tool never asks
for a private key, a seed, an API key or the address of a node, and needs none. Its result is an input to a review of
the launch plan before the mint goes live: not legal or financial advice, not an audit of the contract and not a
guarantee that the mint will go as planned.

```
nft-launch-check <plan.json> [--format text|markdown|json|sarif] [--json] [--min-severity <level>]
                 [--fail-on <level>] [--max-royalty-bps <n>] [--explain] [--list-checks]
```

| Option | Meaning |
| --- | --- |
| `--format <name>` | `text` (default), `markdown`, `json` or `sarif` |
| `--json` | the same as `--format json` |
| `--min-severity <level>` | the lowest level shown: `info` (default), `warning` or `error` |
| `--fail-on <level>` | the lowest level that fails the run: `info`, `warning` or `error` (default) |
| `--max-royalty-bps <n>` | the royalty above which `royalty-high` warns, a whole number of basis points from 0 to 10000 (default 1000, which is 10%); the error of `royalty-invalid` above 10000 does not move |
| `--explain` | add the points of the pages behind each finding to the text, markdown and JSON reports |
| `--list-checks` | list the checks with their level and kind, in text, markdown or JSON, and exit |
| `--help`, `--version` | the usage, the version |

Every option that takes a value takes it once. A value may not start with `--`. `-` (standard input) and an address such
as `https://...` are refused. A folder is refused: name the file. Two plans are a usage error.

## The file

The plan is always read as JSON, whatever its name. It is UTF-8, with or without a byte order mark, or UTF-16 with a
byte order mark, with LF, CRLF or CR line ends. It is strict JSON (RFC 8259): no comments, no trailing commas, no single
quotes, and no key written twice in one object. Every object may hold a key `notes` with any value, which the tool does
not read; every other key it does not read is `field-unknown`.

## Numbers, prices and the scale of time

A supply, a reserve, a cap, a per-wallet limit, the size of an allow list, a threshold, a start and an end are whole
numbers, written as JSON numbers or as text of digits, such as `5000` or `"5000"`, up to 999,999,999,999.

A price is a plain decimal number of 0 or more, written as a JSON number or as text, such as `"0.05"` or `0`: no sign, no
exponent, no thousands separator, at most 40 digits on each side of the point. It is read from its characters, never
through a floating point number. A price of 0 is a free phase.

The royalty is a number of basis points, a hundredth of a percent: `500` is 5%, `10000` the whole sale price. It is read
from its characters too; a fraction, a sign or a value above 10000 is `royalty-invalid`, and a percent sign or an
exponent is `field-invalid`.

The start and the end of each phase are whole numbers on the scale that `mint.timing` names: `minutes`, counted from a
point the plan chooses, such as the opening of the mint, or `blocks`, the block numbers of the chain. A phase is open
from its start up to, not at, its end. The tool reads no clock and no date; give every phase on the same scale.

## The plan

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
    "minter": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "multisig": { "address": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "threshold": 2, "signers": ["0xcccccccccccccccccccccccccccccccccccccccc", "0xdddddddddddddddddddddddddddddddddddddddd", "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"] }
  },
  "withdraw": { "address": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
  "links": { "website": "https://harbor-owls.example", "x": "https://x.example/harborowls" }
}
```

The top level holds `collection`, `mint`, `royalty`, `reveal`, `metadata`, `admin`, `withdraw`, `links` and `notes`.
`royalty`, `links` and `notes` may be left out; a missing part of the others is `field-missing`.

### collection

| Key | Value | Needed |
| --- | --- | --- |
| `name` | text | yes |
| `symbol` | text | no |
| `standard` | `ERC-721`, `ERC-1155` or `Solana`, in any case; `ERC721`, `EIP-721`, `EIP-1155` and `Metaplex` are read too | yes |
| `maxSupply` | a whole number of 1 or more: the most tokens the collection will ever hold | yes |
| `reserve` | a whole number of 0 or more: the tokens kept for the team, giveaways and partners; 0 when left out | no |

The standard sets the chain the addresses and the currencies are checked against: an EVM chain for ERC-721 and
ERC-1155, Solana for Solana. A standard the tool does not read is `field-invalid`, and then the addresses and the
currencies are not checked, with a note.

### mint

| Key | Value | Needed |
| --- | --- | --- |
| `timing` | `minutes` or `blocks`: the scale of the start and the end of every phase | yes |
| `phases` | a list of phases, at least one, at most 100 read | yes |

Each phase:

| Key | Value | Needed |
| --- | --- | --- |
| `name` | text, its own in the plan | yes |
| `start` | a whole number on the scale of `timing` | yes |
| `end` | a whole number on the scale of `timing`; the phase is open up to, not at, its end | yes |
| `price` | a plain decimal number of 0 or more; 0 is free | yes |
| `currency` | text, such as ETH, WETH, POL, USDC or SOL | yes, unless the price is 0 |
| `perWalletLimit` | a whole number of 1 or more: the most one wallet may mint in the phase | no |
| `supplyCap` | a whole number of 1 or more: the most the phase may mint | no |
| `allowList` | an object with `size`, a whole number of 1 or more wallets (needed), and `merkleRoot`, 64 hex digits with or without 0x | no |

A phase with an `allowList` is an allow list phase; a phase without one is open to every wallet.

### royalty

| Key | Value | Needed |
| --- | --- | --- |
| `bps` | a whole number of basis points from 0 to 10000 | yes, when the royalty is given |
| `receiver` | the address the royalty is paid to | when `bps` is above 0 |

### reveal

| Key | Value | Needed |
| --- | --- | --- |
| `method` | `instant` (the art shows at the mint) or `delayed` (a placeholder until the reveal) | yes |
| `placeholderUri` | the metadata every token shows until the reveal: `ipfs://`, `ar://`, `https://` or `data:` with the rest of the address | for a delayed reveal |
| `provenanceHash` | 64 hex digits, with or without 0x: the hash of the final metadata or art in its order | no |

### metadata

| Key | Value | Needed |
| --- | --- | --- |
| `freeze` | `at-mint`, `after-reveal` or `never`: when the metadata become permanent | yes |
| `erc4906` | true or false: whether the contract emits the MetadataUpdate and BatchMetadataUpdate events of ERC-4906 | no |

A freeze `at-mint` next to a delayed reveal is `field-invalid`: a delayed reveal changes the metadata after the mint.

### admin

| Key | Value | Needed |
| --- | --- | --- |
| `owner` | the address that owns the contract | yes |
| `minter` | the address that may mint, such as the reserve or a signer of the mint page | no |
| `multisig` | an object with `address`, `threshold` (a whole number from 1 to 1000) and `signers` (a list of addresses, at least one), each needed | no |

### withdraw

| Key | Value | Needed |
| --- | --- | --- |
| `address` | the address the proceeds of the mint are withdrawn to | yes |

### links

An object of names and web addresses, such as `website`, `x` or `discord`, each a text; at most 50 are read. The tool
never opens one.

## Addresses

On an EVM chain an address is 0x and 40 hex digits, in any case; two addresses that differ only in case are one
wallet. On Solana an address is 32 to 44 base58 characters, and case is part of it. The zero address of an EVM chain and
the system program of Solana (32 ones) are refused, because no one holds them.

## The tables

The text and markdown reports end with a table of the phases: the name, the start and the end, the price with its
currency or free, the per-wallet limit, the supply cap, the size of the allow list and whether its merkle root is set or
missing. The JSON report holds the same rows under `phases`. The value of a merkle root or a provenance hash is never
shown, only whether it is set.
