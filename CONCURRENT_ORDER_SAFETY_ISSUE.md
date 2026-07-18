## Concurrent Order Safety Analysis

**Issue**: Even with MongoDB transactions, simultaneous orders can overspend balance.

**Root Cause**: Transactions use SNAPSHOT isolation, not SERIALIZABLE isolation.

**Attack Scenario**:
```
Initial state: User balance = $10,000

Order 1 (Buy $8,000)              Order 2 (Buy $8,000)
T1: Start transaction              T2: Start transaction
T2: Read balance = $10,000         T1: Read balance = $10,000
T3: Check 10000 >= 8000 ✓          T4: Check 10000 >= 8000 ✓
T4: Deduct: 10000 - 8000 = 2000    T5: Deduct: 10000 - 8000 = 2000
T5: Commit Transaction 1            T6: Commit Transaction 2
    balance = $2,000                   balance = $2,000 (overwrites!)

Result: Both orders succeed
Balance shows: $2,000
But both users think they spent $8,000 each = $16,000 total
User is now $6,000 over their limit!
```

**Why Transactions Alone Don't Prevent This**:
- MongoDB uses snapshot isolation by default
- Each transaction reads a snapshot of data at transaction start
- Transaction A and B both start, both read balance=$10,000
- Transactions execute independently
- Even though they're "atomic", they don't serialize

**Current Code Status**:
✗ NO PROTECTION against concurrent orders on same user
✗ NO application-level locking
✗ NO pessimistic locking (atomic findOneAndUpdate)

**Proof in Code** (server/services/orderService.js):
```javascript
// T1: Read balance within transaction
const user = await User.findById(order.userId).session(session);

// T2: Check balance
if (user.balance < totalCost) {
  return setRejected(order, "Insufficient balance");
}

// T3-T4: Deduct and save
user.balance -= totalCost;
await user.save({ session });
```

If two requests read user at the same time (both snapshot the balance), both pass the check, both deduct.

**Required Fix** (not yet implemented):
1. Option A: Use atomic findOneAndUpdate with balance check
   ```javascript
   const result = await User.findByIdAndUpdate(
     order.userId,
     { $inc: { balance: -totalCost } },
     { new: true }
   );
   if (!result || result.balance < 0) {
     // Insufficient funds - reject and refund
   }
   ```

2. Option B: Add application-level lock (mutex) per user
   ```javascript
   const userLock = locks.get(order.userId);
   await userLock.acquire();
   try {
     // Atomic operation
   } finally {
     userLock.release();
   }
   ```

**Status**: 🔴 NOT FIXED YET
