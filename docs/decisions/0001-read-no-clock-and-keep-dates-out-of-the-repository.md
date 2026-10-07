# 1. Read no clock, and keep dates out of the repository

## Status

Accepted

## Context

A launch plan is full of time: when the allow list opens, how long it runs, when the public mint starts, when the art is
revealed. The obvious way to check such a plan is to read the clock: take now, compare it with the start of each phase,
and say which phases are past, open or still to come. That would make the same plan give a different report on a
different day, so the saved output of the examples could never be compared with a new run, two people reading the same
commit could see two reports, and a plan prepared weeks before the mint would be judged against the day of the review
instead of against itself. A date in a file also brings its own trouble: a time zone, a format, a calendar, and the
difference between the time of a server and the time of a block.

The checks do not need the clock. Whether two phases overlap, whether a phase is empty, and in which order the phases
run depend only on their starts and ends, and those are in the plan.

## Decision

1. The tool reads no clock, no time zone and no locale. It never prints the current time and never says when a page, a
   list or a release was published. The same plan gives the same output on every machine and on every day.
2. The start and the end of each phase are whole numbers on one scale the plan names in `mint.timing`: `minutes` from a
   point of the plan's own, such as the opening of the mint, or `blocks`, the block numbers of the chain. The tool
   compares those numbers and never turns one into a date or asks a chain which block is current. A phase with no start
   or end is a finding, never checked against the time of the run.
3. No document, example or test of this repository holds a date or a number that reads like a year: not the licence,
   not the changelog, not the documents, not the comments of the code, not the examples. `npm run check` and a test fail
   on any word of four digits that starts with 19 or 20. The saved copies of the public pages under research/sources are
   the pages' own words and are the one place the check does not read for prose; even so, the lines that carry a date or
   a number that reads like a year (the day an ERC page was created, and the lines of ERC-721 that name a year) were left
   out of the copies, so the test that reads every file for a year passes over them too. research/sources.md lists every
   line that was left out.
4. A version, a supply, a minute, a block number or the number of a standard is not a year and is not caught: 1.0.0,
   Node 22, a max supply of 5,000, minute 1,440, ERC-2981, ERC-4906, ERC-721, SARIF 2.1.0 and NIST SP 800-218 hold no
   year. The examples use supplies, minutes and blocks that do not read like a year, and a test of test/repo.test.js runs
   the pattern over such values and checks that none of them is caught, and that a year in the same place still is.
5. The sources are chosen with addresses that hold no year, and the notes on them name no publication date.

## Consequences

- The output of a run can be saved in the repository (`examples/output`) and compared on every change, because it does
  not move with the calendar.
- A plan can be checked long before its mint, for the order it describes.
- The phases of a plan have to agree on one scale; a plan that gives one phase in minutes and another in blocks cannot
  say so, and the tool cannot tell. docs/inputs.md says so.
- The report holds no date and no deadline; the start and the end of a phase are numbers of the plan.
