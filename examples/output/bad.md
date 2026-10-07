# nft-launch-check: examples/bad/plan.json

- File: examples/bad/plan.json \(JSON, 24 lines, 1,764 bytes\)
- Collection: Harbor Example Owls \(HXO\); ERC-721; max supply 5,000; reserve 300
- Mint: 4 phases timed in minutes; supply caps add up to 5,300
- Royalty: 1,250 basis points \(12.5%\); no receiver
- Reveal: delayed; no placeholder; no provenance hash
- Metadata: freeze never; ERC-4906 events not planned
- Admin: owner 0x1111111111111111111111111111111111111111; multisig 0x5555555555555555555555555555555555555555, 1 of 3 signers
- Withdraw: 0x0000000000000000000000000000000000000000
- Findings: 23 \(12 error, 11 warning\)
- Result: **FAIL - 12 findings at or above error \(12 error, 11 warning\)**

## Findings

| Level | Check | Where | Message |
| --- | --- | --- | --- |
| error | supply-exceeded | examples/bad/plan.json:3 | The supply caps of the phases add up to 5,300 and the reserve to 300, 5,600 in all, 600 above the maxSupply of 5,000. This is a best practice of this tool, not a rule in the pages it cites. Fix: Lower the caps of the phases or the reserve until they fit in the max supply, or raise the max supply if the contract and the plan of the collection allow it. |
| error | allowlist-root-missing | examples/bad/plan.json:7 | The allow list of phase allowlist has no merkleRoot, so the contract cannot tell a listed wallet from any other. This is a best practice of this tool, not a rule in the pages it cites. Fix: Build the merkle tree of the allow list and set its root in the plan before the phase opens; if the contract checks a signature instead of a root, say so in the notes of the phase and keep the finding in the review. |
| error | phase-empty | examples/bad/plan.json:9 | Phase holders starts at minute 4,320 and ends at minute 4,320, so it is open for no minute. This is a best practice of this tool, not a rule in the pages it cites. Fix: Set the end of the phase after its start, in the timing of the plan. |
| error | currency-mismatch | examples/bad/plan.json:9 | The currency of phase holders is SOL, a currency of Solana, but the collection is ERC-721, on an EVM chain. This is a best practice of this tool, not a rule in the pages it cites. Fix: Price the phase in a currency of the chain of the collection, or correct the standard. |
| error | field-missing | examples/bad/plan.json:10 | Phase PUBLIC has no currency, such as ETH or SOL. Fix: Add the field named; docs/inputs.md lists what the plan needs. |
| error | field-duplicate | examples/bad/plan.json:10 | The name PUBLIC is also the name of the phase at line 8; each phase needs a name of its own. Fix: Give every phase a name of its own, and list each signer once. |
| error | royalty-receiver-missing | examples/bad/plan.json:13 | The royalty is 1,250 basis points \(12.5%\) but names no receiver. The royaltyInfo of ERC-2981 answers a marketplace with the address the royalty is sent to, and a royalty with no receiver has nowhere to go. Fix: Name the receiver of the royalty, such as the multisig of the team or a contract that splits it, or set the royalty to 0. |
| error | field-invalid | examples/bad/plan.json:14 | The placeholderUri of the reveal is "placeholder.json", which is not a URI the tool reads; write ipfs://, ar://, https:// or data: with the rest of the address. Fix: Write the value as docs/inputs.md shows: text for names, addresses and choices, whole numbers for supplies, limits, starts and ends, plain decimal numbers for prices, true or false for flags. |
| error | address-malformed | examples/bad/plan.json:18 | The minter of the admin roles, "0x12345", has 5 characters after 0x, not 40; an address of an EVM chain is 0x followed by 40 hex digits. This is a best practice of this tool, not a rule in the pages it cites. Fix: Copy the address again from the wallet; send nothing to a zero address, which no one holds. |
| error | secret-in-file | examples/bad/plan.json:19 | The plan holds the key "seedPhrase", which names a seed, a mnemonic or a private key. The tool never reads one, and the value is not shown. Fix: Remove the value from the plan and from wherever the plan was copied, treat it as exposed and move what it controls to a new key. A launch plan names wallets by their public address only. |
| error | field-duplicate | examples/bad/plan.json:20 | The signer 0x6666666666666666666666666666666666666666 of the multisig is listed twice; it was counted once. Fix: Give every phase a name of its own, and list each signer once. |
| error | address-malformed | examples/bad/plan.json:22 | The withdraw address, "0x0000000000000000000000000000000000000000", is the zero address, which no one holds; an address of an EVM chain is 0x followed by 40 hex digits. This is a best practice of this tool, not a rule in the pages it cites. Fix: Copy the address again from the wallet; send nothing to a zero address, which no one holds. |
| warning | field-unknown | examples/bad/plan.json:7 | The key "perWalletLimt" of phase 1 is not one the tool reads, so its value was left out of every check. Did you mean "perWalletLimit"? The keys of phase 1 are name, start, end, price, currency, perWalletLimit, supplyCap, allowList, notes. Fix: Correct the spelling to a field of docs/inputs.md, or remove it. |
| warning | allowlist-oversubscribed | examples/bad/plan.json:7 | The allow list of phase allowlist holds 1,500 wallets, but the phase is capped at 1,000, so some listed wallets may find it sold out. This is a best practice of this tool, not a rule in the pages it cites. Fix: Raise the supply cap of the phase, lower the per-wallet limit or the size of the list, or tell the listed wallets that a place on the list does not hold a token. |
| warning | public-phase-unlimited | examples/bad/plan.json:8 | Phase public is open to every wallet and free, with no perWalletLimit, so one wallet, or a set of bots, can mint as much of it as it can pay for. This is a best practice of this tool, not a rule in the pages it cites. Fix: Set perWalletLimit on every public phase, above all on a free or cheap one, and keep in mind that a limit per wallet does not stop one person with many wallets. |
| warning | phase-overlap | examples/bad/plan.json:8 | Phase public starts at minute 1,200, before phase allowlist ends at minute 1,440, so the two are open together for 240 minutes. This is a best practice of this tool, not a rule in the pages it cites. Fix: Start each phase when the one before it ends, or say in the plan why two phases share a window. |
| warning | royalty-high | examples/bad/plan.json:13 | The royalty is 1,250 basis points \(12.5%\), above the threshold of 1,000 \(10%\) of --max-royalty-bps. This is a best practice of this tool, not a rule in the pages it cites. Fix: Check the royalty against what the marketplaces the collection sells on honour and what its buyers expect, or raise --max-royalty-bps for a collection that sets a higher royalty on purpose. |
| warning | reveal-provenance-missing | examples/bad/plan.json:14 | The reveal is delayed and gives no provenanceHash, so collectors cannot check that the order of the art was fixed before the mint. This is a best practice of this tool, not a rule in the pages it cites. Fix: Hash the final metadata or images in their order, publish the hash before the mint opens and set it in the plan as provenanceHash. |
| warning | metadata-freeze-missing | examples/bad/plan.json:15 | The metadata are never frozen \(freeze is never\), so the owner can change the art and the traits of every token after the sale. This is a best practice of this tool, not a rule in the pages it cites. Fix: Plan a freeze, at the mint or after the reveal, that makes the metadata permanent, or say to collectors that the metadata stays open to change and why. |
| warning | metadata-update-event-missing | examples/bad/plan.json:15 | The metadata of this ERC-721 collection change after the mint \(the reveal is delayed\), but the plan does not say that the contract emits the events of ERC-4906 \(erc4906 is false\). A contract with that extension emits MetadataUpdate or BatchMetadataUpdate when the JSON metadata change, so that marketplaces refresh the tokens. Fix: Add the ERC-4906 extension to the contract, emit BatchMetadataUpdate at the reveal and MetadataUpdate on each later change, and set metadata.erc4906 to true. |
| warning | admin-single-key | examples/bad/plan.json:17 | The owner of the contract, 0x1111111111111111111111111111111111111111, is not the multisig of the plan, so one key can change the contract, its supply, its price and its metadata. This is a best practice of this tool, not a rule in the pages it cites. Fix: Make the owner and the withdraw address a multisig wallet that needs more than one signer, and set it in admin.multisig. |
| warning | multisig-threshold-low | examples/bad/plan.json:20 | The multisig needs only 1 signature of its 2 signers, so any one signer acts alone. This is a best practice of this tool, not a rule in the pages it cites. Fix: Set the threshold to at least 2, and to a majority of the signers for the owner of the contract. |
| warning | link-invalid | examples/bad/plan.json:23 | The link website, "http://harbor-owls.example", starts with http, which anyone on the way can change; write https. This is a best practice of this tool, not a rule in the pages it cites. Fix: Write each link as https:// and the host and path of the page; the tool never opens it. |

## Phases (4)

| Phase | Start | End | Price | Per wallet | Cap | Allow list | Merkle root |
| --- | ---: | ---: | --- | ---: | ---: | ---: | --- |
| allowlist | 0 | 1,440 | 0.04 ETH | - | 1,000 | 1,500 | missing |
| public | 1,200 | 4,320 | free | - | 3,800 | - | - |
| holders | 4,320 | 4,320 | 0.03 SOL | 1 | 300 | 200 | set |
| PUBLIC | 4,320 | 5,760 | 0.05 | 3 | 200 | - | - |

This report is an input to a review of the launch plan before the mint goes live: not legal or financial advice, not an audit of the contract and not a guarantee that the mint will go as planned.
