# 3. Check the plan on disk, and contact no chain

## Status

Accepted

## Context

Many facts about a launch live elsewhere: the deployed contract with its max supply, its phases and its owner, the
multisig with its real threshold and signers, the current block, the allow list behind a merkle root, the pages the
links point to, the royalties the marketplaces honour. A check could call a node on every run, read the contract, rebuild
the merkle tree from a list, open each link and ask a marketplace for its rules. That would need the network, a node and
often a key, would make the result depend on the state of a chain and of other people's sites at the moment of the run,
would send the addresses of the team to a third party, and would let a file in a pull request make the pipeline reach
any address it names.

What a team needs first, before the contract is deployed or the mint page goes live, is a list of what is wrong in the
plan and where: phases that do not fit the supply or each other, an allow list the contract cannot check, a royalty
with nowhere to go, an owner that is one key. The plan can be written as a file, reviewed like code and checked the same
way on every run.

## Decision

1. The tool reads the plan it is given, and nothing else. It contacts no chain, node, marketplace or API, fetches
   nothing, opens no link, needs no key, runs no program and sends no data anywhere. It cannot send a transaction.
2. The plan stands for the contract, the mint page and the wallets of the launch. The tool works out the supply, the
   windows of the phases, the allow lists and the roles from the plan alone, and never asks a chain.
3. The form of an address and the chain of a currency are tables in the code, kept short and named in docs/limits.md.
   They are updated in a release, never fetched while the tool runs.
4. The rules the checks apply are listed in docs/method.md, and the public pages each documented check rests on are
   named in src/data.js and research/sources.md, each fetched and read before it was listed, with a copy of its text
   under research/sources. A check that no page says is a best practice of this tool and says so.
5. The tool lists what to look at and what to change; it changes nothing and sends nothing.

## Consequences

- The result depends only on the plan, and a run needs no network access, no secret and no node, and sends nothing
  anywhere.
- A plan that does not match the deployed contract gives a report about the plan, not about the contract; docs/limits.md
  says to check the deployed contract against the plan before the mint.
- A merkle root is checked for its form, not against the list; a link is checked for its form, not for the page behind
  it.
