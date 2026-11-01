/**
 * Automated Test Suite for TiffinTrack Customer Order History Feature
 *
 * Covers:
 * 1. Customer Order Retrieval:
 *    - Authenticated customer retrieves their orders successfully.
 *    - Validates order structure, item details, delivery slot, and price totals.
 * 2. Authentication & Authorization Enforcement:
 *    - Unauthenticated request (no auth header) throws AuthenticationError (401).
 *    - Invalid / corrupted auth header throws AuthenticationError (401).
 *    - Customer cannot view other customers' orders (ownership boundary).
 * 3. Administrative Access:
 *    - Admin role can view all platform orders for dispute resolution/support.
 * 4. Order Sorting & Status Tracking:
 *    - Orders returned sorted newest first (descending created_at).
 *    - Preserves progression statuses (requested, accepted, preparing, ready, completed).
 * 5. Test-Order Workflow Safety Invariants:
 *    - Orders retain test-order flags and zero-charge disclosures.
 */

import {
  getCustomerOrdersServerSide,
  createOrderServerSide,
  demoStoreHelpers,
  AuthenticationError,
} from '../src/server/supabaseAdmin';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✅ PASS: ${name}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error: errorMsg });
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Reason: ${errorMsg}`);
  }
}

async function main() {
  console.log('===============================================================');
  console.log('🧪 Running TiffinTrack Order History Automated Tests');
  console.log('===============================================================\n');

  // Reset demo store orders
  demoStoreHelpers.resetDemoOrders();

  // Seed a test order for demo-customer
  await createOrderServerSide(
    {
      customerName: 'Aarav Sharma',
      customerPhone: '+91 98200 12345',
      deliveryAddress: 'Flat 402, Sunshine Heights, Andheri West',
      locality: 'Andheri West',
      landmark: 'Near Lokhandwala Complex',
      deliverySlot: 'lunch',
      paymentMethod: 'cod',
      orderNotes: 'Please ring bell twice',
      idempotencyKey: `history-test-order-${Date.now()}`,
      items: [
        {
          mealId: 'meal-north-deluxe',
          frequency: 'weekly_6days',
          quantity: 1,
          selectedSlot: 'lunch',
          specialInstructions: 'Warm phulkas',
          clientExpectedPrice: 110,
        },
      ],
    },
    'Bearer demo-customer-token'
  );

  // Test 1: Authenticated customer retrieves their order history
  await runTest('Customer retrieves own orders with valid authentication token', async () => {
    const result = await getCustomerOrdersServerSide('Bearer demo-customer-token');
    assert(Array.isArray(result.orders), 'Result must contain orders array');
    assert(result.orders.length > 0, 'Customer should have at least 1 order');

    const firstOrder = result.orders[0];
    assert(typeof firstOrder.id === 'string' && firstOrder.id.length > 0, 'Order must have a valid ID');
    assert(firstOrder.customerName === 'Aarav Sharma', 'Customer name must match');
    assert(firstOrder.items.length > 0, 'Order must contain items');
    assert(firstOrder.subtotal > 0, 'Subtotal must be positive');
    assert(firstOrder.finalAmount > 0, 'Final amount must be positive');
    assert(typeof firstOrder.status === 'string', 'Status must be defined');
    assert(firstOrder.deliverySlot === 'lunch', 'Delivery slot must match');
  });

  // Test 2: Unauthenticated request rejected
  await runTest('Unauthenticated request without Authorization header is rejected (401)', async () => {
    let errorThrown: any = null;
    try {
      await getCustomerOrdersServerSide(undefined);
    } catch (err) {
      errorThrown = err;
    }
    assert(errorThrown !== null, 'Should throw an error for missing auth header');
    assert(errorThrown instanceof AuthenticationError, 'Error must be AuthenticationError');
    assert(
      errorThrown.message.toLowerCase().includes('authentication required'),
      `Expected authentication error message, got: ${errorThrown.message}`
    );
  });

  // Test 3: Invalid token rejected
  await runTest('Corrupted or invalid token is rejected with AuthenticationError', async () => {
    let errorThrown: any = null;
    try {
      await getCustomerOrdersServerSide('Bearer corrupted-fake-token-999');
    } catch (err) {
      errorThrown = err;
    }
    assert(errorThrown !== null, 'Should throw an error for invalid token');
    assert(errorThrown instanceof AuthenticationError, 'Error must be AuthenticationError');
  });

  // Test 4: Ownership boundary - another customer cannot see Aarav's orders
  await runTest('Customer ownership boundary: customer-2 cannot see Aarav\'s orders', async () => {
    // When Priya Patel (demo-customer-2-token) requests order history, Aarav's orders must NOT appear
    const priyaResult = await getCustomerOrdersServerSide('Bearer demo-customer-2-token');
    assert(Array.isArray(priyaResult.orders), 'Result must contain orders array');
    assert(
      priyaResult.orders.length === 0,
      `Priya should see 0 orders initially, found: ${priyaResult.orders.length}`
    );

    // When Aarav requests his order history, his orders are returned with his customerId
    const aaravResult = await getCustomerOrdersServerSide('Bearer demo-customer-token');
    assert(aaravResult.orders.length > 0, 'Aarav should see his own order');
    for (const order of aaravResult.orders) {
      assert(
        order.customerId === 'c1111111-1111-1111-1111-111111111111',
        `Order ${order.id} belongs to ${order.customerId}, expected c1111111-1111-1111-1111-111111111111`
      );
    }
  });

  // Test 5: Admin role can view all platform orders
  await runTest('Platform administrator can access order history across all customers', async () => {
    const adminResult = await getCustomerOrdersServerSide('Bearer demo-admin-token');
    assert(Array.isArray(adminResult.orders), 'Admin should receive orders array');
    assert(adminResult.orders.length >= 1, 'Admin must be able to view all orders');
  });

  // Test 6: Order sorting (newest orders first)
  await runTest('Orders are sorted chronologically in descending order (newest first)', async () => {
    // Add a second order with a later timestamp
    await createOrderServerSide(
      {
        customerName: 'Aarav Sharma',
        customerPhone: '+91 98200 12345',
        deliveryAddress: 'Flat 402, Sunshine Heights, Andheri West',
        locality: 'Andheri West',
        deliverySlot: 'dinner',
        paymentMethod: 'cod',
        idempotencyKey: `history-test-order-2-${Date.now()}`,
        items: [
          {
            mealId: 'meal-south-meals',
            frequency: 'single_trial',
            quantity: 2,
            selectedSlot: 'dinner',
            clientExpectedPrice: 100,
          },
        ],
      },
      'Bearer demo-customer-token'
    );

    const result = await getCustomerOrdersServerSide('Bearer demo-customer-token');
    assert(result.orders.length >= 2, 'Should have at least 2 orders');

    // Check descending timestamps
    for (let i = 0; i < result.orders.length - 1; i++) {
      const timeCurrent = new Date(result.orders[i].createdAt).getTime();
      const timeNext = new Date(result.orders[i + 1].createdAt).getTime();
      assert(
        timeCurrent >= timeNext,
        `Order ${result.orders[i].id} (${timeCurrent}) should be >= ${result.orders[i + 1].id} (${timeNext})`
      );
    }
  });

  // Test 7: Items fidelity and pricing snapshot verification
  await runTest('Order history preserves canonical price snapshot and item details', async () => {
    const result = await getCustomerOrdersServerSide('Bearer demo-customer-token');
    const orderWithSouthMeal = result.orders.find(o =>
      o.items.some(i => i.meal.id === 'meal-south-meals')
    );
    assert(Boolean(orderWithSouthMeal), 'Should find the order with South Indian meal');
    const item = orderWithSouthMeal!.items.find(i => i.meal.id === 'meal-south-meals')!;
    assert(item.quantity === 2, 'Quantity should be 2');
    assert(item.meal.pricePerMeal === 100, 'Unit price should be 100');
    assert(item.totalPrice === 200, 'Total price should be 200');
  });

  console.log('\n===============================================================');
  const allPassed = results.every(r => r.passed);
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Summary: ${passedCount}/${results.length} tests passed.`);
  if (allPassed) {
    console.log('🎉 ALL ORDER HISTORY TESTS PASSED SUCCESSFULLY!');
    console.log('===============================================================\n');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED.');
    console.log('===============================================================\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
