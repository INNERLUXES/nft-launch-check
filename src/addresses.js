// The form of an address on the chain of the collection, and the chain of each currency the tool knows. An ERC-721 or
// ERC-1155 collection lives on an EVM chain, where an address is 0x and 40 hex digits; a Solana collection has addresses
// of 32 to 44 base58 characters. The checksum of mixed case (EIP-55) is not checked, and nothing is looked up on a chain.
// Two addresses are the same wallet when they differ only in case on an EVM chain; on Solana case is part of the
// address. Both forms are a best practice of the tool (src/rules.js, address-malformed): no page is saved for them.

const EVM = /^0x[0-9a-fA-F]{40}$/;
const EVM_ZERO = /^0x0{40}$/;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
// The system program of Solana, written as 32 ones; it is the zero address of that chain and holds no tokens of anyone.
const SOLANA_ZERO = '1'.repeat(32);

export const ADDRESS_FORMS = { evm: '0x followed by 40 hex digits, not the zero address', solana: '32 to 44 base58 characters, not the system program' };

// What is wrong with an address on a chain ('evm' or 'solana'), or null when its form is right.
export function addressProblem(text, chain) {
  const v = text.trim();
  if (v !== text) return 'has spaces around it';
  if (chain === 'solana') {
    if (!BASE58.test(v)) return 'holds a character that is not base58 (0, O, I and l are not base58)';
    if (v.length < 32 || v.length > 44) return `has ${v.length} characters, not 32 to 44`;
    if (v === SOLANA_ZERO) return 'is the system program, which no one holds';
    return null;
  }
  if (!v.startsWith('0x')) return 'does not start with 0x';
  if (v.length !== 42) return `has ${v.length - 2} characters after 0x, not 40`;
  if (!EVM.test(v)) return 'holds a character that is not a hex digit';
  if (EVM_ZERO.test(v)) return 'is the zero address, which no one holds';
  return null;
}

// The key two addresses are compared by: in small letters on an EVM chain, as written on Solana.
export const addressKey = (text, chain) => (chain === 'solana' ? text.trim() : text.trim().toLowerCase());

// The chain of each currency the tool knows, by its symbol in capitals: an EVM chain, Solana, or both for the stable
// coins that are issued on both. A currency that is not here is not compared.
export const CURRENCY_CHAINS = { ETH: 'evm', WETH: 'evm', POL: 'evm', MATIC: 'evm', APE: 'evm', AVAX: 'evm', BNB: 'evm', DAI: 'evm', SOL: 'solana', WSOL: 'solana', USDC: 'both', USDT: 'both' };

// The chain of a currency, or null when the tool does not know it.
export const currencyChain = (symbol) => (Object.hasOwn(CURRENCY_CHAINS, symbol.toUpperCase()) ? CURRENCY_CHAINS[symbol.toUpperCase()] : null);
