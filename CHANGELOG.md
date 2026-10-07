# Changes

## 1.0.0

First release.

- Reads the launch plan of an NFT collection as JSON before the mint goes live and lists with its line every mistake of
  the plan the checks know, as an input to a review: not legal or financial advice, not an audit of the contract and
  not a guarantee that the mint will go as planned. It reads the file, contacts no chain, node, marketplace or API,
  fetches nothing, opens no link, runs nothing, needs no key, follows no symbolic link and reads no clock.
- Reads the collection with its name, symbol, standard (ERC-721, ERC-1155 or Solana), max supply and reserve; the mint
  with its timing in minutes or blocks and its phases, each with its name, start, end, price, currency, per-wallet
  limit, supply cap and allow list with its size and merkle root; the royalty in basis points and its receiver; the
  reveal with its method, placeholder and provenance hash; the metadata with its freeze plan and whether the contract
  emits the events of ERC-4906; the owner, the minter and the multisig with its threshold and signers; the withdraw
  address; and the links.
- The start and the end of a phase are whole numbers on the scale the plan names; the tool compares them and never reads
  the clock or turns one into a date.
- The strict JSON reader of the sibling tools, kept unchanged, with no dependency and no recursion, with the line and
  column of every value, a key written twice as a finding, and limits of size, nesting, values and string length.
  Prices are read from the characters of the file with BigInt, never through a floating point number, and the royalty
  as a whole number of basis points.
- A search for keys and seeds in the plan before anything else is read, kept unchanged from the sibling tools: each one
  found is an error whose value is left out of every check and never shown. A hash of 64 hex digits under `merkleRoot`
  or `provenanceHash` is read as the hash it is, and the value of either is never shown.
- Twenty-four checks in two levels, each documented or a best practice of the tool and saying which: caps of the phases
  and a reserve above the max supply (`supply-exceeded`); a phase that ends at or before its start (`phase-empty`); two
  phases open at once (`phase-overlap`); an allow list with no merkle root or a root of zeros
  (`allowlist-root-missing`); an allow list whose wallets times the per-wallet limit come to more than the cap of its
  phase (`allowlist-oversubscribed`); a public phase with no per-wallet limit (`public-phase-unlimited`); a royalty that
  is not a whole number of basis points from 0 to 10000 (`royalty-invalid`), a royalty above 0 with no receiver, per
  ERC-2981 (`royalty-receiver-missing`), and a royalty above the threshold of `--max-royalty-bps`, 1000 by default
  (`royalty-high`); a delayed reveal with no provenance hash (`reveal-provenance-missing`); an ERC-721 whose metadata
  change after the mint with no events of ERC-4906 (`metadata-update-event-missing`); metadata never frozen
  (`metadata-freeze-missing`); an owner or a withdraw address that is not the multisig (`admin-single-key`); a multisig
  threshold of 1 (`multisig-threshold-low`) or above its signers (`multisig-threshold-unreachable`); an address that is
  not in the form of its chain or is the zero address (`address-malformed`); a currency of another chain
  (`currency-mismatch`); a link that is not https (`link-invalid`); and six checks about the file
  (`file-unreadable`, `field-missing`, `field-unknown`, `field-invalid`, `field-duplicate`, `secret-in-file`).
- A table of the phases with their windows, prices, limits, caps and allow lists, in every format but SARIF.
- Reports as text, markdown, JSON and SARIF 2.1.0; every finding has its id, severity, message, file, line, column and
  subject; `--min-severity`, `--fail-on`, `--max-royalty-bps`, `--explain` with the points of the pages behind each
  finding, and `--list-checks`. Exit code `0` when no finding is at or above the fail-on level, `1` when one is, `2` for
  a usage or input error, with no result.
- Plain text copies of the public pages the documented checks rest on, under research/sources, with a note on each:
  ERC-2981, ERC-4906 and ERC-721.
- Release packages come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation, after the SSDF gate
  of the repository.
