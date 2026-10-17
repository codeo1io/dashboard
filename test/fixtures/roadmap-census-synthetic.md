# Synthetic ledger fixture for the roadmap census unit test (rm-877).

### Synthetic item one
- id: `rm-800` | track: reliability | priority: 50.0 | status: in_progress
- acceptance: census parses def lines with the canonical shape

### Synthetic item two
- id: `rm-881` | track: reliability | priority: 40.0 | status: candidate
- acceptance: synthetic max is derived, never pinned to the live tree

### Synthetic malformed entry (renderer corruption class)
- id: rm-BROKEN | track: reliability | priority: 30.0 | status: candidate
- acceptance: this def line fails the canonical DEF_LINE shape on purpose

<!-- managed by hermes-roadmap render; do not edit by hand -->
