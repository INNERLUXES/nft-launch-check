# Limits

The tool is not legal advice and not financial advice. It reads the launch plan of an NFT collection, and its result is
an input to a review of the launch plan before the mint goes live: not legal or financial advice, not an audit of the
contract and not a guarantee that the mint will go as planned. A clean run means only that none of the problems in
[method.md](method.md) were found in the plan.

## What it cannot see

- **The law and the money.** Whether a collection may be sold where it is sold, how its sales and royalties are taxed,
  whether its price is right and whether a royalty will be paid are questions for counsel and for the team. The tool
  says nothing on any of them.
- **The contract.** It contacts no chain, so it cannot tell whether the deployed contract matches the plan: its max
  supply, its phases, its prices and limits, its owner, its royalty, whether it emits the events of ERC-4906 or can
  freeze its metadata. Check the deployed contract against the plan before the mint opens.
- **The allow list behind a root.** A merkle root is checked for its form and for zeros. The tool cannot rebuild the
  tree, so a root built from the wrong list, or with the wrong encoding of a leaf, passes. A contract that checks a
  signature instead of a root is reported as having no root, and the finding says what to do.
- **Bots and people.** A per-wallet limit is read as a number. A limit per transaction, a check of the mint page, and one
  person behind many wallets are not seen, and the tool does not know which price is low for a collection, so every
  public phase with no limit is reported.
- **Time.** The start and the end of a phase are numbers of the plan on one scale, minutes or blocks. The tool reads no
  clock and no chain, so it cannot tell whether a phase is past, or how many minutes a number of blocks takes. A plan
  that mixes the scales gives wrong results, and the tool cannot tell.
- **Royalties in practice.** ERC-2981 signals a royalty and leaves payment to the marketplaces. The tool reads the
  royalty in basis points, its own choice of unit; a contract with another denominator, a royalty set per token or the
  creators and shares of a Metaplex collection are not seen.
- **Provenance.** A provenance hash is checked for its form and for zeros, never against the metadata or the art, and
  the tool cannot see whether it was published before the mint.
- **Owners and keys.** The owner and the withdraw address are compared with the multisig of the plan. An owner that is a
  multisig the plan does not name, a contract with a time lock or a key in hardware is reported as one key; the minter is
  not compared, because it is often the key of a server that signs mints.
- **Addresses.** An address is checked for its form only, with no checksum of EIP-55 and no lookup, so a well formed
  address of the wrong wallet passes. The two forms the tool knows are those of an EVM chain and of Solana.
- **Currencies.** The chain of a currency is known for ETH, WETH, POL, MATIC, APE, AVAX, BNB, DAI, SOL, WSOL, USDC and
  USDT; another currency is not compared, and a note names it. Which chain of the EVM family the collection is on is
  not seen.
- **Links.** A link is checked for its form only and never opened.
- **What a misspelt key meant.** A key the tool does not read is reported and left out. A misspelt `perWalletLimit`
  makes a phase look as if it had none; read the `field-unknown` findings first.
- **Every secret.** The search for keys and seeds knows them by the name of their key and by their shape: a mnemonic of
  12 to 24 lowercase English words, an extended private key, 64 hex digits or a key in WIF. A value of 64 hex digits
  under `merkleRoot` or `provenanceHash` is read as a hash and cannot be told apart from a private key pasted there; it is
  never shown. A secret split over fields, encoded another way or written under another name is not caught, and API keys
  and passwords are not looked for by their shape. A clean run does not say that the plan holds no secret.

## What the reader does not read

[inputs.md](inputs.md) lists the fields. A file that is not strict JSON is one `file-unreadable` finding, and nothing
else in it is checked. A value that is missing, of the wrong type or a secret is a finding, and the checks that need it
leave it out: a clean run says nothing about that part. YAML, CSV, spreadsheets, prices with a thousands separator or a
decimal comma, numbers with an exponent and dates are not read.

## Size limits

| Limit | Value |
| --- | --- |
| file size | 16 MB |
| phases of the mint | 100; the rest are not read, and a note says so |
| links | 50; the rest are not read, and a note says so |
| signers of the multisig | 100 |
| JSON nesting of objects and arrays | 1,000 levels |
| JSON values (nodes) in a file | 2,000,000 |
| a JSON string | 1,000,000 characters |
| a price | 40 digits on each side of the point |
| a supply, a cap, a limit, a size, a start or an end | 0 or 1 to 999,999,999,999 |
| a threshold | 1 to 1,000 |
| a royalty | 0 to 10,000 basis points |
| a text the search for keys looks at | 4,000 characters |

Input past a limit is a `file-unreadable` or `field-invalid` finding, a note, or, for the file size, an input error with
exit code `2`. The tool never passes a run because something could not be read.

## What a run does not do

It never reads or asks for a private key, a seed or an API key, contacts no chain, node, marketplace or API, fetches
nothing and connects to nothing, opens no link, runs no program, evaluates nothing it reads, reads no clock and no
locale, follows no symbolic link and writes nothing to disk. [threat-model.md](threat-model.md) lists the risks of
reading a plan from a pull request or an upload and their controls.
