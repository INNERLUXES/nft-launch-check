# Rules and sources

Every check of the tool, with what it looks at, the points of the public pages it rests on, what it cannot see, and what to change. The points are in this project's own words and are the ones the reports show with `--explain`; each page was fetched and read before it was listed, and a copy of its text is kept under [research/sources](../research/sources) so that a point can be checked against the page it came from. [../research/sources.md](../research/sources.md) has a note on each page.

The tool is an input to a review of the launch plan before the mint goes live: not legal or financial advice, not an audit of the contract and not a guarantee that the mint will go as planned. Only two checks are documented by the pages: `royalty-receiver-missing` by ERC-2981 and `metadata-update-event-missing` by ERC-4906 and ERC-721. Every other check that is not about the file itself is a best practice of this tool, not a rule in the pages it cites, and says so in its message and in its own entry below with the reason. ERC-2981 speaks of a percentage of the sale price and names neither basis points nor a largest royalty; the tool reads the royalty in basis points and treats 10000 as the whole price as its own choice.

## The pages

- ERC-2981: NFT Royalty Standard: https://eips.ethereum.org/EIPS/eip-2981 (copy: `research/sources/eip-2981-nft-royalty-standard.txt`)
- ERC-4906: EIP-721 Metadata Update Extension: https://eips.ethereum.org/EIPS/eip-4906 (copy: `research/sources/eip-4906-metadata-update-extension.txt`)
- ERC-721: Non-Fungible Token Standard: https://eips.ethereum.org/EIPS/eip-721 (copy: `research/sources/eip-721-non-fungible-token.txt`)

## file-unreadable

- Level: error
- Kind: a problem with the file itself; it has no setting to lower
- Looks at: the plan is not JSON the reader can follow, or its top level is not an object, so nothing in it was read.
- Cannot see: It stops at the first place that is not strict JSON, or at a top level that is not an object, so nothing in the file is checked; a plan written as YAML, CSV or a spreadsheet is not read.
- What to change: Write the launch plan as one JSON object (docs/inputs.md); fix the line named.
- Points of the pages: none; this check is about the file itself.

## field-missing

- Level: error
- Kind: a problem with the file itself; it has no setting to lower
- Looks at: a field the checks need is not in the plan: a part of it, the name, standard or max supply of the collection, the timing or the phases of the mint, the name, start, end, price or currency of a phase, the size of an allow list, the reveal method or the placeholder of a delayed reveal, the freeze plan, the owner, or the withdraw address.
- Cannot see: It names the field and the part or the phase that lacks it; it does not guess the value, and the checks that need the field do not run for that part or phase.
- What to change: Add the field named; docs/inputs.md lists what the plan needs.
- Points of the pages: none; this check is about the file itself.

## field-unknown

- Level: warning
- Kind: a problem with the file itself; it has no setting to lower
- Looks at: a key the tool does not read, often a misspelt one; its value was left out of every check.
- Cannot see: It cannot tell what a misspelt key was meant to say; it names a known key when one differs only in case or separators, starts the same or is one letter apart, and the value is left out of every check.
- What to change: Correct the spelling to a field of docs/inputs.md, or remove it.
- Points of the pages: none; this check is about the file itself.

## field-invalid

- Level: error
- Kind: a problem with the file itself; it has no setting to lower
- Looks at: a value of the wrong type or form: text where a whole number belongs, a price that is not a plain decimal of 0 or more, a standard, timing, reveal method or freeze plan the tool does not know, a hash that is not 64 hex digits, a placeholder that is not a URI, or a freeze at mint next to a delayed reveal.
- Cannot see: It names the value and the form it needs; the value is left out of the checks that need it. It reads the standard, the timing, the reveal method and the freeze plan from short lists of words, and a hash only for its form of 64 hex digits.
- What to change: Write the value as docs/inputs.md shows: text for names, addresses and choices, whole numbers for supplies, limits, starts and ends, plain decimal numbers for prices, true or false for flags.
- Points of the pages: none; this check is about the file itself.

## field-duplicate

- Level: error
- Kind: a problem with the file itself; it has no setting to lower
- Looks at: two phases share a name (compared without case and outer spaces), or a signer of the multisig is listed twice, so a reader of the plan cannot tell them apart.
- Cannot see: It compares the names of the phases without case and outer spaces, and the signers of the multisig as addresses; two names that differ in one letter are not the same to it.
- What to change: Give every phase a name of its own, and list each signer once.
- Points of the pages: none; this check is about the file itself.

## secret-in-file

