# Threat model

The tool is an input to a review of the launch plan before the mint goes live: not legal or financial advice, not an
audit of the contract and not a guarantee that the mint will go as planned. This document is about the tool itself: what
it touches, what a hostile or careless plan can try, and what stops it.

## What the tool touches

- It reads the one file named on the command line. Nothing else is opened, and no address, URL or path written in the
  plan is looked up, opened or followed.
- It writes the report to standard output and its errors to standard error. It writes nothing to disk.
- It opens no network connection, fetches no URL, contacts no chain, node, marketplace or API, follows no symbolic link,
  runs nothing it reads, evaluates nothing and reads no clock and no locale.

## What the input may hold

A launch plan comes from a person who edits it, a tool that exports it, or an upload, and in a pipeline that checks
every pull request it may be written by whoever opened the pull request. Through it, a person can try to, or a careless
change can:

- put a private key, a seed or a mnemonic in the plan, as a key next to the owner, a note of a phase or a value of a
  link, so that the tool copies it into a pipeline log, a pull request comment or a code scanning upload;
- hide a private key under `merkleRoot` or `provenanceHash`, where a hash of the same shape belongs;
- make the tool read outside the file: a link named on the command line, a folder, an address given as the path;
- make the tool reach a chain or a server: an address of a wallet, a placeholder URI or a link written in the plan;
- exhaust the memory, the stack or the time: a file of many megabytes, a hundred thousand phases that all overlap,
  arrays and objects nested very deep, very long names and links, numbers with thousands of digits;
- move the result: a key written twice so that two readers see two supplies, a misspelt key that hides a per-wallet
  limit, a field of the wrong type that might be taken as fine, prices that a floating point number would read wrongly;
- slip in something that is not text: a binary file named `.json`, bytes that are not valid UTF-8 or UTF-16;
- rewrite the terminal or break the output: control characters, escape sequences, direction controls and line separators
  in a collection name, a phase name, an address or a link;
- hide markup in the markdown report: a link, a table separator or a tag in a name;
- change how objects behave: a key, a link name, a currency or a phase named `__proto__`, `constructor` or `toString`.

## What could go wrong, and what stops it

| Risk | Control |
| --- | --- |
| A secret in the plan is copied into the output | Before the plan is read, every key and value is looked at for a key or a seed; each one found is a `secret-in-file` error, the value is marked, the reader leaves it out as if it were not there, and no message names it. Tests put each shape under several fields and check every format for the value |
| A key under `merkleRoot` or `provenanceHash` is copied into the output | A value of 64 hex digits there is read as a hash and is not reported, and the tool never shows the value of either key, only whether it is set; any other shape there is still a secret. A test checks every format for the hashes of a plan |
| A link makes the tool read a file it was not given | The path is checked with `lstat` and a link is refused by name; the file is opened with `O_NOFOLLOW` where the system has it, and its type and size are taken from the open handle. A test puts a link in the folder |
| The tool reaches a chain or a server, fetches, connects or runs something | No module of the network or of child processes is imported, nothing is evaluated, an address and a link are only text that is checked for its form, and a path that looks like an address is refused. A test checks the imports of src |
| The memory, the stack or the time is exhausted | The file has a size limit checked on the open handle before it is read; the reader keeps limits of nesting, values and string length, the JSON reader, the search for secrets and the walk for hashes keep stacks of their own; at most 100 phases are read, so the comparison of every pair of phases stays small. Tests check the time, with limits that widen under coverage only |
| A key written twice hides a value | A key written twice in one JSON object is a `file-unreadable` finding |
| A misspelt or missing field passes for one that is fine | A key the tool does not read is a `field-unknown` finding with the key it is probably meant to be; a missing field is `field-missing`; a value of the wrong type is `field-invalid`; each with its line |
| Prices or royalties are read wrongly | Prices and royalties are read from the characters of the file with BigInt; an exponent or a separator is refused |
| A binary file or bytes in another encoding are read as text | A null byte in UTF-8, an odd number of bytes in UTF-16 and bytes that are not valid make the file an input error with exit code `2` and no report |
| Text from the plan rewrites the terminal | Every text from the input goes through `safeText`, which replaces control, line separator and direction characters and caps the length. A test puts escapes and direction controls in a collection name, a symbol and a phase name, in every format |
| Markup in a name changes the markdown report | The markdown report escapes the characters markdown gives a meaning to. A test writes a link into a collection name |
| `__proto__` changes how objects behave | Objects of the plan are lists of entries compared with the names the tool reads, and no object is built with a key from the plan; the currencies are looked up with `Object.hasOwn`. A test uses `__proto__`, `constructor` and `hasOwnProperty` as keys, link names, currencies and phase names |
| A device or a pipe hangs the tool | A path that is not a regular file is refused before it is read |
| The tool leaves files behind | Nothing is written to disk; there is no cache, no temporary file and no log. A test checks that a run leaves the folder as it was |

## Out of scope

Whether the plan matches the deployed contract, whether the merkle root matches the allow list, whether a link leads to
the right page, whether a collection may be sold where it is sold, the forms and secrets docs/limits.md says the tool
does not see, who may change or upload the plan, and where your pipeline keeps the output.
