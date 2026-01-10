# Changelog

All notable changes to /vibe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- **System Account Authentication**: @vibe and @solienne now require cryptographic HMAC signatures for all messages
  - Prevents impersonation attacks via `x-vibe-system-signature` header
  - 60-second replay attack window with timestamp validation
  - Requires `VIBE_SYSTEM_SECRET` env var
- **Invite Code Authentication**: Invite generation now requires valid session token
  - Handle derived from authenticated session, cannot be spoofed via request body
  - Prevents unauthorized users from generating invites

### Fixed
- **Profile Status**: Online/offline status now displays correctly (was showing everyone offline)
  - Fixed KV key lookup pattern in `api/profile.js`
  - Corrected ISO timestamp comparison logic
- **Presence Registration**: Fixed `claimResult` scoping bug that caused undefined reference errors
- **Genesis Cap**: Now configurable via `VIBE_GENESIS_CAP` environment variable
  - Default `0` = open registration (no cap)
  - Set to positive integer to enable scarcity mode

### Deprecated
- **Legacy /api/users endpoint**: Returns 410 Gone for POST requests
  - Use `/api/presence?action=register` for new registrations
  - GET requests include deprecation headers pointing to replacement

### Changed
- **Open Registration**: Genesis cap removed by default - set `VIBE_GENESIS_CAP` explicitly to enable

---

## [0.1.0] - 2026-01-09

Initial public release of /vibe platform.

### Added
- Terminal-native social layer for Claude Code
- MCP server with presence, messaging, and discovery tools
- Dashboard mode with structured conversation flows
- Real-time typing indicators
- Thread memory with `vibe_remember` and `vibe_recall`
- File reservation system for collaborative work
- Multiplayer games (tic-tac-toe, chess, drawing, crossword)
- Social feed with ideas, ships, and requests
- Vercel KV + Postgres dual-storage architecture
- AIRC protocol authentication
- Rate limiting for API endpoints
- Genesis handle claiming system