- Level: error
- Kind: a problem with the file itself; it has no setting to lower
- Looks at: the plan holds a private key, a seed or a mnemonic, under a key named for one or as a value shaped like one; the tool never reads it and never shows it.
- Cannot see: It knows a key or a seed by the name of its key and by its shape: a mnemonic of 12 to 24 lowercase words, an extended private key, 64 hex digits or a key in WIF. A value of 64 hex digits under merkleRoot or provenanceHash is read as the hash it is meant to be and cannot be told apart from a key; the tool never shows those values. A secret split over fields or encoded another way is not caught.
- What to change: Remove the value from the plan and from wherever the plan was copied, treat it as exposed and move what it controls to a new key. A launch plan names wallets by their public address only.
- Points of the pages: none; this check is about the file itself.

## supply-exceeded

- Level: error
- Kind: best practice
- Looks at: the supply caps of the phases and the reserve for the team add up to more than the max supply, or the reserve alone is above it.
- Cannot see: It adds up the supplyCap of each phase that gives one and the reserve, and compares the sum with maxSupply; a phase with no cap is left out of the sum and a note says so. It cannot see whether the contract stops at its max supply, mints the reserve from the same supply, or lets a later phase take what an earlier one left.
- What to change: Lower the caps of the phases or the reserve until they fit in the max supply, or raise the max supply if the contract and the plan of the collection allow it.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: adding up the caps of the phases and the reserve against the max supply is a best practice of this tool, not a rule in the pages it cites; a contract that stops at its max supply makes the last phase sell out early, and one that does not mints more than the collection promised.

## phase-empty

- Level: error
- Kind: best practice
- Looks at: a phase ends at or before its start, so it is open for no minute or block.
- Cannot see: It compares the start and the end of a phase as whole numbers of the plan; it reads no clock and cannot tell whether a block number or a minute is in the past.
- What to change: Set the end of the phase after its start, in the timing of the plan.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: refusing a phase that ends at or before its start is a best practice of this tool, not a rule in the pages it cites; such a phase is almost always a start and an end written the wrong way round or copied from another phase.

## phase-overlap

- Level: warning
- Kind: best practice
- Looks at: two phases are open at the same time, so a wallet may mint in both, and the price and the limit it meets depend on which it calls.
- Cannot see: It compares every pair of phases as windows open from the start up to, not at, the end, on the scale of the plan; it cannot see whether the contract lets a wallet mint in two phases at once, or which phase it applies when two are open.
- What to change: Start each phase when the one before it ends, or say in the plan why two phases share a window.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: asking for phases that follow one another is a best practice of this tool, not a rule in the pages it cites; some launches run two phases at once on purpose, so it is a warning.

## allowlist-root-missing

- Level: error
- Kind: best practice
- Looks at: a phase with an allow list has no merkle root, or a root of zeros, so the contract cannot tell a listed wallet from any other.
- Cannot see: It reads whether the plan gives a merkle root of the form of a hash, and whether it is all zeros; it cannot build the tree, check that the root matches the list, or see a contract that checks a signature instead.
- What to change: Build the merkle tree of the allow list and set its root in the plan before the phase opens; if the contract checks a signature instead of a root, say so in the notes of the phase and keep the finding in the review.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: asking for a merkle root for each allow list is a best practice of this tool, not a rule in the pages it cites; the common way to hold an allow list in a contract is the root of a merkle tree of the listed wallets, and a phase with none is open to everyone or to no one.

## allowlist-oversubscribed

- Level: warning
- Kind: best practice
- Looks at: the wallets of an allow list times the per-wallet limit come to more than the supply cap of its phase, so some listed wallets may find the phase sold out.
- Cannot see: It multiplies the size of the list by the per-wallet limit, or by 1 when the phase has none, and compares the product with the cap of the phase; it cannot see how many listed wallets will mint, or a list whose wallets have limits of their own.
- What to change: Raise the supply cap of the phase, lower the per-wallet limit or the size of the list, or tell the listed wallets that a place on the list does not hold a token.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: comparing the allow list and its per-wallet limit with the cap of the phase is a best practice of this tool, not a rule in the pages it cites; many launches list more wallets than the phase holds on purpose, so it is a warning.

## public-phase-unlimited

- Level: warning
- Kind: best practice
- Looks at: a phase with no allow list has no per-wallet limit, so one wallet or a set of bots can mint as much of it as it can pay for; a free phase says so.
- Cannot see: It reads whether a phase without an allow list gives a per-wallet limit; it cannot see a limit per transaction, a bot check of the contract or of the mint page, or one person behind many wallets, and it does not know which price is low for a collection.
- What to change: Set perWalletLimit on every public phase, above all on a free or cheap one, and keep in mind that a limit per wallet does not stop one person with many wallets.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: asking for a per-wallet limit on a public phase is a best practice of this tool, not a rule in the pages it cites; the tool cannot know which price is low for a collection, so it reports every public phase with no limit and says when the phase is free.

