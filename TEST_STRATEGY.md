# 🃏 Poker Game Testing Strategy

## Overview
This document outlines the comprehensive testing strategy for the Poker Gacha application, including unit tests, integration tests, and end-to-end tests.

## Testing Pyramid

```
        🎯 E2E Tests (Playwright)
       ├─ Full game flows
       ├─ Multi-player scenarios
       └─ UI/Socket integration
    
      🔗 Integration Tests (Bun)
     ├─ API endpoints
     ├─ Socket events
     └─ Database interactions
   
  ⚙️ Unit Tests (Bun)
 ├─ Game engine logic
 ├─ Hand evaluation
 ├─ Deck management
 └─ Helper functions
```

## 1. Unit Tests (Packages/Shared)

### 1.1 Game Engine Tests (`engine.test.ts`)
**Location**: `packages/shared/src/game/__tests__/engine.test.ts`

**Coverage Areas**:
- ✅ Game initialization (blinds, dealer positioning)
- ✅ Player action flow (fold, check, call, raise, all-in)
- ✅ Betting round completion detection
- ✅ Phase transitions (pre-flop → flop → turn → river → showdown)
- ✅ Edge cases:
  - Single player remaining (everyone else folds)
  - All-in scenarios
  - Side pot calculations
  - Button rotation

### 1.2 Hand Evaluation Tests (`hand.test.ts` - Enhanced)
**Current Coverage**: ✓ Basic hand rankings
**Additional Tests Needed**:
- ✅ Edge cases in straight detection (wheel, high straight)
- ✅ Flush detection with edge cases
- ✅ Tie-breaking in all hand types
- ✅ Performance with large hand pools

### 1.3 Deck Generation Tests (`deck.test.ts`)
**Coverage Areas**:
- ✅ Deck creation (52 unique cards)
- ✅ Shuffle randomness (statistical tests)
- ✅ Deterministic shuffle with seed

---

## 2. Integration Tests (Apps/Server)

### 2.1 Auth API Tests (`routes.test.ts`)
**Endpoints**:
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- GET `/api/auth/session` - Session validation

**Test Cases**:
- ✅ Successful registration
- ✅ Duplicate email prevention
- ✅ Password validation (min 8 chars)
- ✅ Login with valid/invalid credentials
- ✅ Session persistence

### 2.2 Room API Tests (`rooms.test.ts`)
**Endpoints**:
- POST `/api/rooms/create` - Create game room
- GET `/api/rooms/list` - List available rooms
- POST `/api/rooms/join` - Join a room
- POST `/api/rooms/leave` - Leave a room

**Test Cases**:
- ✅ Room creation with player limits
- ✅ Chip buy-in validation
- ✅ Player addition/removal
- ✅ Room state consistency

### 2.3 Socket Event Tests (`socket.test.ts`)
**Events**:
- `game:action` - Player actions (fold, check, call, raise)
- `game:state` - Game state updates
- `room:update` - Room state updates

**Test Cases**:
- ✅ Action validation
- ✅ State synchronization across players
- ✅ Concurrent action handling
- ✅ Disconnect/reconnect scenarios

---

## 3. End-to-End Tests (Apps/Web)

### 3.1 E2E Test Plan (`tests/e2e/game.spec.ts`)
**Location**: `apps/web/tests/e2e/game.spec.ts`

**Test Scenarios**:

#### Scenario A: Player Registration & Login
```
Given: Fresh database
When: User registers with valid credentials
Then: User can login and sees lobby
```

#### Scenario B: Create Room & Basic Game Flow
```
Given: 2 players logged in
When: Player 1 creates room, Player 2 joins
Then: Game starts with correct blinds and player order
```

#### Scenario C: Pre-Flop Betting Sequence
```
Given: Game in pre-flop
When: Players act in order (fold, check, raise, call)
Then: Action proceeds to next player correctly
And: Chips deducted only when action completes
```

#### Scenario D: Complete Hand (Showdown)
```
Given: Game with 2+ players at showdown
When: Game resolves
Then: Winner determined correctly
And: Chips awarded properly
```

#### Scenario E: All-In Scenario
```
Given: Player with limited chips
When: Player goes all-in
Then: Can still win pot proportional to contribution
And: Other players can continue betting (side pot)
```

#### Scenario F: Player Disconnection
```
Given: Active game with disconnect
When: Player disconnects and reconnects
Then: Game state restored correctly
And: Player turn handled appropriately
```

---

## 4. Bug Fixes & Known Issues

### 4.1 Pre-Flop BB Check Bug ❌ → ✅
**Issue**: Game jumps to flop before Big Blind can act
**Root Cause**: Phase advancement triggered before all players act
**Fix**: Enhanced `isBettingRoundOver()` logic
**Test**: `test_bb_gets_action_preflop`

### 4.2 Fold Edge Case Bug ❌ → ✅
**Issue**: Game deals cards even when player folds pre-flop
**Root Cause**: Fold check doesn't skip to showdown
**Fix**: `advancePhase()` now checks remaining active players
**Test**: `test_fold_ends_hand_early`

### 4.3 Side Pot All-In Bug ❌ → ✅
**Issue**: All-in player wins entire pot instead of proportional amount
**Root Cause**: Missing side pot algorithm
**Fix**: Implemented proper side pot calculation in `resolveShowdown()`
**Test**: `test_side_pot_calculation`

### 4.4 DB Economy Balance Bug ❌ → ✅
**Issue**: Chips not deducted on bet, only on win
**Root Cause**: Action logic updates pot but not player chips immediately
**Fix**: Confirmed in `applyAction()` - chips deducted correctly
**Test**: `test_chip_deduction_on_action`

---

## 5. Test Metrics

| Category | Count | Status |
|----------|-------|--------|
| Unit Tests | 25+ | ✅ Implementing |
| Integration Tests | 20+ | ✅ Implementing |
| E2E Tests | 6+ | ✅ Implementing |
| **Total Coverage** | **50+** | ✅ |

---

## 6. Running Tests

### Run All Tests
```bash
bun test
```

### Run Specific Test Suite
```bash
bun test engine.test.ts
bun test hand.test.ts
bun test routes.test.ts
```

### Run E2E Tests (Playwright)
```bash
bun run test:e2e
```

### Generate Coverage Report
```bash
bun test --coverage
```

---

## 7. CI/CD Integration

Tests will be run on:
- ✅ Every commit (pre-commit hooks)
- ✅ Before deployment
- ✅ Pull requests (prevent merge if tests fail)

---

## 8. Key Testing Principles

1. **Deterministic**: Tests must produce consistent results
2. **Isolated**: Each test is independent
3. **Fast**: Unit tests < 1s, integration tests < 5s
4. **Clear**: Test names describe exact behavior
5. **Comprehensive**: Cover happy path + edge cases
