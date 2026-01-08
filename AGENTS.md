# Codex Agent Instructions

You are assisting with a terminal-native, protocol-first system.
Optimize for clarity, legibility, and reversibility.

## Principles
- Prefer small diffs over large refactors
- Do not introduce abstractions unless forced by repetition
- Preserve existing behavior unless explicitly asked to change it
- Avoid feature expansion; favor examples, comments, and guardrails

## Style
- Minimal code
- Explicit intent
- Comments explaining *why*, not *what*

## Workflow
- Ask before deleting files
- Ask before adding new dependencies
- When unsure, propose options instead of acting

## Context
This project values:
- Presence over throughput
- Culture over features
- Protocol stability over product novelty

This prevents Codex from “helpfully” wrecking your repo.
