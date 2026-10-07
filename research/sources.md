# Sources

The public pages the documented checks of this tool are based on, each with a short note in this project's own words
on what the page says and which checks lean on it. Nothing here is a copy of a page: read the page itself for its exact
wording. A plain text copy of each page, taken when it was read, is kept in [research/sources](sources) so that a point
can be checked against the page it came from, and the copies are the pages' own words, not this project's. src/data.js
holds the pages and the points the reports show, and test/data.test.js checks that every page in src/data.js is listed
here and has its copy, that no point quotes its page at length, and that the pages say what the documented checks rest
on.

The tool reads the launch plan of an NFT collection and runs nothing; its result is an input to a review of the launch
plan before the mint goes live: not legal or financial advice, not an audit of the contract and not a guarantee that the
mint will go as planned. These notes say what the pages say so a reader can follow a finding back to its source. The
pages were chosen with web addresses that hold no number that reads like a year, and each was read with a plain HTTP
client as the markdown source in the repository ethereum/ERCs from which eips.ethereum.org builds the page. No browser
was used. The copy of ERC-721 is the one the sibling tool nft-metadata-check saved, copied byte for byte.

## What the pages say, and what they do not

- ERC-2981 is checked against its final text. Its royaltyInfo function takes a token id and a sale price and answers
  with two values: the address that should be sent the royalty, and the royalty amount. The page says that royalty
  amounts are always a percentage of the sale price, that an implementer must work out a percentage of the sale price,
  that the royalty is paid in the same unit as the sale, and that payment is voluntary for marketplaces. It does not
  speak of basis points, it sets no largest royalty, and it says nothing of who the receiver should be. A test checks
  that the copy holds no mention of basis points.
- So `royalty-receiver-missing` is documented: a royalty above 0 with no address to send it to has no answer for the
  first value of royaltyInfo. `royalty-invalid` is a best practice of this tool: the plan writes the royalty in basis
  points, a hundredth of a percent, by the tool's own choice, and the tool refuses a royalty that is not a whole number
  of them or is above 10000, the whole sale price. The page names no such bound; a royalty above the whole price is
  never what a plan means. `royalty-high` and its threshold of 1000 basis points, 10%, are the tool's own too.
- ERC-4906 is checked against its final text. It adds two events to ERC-721, MetadataUpdate for one token and
  BatchMetadataUpdate for a run of tokens, and says that one of them must be emitted when the JSON metadata of a token or
  of a run of tokens changes. The extension itself is optional for an ERC-721 contract. `metadata-update-event-missing`
  leans on it, at the level of a warning because the extension is optional, for an ERC-721 collection whose plan
  changes the metadata after the mint.
- ERC-721 is checked against its final text. Its optional metadata extension gives each token a tokenURI, which may
  point to a JSON file of the ERC721 Metadata JSON Schema with the name, the description and the image of the token.
  That is the metadata a delayed reveal or a later update changes, and `metadata-update-event-missing` names it next to
  ERC-4906, which builds on it.

Everything else the tool checks is a best practice of this tool, not a rule in these pages, and each check says so in
its message and in its own entry of [docs/rules-and-sources.md](../docs/rules-and-sources.md), with the reason. No page
saved here says that the caps of the phases and the reserve must fit in the max supply, that phases must not overlap or
be empty, that an allow list needs a merkle root or must fit in its phase, that a public phase needs a per-wallet limit,
that a delayed reveal needs a provenance hash, that the metadata must be frozen, that the owner and the withdraw address
must be a multisig with a threshold above 1, what form an address has, which currency belongs to which chain, or that a
link must be https. These are the checks an NFT consultant makes on a launch plan from practice. They were not tied to
a page of a marketplace or a vendor on purpose: such pages change often, describe one product, and could not be read as
plain text without a browser.

## What the copies leave out

Each copy is the text of the page as it was read, with a two-line header that names its address and how it was read,
and with these lines left out, so that no copy holds a date, a number that reads like a year or personal contact
details, and every copy is plain ASCII (decision 1 in docs/decisions):

- ERC-2981: the line `author:` of the front matter, which names the authors with their handles, and the line
  `created:`, which holds the day the page was created.
- ERC-4906: the line `author:` of the front matter, which names the authors with their handles and email addresses, and
  the line `created:`, which holds the day the page was created. The curly quotes of its line on the key words of
  RFC 2119 are written as ASCII quotes.
- ERC-721: the copy of nft-metadata-check, unchanged. It leaves out the line `author:` of the front matter, which names
  the authors with their handles and email addresses; the line `created:`, which holds the day the page was created; the
  sentence on a second event held at a conference, which names the year it was held; the line that opens the list of
  example implementations, which names the month and year of the list; and the reference to that conference, which
  holds its year. Its curly quotes and dashes are written as ASCII quotes and hyphens, and the letter D with a stroke is
  written as D.

No line of the copies of ERC-2981 and ERC-4906 other than these had to be left out for the year check of the repository:
the checks of `npm run check` and of test/repo.test.js pass over the rest of their text as it was read.

## Royalties

### ERC-2981: NFT Royalty Standard

https://eips.ethereum.org/EIPS/eip-2981

Copy: research/sources/eip-2981-nft-royalty-standard.txt

The final standard for signalling a royalty of an NFT to marketplaces: a function royaltyInfo that, for a token and a
sale price, answers with the receiver of the royalty and its amount, worked out as a percentage of the sale price and
paid in the unit of the sale, with payment left to the marketplaces. `royalty-receiver-missing` leans on it, and the note
of `royalty-invalid` names what it says and does not say of the unit and the bound.

## Metadata

### ERC-4906: EIP-721 Metadata Update Extension

https://eips.ethereum.org/EIPS/eip-4906

Copy: research/sources/eip-4906-metadata-update-extension.txt

The final, optional extension of ERC-721 with the events MetadataUpdate and BatchMetadataUpdate, which a contract that
has it emits when the JSON metadata of a token or of a run of tokens changes, so that marketplaces refresh what they
show, and whose interface id is 0x49064906. `metadata-update-event-missing` leans on it.

### ERC-721: Non-Fungible Token Standard

https://eips.ethereum.org/EIPS/eip-721

Copy: research/sources/eip-721-non-fungible-token.txt

The final standard for non-fungible tokens on an EVM chain, with an optional metadata extension whose tokenURI points
each token at a JSON file with its name, description and image. `metadata-update-event-missing` names it as the metadata
the events of ERC-4906 are about.
