// The public pages the documented checks rest on, and the points of each that the reports show, written in this
// project's own words. A page is named by its address; a copy of its text, read before it was listed, is kept under
// research/sources. research/sources.md lists every page with a note, docs/rules-and-sources.md lists every rule with its
// points, and test/data.test.js checks the three against each other.

export const LEVELS = ['info', 'warning', 'error'];

export const NOT_A = 'not legal or financial advice, not an audit of the contract and not a guarantee that the mint will go as planned';

export const NOTICE = `This report is an input to a review of the launch plan before the mint goes live: ${NOT_A}.`;

export const SOURCES = [
  { id: 'eip-2981', title: 'ERC-2981: NFT Royalty Standard', url: 'https://eips.ethereum.org/EIPS/eip-2981', file: 'research/sources/eip-2981-nft-royalty-standard.txt' },
  { id: 'eip-4906', title: 'ERC-4906: EIP-721 Metadata Update Extension', url: 'https://eips.ethereum.org/EIPS/eip-4906', file: 'research/sources/eip-4906-metadata-update-extension.txt' },
  { id: 'eip-721', title: 'ERC-721: Non-Fungible Token Standard', url: 'https://eips.ethereum.org/EIPS/eip-721', file: 'research/sources/eip-721-non-fungible-token.txt' }
];

// Points: id -> { source, text }.
export const POINTS = {
  'erc2981-percentage': { source: 'eip-2981', text: 'Under ERC-2981 the royalty owed on a sale is worked out as a share of the sale price and paid in the unit of the sale; the page speaks of a percentage, and names no unit such as basis points and no largest value.' },
  'erc2981-receiver': { source: 'eip-2981', text: 'The royaltyInfo function of ERC-2981 answers a marketplace with two values for a sale: the address the royalty is to be sent to, and the amount.' },
  'erc4906-event': { source: 'eip-4906', text: 'ERC-4906 is an optional extension of ERC-721 with two events, MetadataUpdate and BatchMetadataUpdate; a contract that has it emits one of them whenever the JSON metadata of a token, or of a run of tokens, changes, so that marketplaces show the new metadata.' },
  'erc721-metadata': { source: 'eip-721', text: 'The optional metadata extension of ERC-721 gives each token a tokenURI, a URI that may point to a JSON file with the name, the description and the image of the token.' }
};

export const source = (id) => SOURCES.find((s) => s.id === id);
export const pointPage = (id) => source(POINTS[id].source);