## royalty-invalid

- Level: error
- Kind: best practice
- Looks at: the royalty is not a whole number of basis points from 0 to 10000: below 0, with a fraction, or above 10000, which would be more than the whole sale price.
- Cannot see: It reads the royalty as basis points, the unit the plan names, from the characters of the file; it cannot see the unit the contract uses, such as a denominator other than 10000, or a royalty set per token.
- What to change: Write the royalty in basis points, a whole number from 0 to 10000, where 100 is 1% and 10000 the whole price; 5% is 500.
- Points of the pages:
  - Under ERC-2981 the royalty owed on a sale is worked out as a share of the sale price and paid in the unit of the sale; the page speaks of a percentage, and names no unit such as basis points and no largest value. (ERC-2981: NFT Royalty Standard, https://eips.ethereum.org/EIPS/eip-2981)
- The tool's own choice: reading the royalty as a whole number of basis points and refusing more than 10000 is a best practice of this tool, not a rule in the pages it cites; ERC-2981 asks for a royalty worked out as a percentage of the sale price and names neither basis points nor a largest value, and a royalty above the whole price is never what a plan means.

## royalty-receiver-missing

- Level: error
- Kind: documented
- Looks at: the plan sets a royalty above 0 but names no receiver, though the royaltyInfo of ERC-2981 answers with the address the royalty is sent to.
- Cannot see: It reads whether the plan names a receiver next to a royalty above 0; it cannot see whether the receiver is a contract that can take the payment or splits it, and on Solana the royalty of Metaplex is paid to creators the plan does not list.
- What to change: Name the receiver of the royalty, such as the multisig of the team or a contract that splits it, or set the royalty to 0.
- Points of the pages:
  - The royaltyInfo function of ERC-2981 answers a marketplace with two values for a sale: the address the royalty is to be sent to, and the amount. (ERC-2981: NFT Royalty Standard, https://eips.ethereum.org/EIPS/eip-2981)

## royalty-high

- Level: warning
- Kind: best practice
- Looks at: the royalty is above the threshold of --max-royalty-bps (1000 basis points, 10%, by default).
- Cannot see: It compares the royalty with the threshold of --max-royalty-bps; it cannot see what the marketplaces of the collection honour, which is a choice of each marketplace.
- What to change: Check the royalty against what the marketplaces the collection sells on honour and what its buyers expect, or raise --max-royalty-bps for a collection that sets a higher royalty on purpose.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: warning above a threshold of 10% is a best practice of this tool, not a rule in the pages it cites; ERC-2981 sets no limit, and the threshold can be changed with --max-royalty-bps.

## reveal-provenance-missing

- Level: warning
- Kind: best practice
- Looks at: a delayed reveal has no provenance hash, so collectors cannot check that the order of the art was fixed before the mint.
- Cannot see: It reads whether a delayed reveal gives a provenance hash of 64 hex digits that is not all zeros; it cannot check the hash against the metadata, or see whether it was published before the mint.
- What to change: Hash the final metadata or images in their order, publish the hash before the mint opens and set it in the plan as provenanceHash.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: asking for a provenance hash before a delayed reveal is a best practice of this tool, not a rule in the pages it cites; no cited page asks for one, and without it the team could choose which tokens get which art after seeing who minted them.

## metadata-update-event-missing

- Level: warning
- Kind: documented
- Looks at: an ERC-721 collection whose metadata changes after the mint (a delayed reveal, or a freeze after the reveal or never) does not plan the events of ERC-4906, so marketplaces may keep showing the placeholder.
- Cannot see: It reads the reveal method, the freeze plan and the flag erc4906 of the plan, for ERC-721 only; it cannot see whether the contract emits the events, or a change of the metadata that the plan does not describe. ERC-4906 is an extension of ERC-721, so an ERC-1155 or Solana collection is not checked.
- What to change: Add the ERC-4906 extension to the contract, emit BatchMetadataUpdate at the reveal and MetadataUpdate on each later change, and set metadata.erc4906 to true.
- Points of the pages:
  - ERC-4906 is an optional extension of ERC-721 with two events, MetadataUpdate and BatchMetadataUpdate; a contract that has it emits one of them whenever the JSON metadata of a token, or of a run of tokens, changes, so that marketplaces show the new metadata. (ERC-4906: EIP-721 Metadata Update Extension, https://eips.ethereum.org/EIPS/eip-4906)
  - The optional metadata extension of ERC-721 gives each token a tokenURI, a URI that may point to a JSON file with the name, the description and the image of the token. (ERC-721: Non-Fungible Token Standard, https://eips.ethereum.org/EIPS/eip-721)

## metadata-freeze-missing

- Level: warning
- Kind: best practice
- Looks at: the plan never freezes the metadata, so the owner can change the art and the traits of every token after the sale.
- Cannot see: It reads the freeze plan as a word; it cannot see whether the contract can freeze the metadata, or whether the metadata are held where they cannot change, such as content addresses.
- What to change: Plan a freeze, at the mint or after the reveal, that makes the metadata permanent, or say to collectors that the metadata stays open to change and why.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: asking for a freeze of the metadata is a best practice of this tool, not a rule in the pages it cites; some collections change on purpose, so it is a warning.

## admin-single-key

- Level: warning
- Kind: best practice
- Looks at: the owner of the contract or the withdraw address is not the multisig of the plan, so one key can change the contract or receive the proceeds of the mint.
- Cannot see: It compares the owner and the withdraw address with the address of the multisig of the plan; it cannot see whether the owner is itself a multisig the plan does not name, a contract with a time lock, or a key held in hardware, and the minter, often a key of a server, is not compared.
- What to change: Make the owner and the withdraw address a multisig wallet that needs more than one signer, and set it in admin.multisig.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: asking for more than one key behind the owner and the proceeds is a best practice of this tool, not a rule in the pages it cites; the cited pages do not say how a contract is owned.

## multisig-threshold-low

- Level: warning
- Kind: best practice
- Looks at: the multisig needs only one signature, so any one of its signers acts alone.
- Cannot see: It reads the threshold the plan gives; it cannot see the threshold of the deployed multisig or who holds its keys.
- What to change: Set the threshold to at least 2, and to a majority of the signers for the owner of the contract.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: asking for a threshold above 1 is a best practice of this tool, not a rule in the pages it cites; a multisig of threshold 1 is as strong as its weakest key.

## multisig-threshold-unreachable

- Level: error
- Kind: best practice
- Looks at: the threshold of the multisig is above the number of its signers, so it can never act.
- Cannot see: It counts the signers the plan lists, each once; it cannot see signers the plan leaves out.
- What to change: Lower the threshold to the number of signers or fewer, or add the missing signers.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: comparing the threshold with the signers is a best practice of this tool, not a rule in the pages it cites; the cited pages say nothing of multisig wallets.

## address-malformed

- Level: error
- Kind: best practice
- Looks at: an address of the owner, the minter, the multisig or a signer, the royalty receiver or the withdraw address that is not in the form of its chain (0x and 40 hex digits for ERC-721 and ERC-1155, 32 to 44 base58 characters for Solana), or is the zero address.
- Cannot see: It checks the form of an address for the chain of the standard: 0x and 40 hex digits, not the zero address, for ERC-721 and ERC-1155, and 32 to 44 base58 characters, not the system program, for Solana. It checks no checksum of mixed case and looks nothing up, so a well formed address of the wrong wallet passes.
- What to change: Copy the address again from the wallet; send nothing to a zero address, which no one holds.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: checking the form of an address is a best practice of this tool, not a rule in the pages it cites; the form is the one wallets write on each chain, no page is saved for it, and a typo or a zero address in a plan sends the royalties or the proceeds where no one can reach them.

## currency-mismatch

- Level: error
- Kind: best practice
- Looks at: the currency of a phase belongs to another chain than the standard of the collection, such as SOL for an ERC-721 or ETH for Solana.
- Cannot see: It knows the chain of a short list of currencies (ETH, WETH, POL, MATIC, APE, AVAX, BNB and DAI on an EVM chain, SOL and WSOL on Solana, USDC and USDT on both) and leaves the others alone with a note; it cannot see which chain of the EVM family the collection is on.
- What to change: Price the phase in a currency of the chain of the collection, or correct the standard.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: matching the currency of a phase with the chain of the standard is a best practice of this tool, not a rule in the pages it cites; the tool knows a short list of currencies and leaves the others alone.

## link-invalid

- Level: warning
- Kind: best practice
- Looks at: a link of the plan is not an https address with a host, or carries a user name or a password.
- Cannot see: It reads the form of each link with the URL parser of Node; it never opens a link, so a link to a page that does not exist or belongs to someone else passes.
- What to change: Write each link as https:// and the host and path of the page; the tool never opens it.
- Points of the pages: none; no page saved for this tool says this rule.
- The tool's own choice: asking for https links is a best practice of this tool, not a rule in the pages it cites; a plan whose links are written wrong sends collectors to the wrong page on launch day, and an http link can be changed on the way.
