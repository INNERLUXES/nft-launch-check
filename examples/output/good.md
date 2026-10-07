# nft-launch-check: examples/good/plan.json

- File: examples/good/plan.json \(JSON, 22 lines, 1,762 bytes\)
- Collection: Meadow Example Foxes \(MEF\); ERC-721; max supply 3,000; reserve 100
- Mint: 2 phases timed in blocks; supply caps add up to 2,900
- Royalty: 500 basis points \(5%\); to 0x9999999999999999999999999999999999999999
- Reveal: delayed; placeholder set; provenance hash set
- Metadata: freeze after-reveal; ERC-4906 events planned
- Admin: owner 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa; multisig 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa, 2 of 3 signers
- Withdraw: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
- Findings: 0
- Result: **PASS - no finding at or above error**

## Findings

None.

## Phases (2)

| Phase | Start | End | Price | Per wallet | Cap | Allow list | Merkle root |
| --- | ---: | ---: | --- | ---: | ---: | ---: | --- |
| allowlist | 100 | 7,300 | 0.03 ETH | 2 | 1,200 | 600 | set |
| public | 7,300 | 14,500 | 0.05 ETH | 5 | 1,700 | - | - |

This report is an input to a review of the launch plan before the mint goes live: not legal or financial advice, not an audit of the contract and not a guarantee that the mint will go as planned.
