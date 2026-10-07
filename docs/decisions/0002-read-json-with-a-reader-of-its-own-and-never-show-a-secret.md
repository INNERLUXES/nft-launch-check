# 2. Read JSON with a reader of its own, and never show a secret

## Status

Accepted

## Context

A launch plan is a JSON file. `JSON.parse` would read it, but it keeps no line and column of a value, so a finding could
not point at the phase or the field to change; it takes the last of two values written under one key without a word,
so two readers of the same plan could see two supplies; it builds objects whose keys come from the file; and it turns
every number into a floating point number, so that a price of 0.1 and one of 0.2 do not add up to 0.3.

An NFT launch is run from wallets with keys, and a careless plan can hold a secret: the seed of the deployer pasted next
to the owner, the private key of the minter in a note. A tool that reads such a file and echoes its values in a report
would copy the secret into a pipeline log, a pull request comment or a SARIF upload, where many more people can read it.

A launch plan also holds values of 32 bytes that are not secrets: the merkle root of an allow list and the provenance
hash of a delayed reveal. Written as 64 hex digits, they have exactly the shape the search for secrets of the sibling
tools reads as a private key in hex.

A plan that is not complete (a phase with no price, a misspelt per-wallet limit) would also be read as if it were, and
a check could take a value it never saw for one that is fine.

## Decision

1. The plan is read by src/json.js, the reader of the sibling tools for strict JSON, kept unchanged, with the line and
   column of every value, a key written twice as an error, and limits of nesting, values and string length. It does not
   recurse. Every number keeps the characters it was written with.
2. Prices are read from the characters of the file by src/decimal.js, kept from the sibling tools, into a whole number
   and a scale. The royalty is read the same way as a whole number of basis points. A number with an exponent, a sign
   where none belongs or a separator is a finding, never rounded.
3. The tool never asks for a private key, a seed or an API key: it checks the plan as written. Before the plan is read,
   src/secrets.js, kept unchanged from the sibling tools, walks every key and value of it. A key named for a key or a
   seed, and a value shaped like a mnemonic, an extended private key, a private key in hex or a key in WIF, is a
   `secret-in-file` error at its line. The value is marked, the reader leaves it out as if it were not there, and no
   report and no error message shows it, in any format. An address of 40 hex digits is never taken for a key.
4. A value of 64 hex digits, with or without 0x, under the key `merkleRoot` or `provenanceHash` is read as the hash it is
   meant to be: src/check.js drops the finding of the search for that one value and reads it as a hash. The tool never
   shows the value of either key in any report, only whether it is set, so a key pasted there by mistake is not echoed
   either. Under any other key the same value is still a `secret-in-file` error, and a mnemonic or a key in WIF under
   these keys is still one too.
5. Every field the checks need and the plan does not give, every key the tool does not read and every value of the
   wrong type is returned with its line and shown as a finding. A check never takes a value it did not read for one that
   is fine.
6. The checks are a heuristic over the plan as written, and every report says so; docs/method.md says what each check
   reads and docs/limits.md what it cannot see. The result is an input to a review of the launch plan before the mint
   goes live: not legal or financial advice, not an audit of the contract and not a guarantee that the mint will go as
   planned.

## Consequences

- The tool needs no install and no network, and the same plan gives the same report on Linux, Windows and macOS.
- A finding points at the line of the field or the phase it is about.
- A secret in the plan fails the run and is never copied into the output. The shapes are loose, so a value that only
  looks like a secret, such as a note of twelve short lowercase words, is reported too; that is the safe side.
- A private key pasted under `merkleRoot` or `provenanceHash` cannot be told apart from a hash and is not reported; it is
  not shown either, and docs/limits.md says so.
- YAML, CSV and spreadsheets are not read (docs/limits.md).
