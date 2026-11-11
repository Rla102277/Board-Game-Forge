# Agent Architecture

## Roles
Lead orchestrator: plans and delegates with budgets.
Designer: theme, mechanics and goals.
Rules architect: translates design into structured, compilable rules.
Mathematician: probability and economy modeling.
QA reviewer: invariants, rule conflicts and scenario tests.
Playtest director: policies, seeds, seat rotations and experiments.
Balance analyst: statistics and proposed patches with uncertainty.
Creative director: component art briefs.
Publisher: documentation and output packaging.

## Contracts
Each agent task includes objective, input artifact hashes, authorized observations, tools, output JSON schema, cost/time limits and success tests. Agents cannot directly mutate published definitions. A human-approved patch and passing tests are required for merge.

## Opponents
Random, heuristic, greedy, search/MCTS where supported, LLM and hybrid. The LLM selects from legal actions; the engine validates independently. Hidden state must never be included in opponent prompts.

## Orchestration
Use task DAGs, bounded retries, persisted artifacts, failure visibility and audit logs. Provider-neutral adapters should extend the existing multi-provider AI router. No autonomous loops without budgets.
