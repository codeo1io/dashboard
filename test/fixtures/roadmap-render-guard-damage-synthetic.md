# Synthetic damage fixture for the roadmap render-guard stringified-object prose leg (rm-864).

Replicates the second 2026-10-15 fifty-error emission class: bare, un-backticked
stringified-object and stringified-array tokens riding narrative lines. The post-repair
shape (identical tokens inside backtick code spans) is included as the control block.

### Synthetic clean heading
- id: `rm-8000` | track: reliability | priority: 50.0 | status: candidate
- acceptance: clean control line with a backticked token `{"_dev": [ "modes", "all" ]}` stays exempt

### Synthetic damage one
- signals: acceptance expanded {"_dev": [ "modes", "all" ], "severities": [ "info" ]} inline bare object prose

### Synthetic damage two
- evidence: closed rm-802 row carried ["pino-pretty", "logsmith"] bare array prose riding the narrative

### Synthetic damage three
- id: `rm-8001` | track: reliability | priority: 40.0 | status: candidate
- notes: def lines are census lines, but their narrative tails stay subject to the trip {"escaped": false} mid-line

### Synthetic control two
- acceptance: the identical array stays exempt once wrapped `["pino-pretty", "logsmith"]` like this

<!-- whole-line HTML comment carrying {"_dev": [ "modes", "all" ]} must stay exempt -->
