/**
 * Automated Test Suite for TiffinTrack Test-Order Workflow End-to-End
 *
 * Covers:
 * 1. Valid orders (starts in 'requested', derives customer from session, validates totals & snapshot)
 * 2. Unavailable meals & inactive providers
 * 3. Invalid quantities (0, negative, >50, non-integer)
 * 4. Changed / tampered prices (authoritative canonical snapshot)
 * 5. Unauthenticated users (401 Unauthorized)
 * 6. Unauthorized access (403 Forbidden for cross-user order access)
 * 7. Duplicate submission prevention (idempotency key & rapid double-click guard)
 * 8. Status transition state machine (requested -> confirmed -> preparing -> dispatched -> delivered)
 */

import {
  createOrderServerSide,
  getOrderByIdServerSide,
  updateOrderStatusServerSide,
  demoStoreHelpers,
  AuthenticationError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
} from '../src/server/supabaseAdmin';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
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

export async function runAllTests() {
  console.log('\n================================================================');
  console.log('🧪 RUNNING TIFFINTRACK TEST-ORDER WORKFLOW END-TO-END SUITE');
  console.log('================================================================\n');

  // Reset demo store before running tests
  demoStoreHelpers.resetDemoOrders();

  // --------------------------------------------------------------------------
  // TEST 1: Valid Order (Happy Path)
  // --------------------------------------------------------------------------
  await runTest('1. Valid order starts in requested status with canonical price snapshot', async () => {
    const payload = {
      customerName: 'Aarav Sharma (Test Customer)',
      customerPhone: '9845012345',
      deliveryAddress: '[TEST ADDRESS] Flat 402, Palm Grove Demo Tower, 100 Feet Road',
      locality: 'Indiranagar',
      landmark: '[TEST] Opp Metro Pillar 104',
      deliverySlot: 'lunch' as const,
      paymentMethod: 'upi_on_delivery' as const,
      orderNotes: 'Please ring bell once.',
      idempotencyKey: 'test-valid-order-1',
      items: [
        {
          mealId: 'meal-north-deluxe',
          frequency: 'single_trial' as const,
          quantity: 2,
          selectedSlot: 'lunch' as const,
        },
      ],
    };

    const authHeader = 'Bearer demo-customer-token';
    const result = await createOrderServerSide(payload, authHeader);

    assert(Boolean(result.order.id), 'Order ID must be generated');
    assert(result.order.id.startsWith('TT-2026-'), 'Order ID must follow TT-2026- format');
    assert(result.order.status === 'requested', `Status must be 'requested', got '${result.order.status}'`);
    assert(result.order.customerId === 'c1111111-1111-1111-1111-111111111111', 'Customer ID must be derived from session');
    assert(result.order.items.length === 1, 'Order must contain 1 item');
    assert(result.order.items[0].quantity === 2, 'Quantity must be 2');
    assert(result.order.items[0].meal.pricePerMeal === 110, 'Canonical price must be 110');
    assert(result.order.subtotal === 220, `Subtotal must be 220, got ${result.order.subtotal}`);
    assert(result.order.deliveryFee === 0, 'Orders >= 200 get free delivery');
    assert(result.order.packagingFee === 30, 'Stainless dabba packaging fee must be 30');
    assert(result.order.discount === 20, 'Orders > 150 get welcome discount 20');
    assert(result.order.finalAmount === 230, `Final amount must be 230 (220+30-20), got ${result.order.finalAmount}`);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Unavailable Meal Rejection
  // --------------------------------------------------------------------------
  await runTest('2. Rejects order when meal is unavailable or sold out', async () => {
    // Mark meal unavailable in demo store
    demoStoreHelpers.setMealAvailability('meal-north-deluxe', false);

    let failedAsExpected = false;
    try {
      await createOrderServerSide(
        {
          customerName: 'Aarav Sharma',
          customerPhone: '9845012345',
          deliveryAddress: 'Flat 402, Palm Grove Demo Tower',
          locality: 'Indiranagar',
          deliverySlot: 'lunch',
          paymentMethod: 'upi_on_delivery',
          items: [
            {
              mealId: 'meal-north-deluxe',
              frequency: 'single_trial',
              quantity: 1,
              selectedSlot: 'lunch',
            },
          ],
        },
        'Bearer demo-customer-token'
      );
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('unavailable or sold out')) {
        failedAsExpected = true;
      } else {
        throw err;
      }
    } finally {
      // Restore availability
      demoStoreHelpers.setMealAvailability('meal-north-deluxe', true);
    }

    assert(failedAsExpected, 'Expected ValidationError for unavailable meal');
  });

  // --------------------------------------------------------------------------
  // TEST 3: Inactive Provider Rejection
  // --------------------------------------------------------------------------
  await runTest('3. Rejects order when kitchen provider is inactive', async () => {
    // Mark provider inactive
    demoStoreHelpers.setProviderActive('prov-annapurna', false);

    let failedAsExpected = false;
    try {
      await createOrderServerSide(
        {
          customerName: 'Aarav Sharma',
          customerPhone: '9845012345',
          deliveryAddress: 'Flat 402, Palm Grove Demo Tower',
          locality: 'Indiranagar',
          deliverySlot: 'lunch',
          paymentMethod: 'upi_on_delivery',
          items: [
            {
              mealId: 'meal-north-deluxe',
              frequency: 'single_trial',
              quantity: 1,
              selectedSlot: 'lunch',
            },
          ],
        },
        'Bearer demo-customer-token'
      );
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('currently inactive')) {
        failedAsExpected = true;
      } else {
        throw err;
      }
    } finally {
      // Restore provider active status
      demoStoreHelpers.setProviderActive('prov-annapurna', true);
    }

    assert(failedAsExpected, 'Expected ValidationError for inactive provider');
  });

  // --------------------------------------------------------------------------
  // TEST 4: Invalid Quantities (0, negative, >50, non-integer)
  // --------------------------------------------------------------------------
  await runTest('4. Rejects invalid quantities (0, negative, >50, fractional)', async () => {
    const invalidQuantities = [0, -1, 51, 2.5];

    for (const qty of invalidQuantities) {
      let rejected = false;
      try {
        await createOrderServerSide(
          {
            customerName: 'Aarav Sharma',
            customerPhone: '9845012345',
            deliveryAddress: 'Flat 402, Palm Grove Demo Tower',
            locality: 'Indiranagar',
            deliverySlot: 'lunch',
            paymentMethod: 'upi_on_delivery',
            items: [
              {
                mealId: 'meal-north-deluxe',
                frequency: 'single_trial',
                quantity: qty,
                selectedSlot: 'lunch',
              },
            ],
          },
          'Bearer demo-customer-token'
        );
      } catch (err: unknown) {
        if (err instanceof ValidationError && err.message.includes('Invalid quantity')) {
          rejected = true;
        }
      }
      assert(rejected, `Expected quantity ${qty} to be rejected with ValidationError`);
    }
  });

  // --------------------------------------------------------------------------
  // TEST 5: Changed / Tampered Prices Protection
  // --------------------------------------------------------------------------
  await runTest('5. Authoritative price calculation ignores client price tampering', async () => {
    const payload = {
      customerName: 'Aarav Sharma',
      customerPhone: '9845012345',
      deliveryAddress: 'Flat 402, Palm Grove Demo Tower',
      locality: 'Indiranagar',
      deliverySlot: 'lunch' as const,
      paymentMethod: 'upi_on_delivery' as const,
      idempotencyKey: 'test-tampered-price-1',
      items: [
        {
          mealId: 'meal-north-deluxe',
          frequency: 'single_trial' as const,
          quantity: 1,
          selectedSlot: 'lunch' as const,
          clientExpectedPrice: 1, // Tampered client rate (trying to pay ₹1 instead of ₹110)
        },
      ],
    };

    const result = await createOrderServerSide(payload, 'Bearer demo-customer-token');

    // Server must enforce canonical price ₹110
    assert(result.order.items[0].meal.pricePerMeal === 110, 'Must use canonical rate 110');
    assert(result.order.subtotal === 110, 'Subtotal must be 110, not tampered 1');
    assert(result.order.packagingFee === 30, 'Packaging fee must be 30');
    assert(result.order.deliveryFee === 25, 'Delivery fee for orders < 200 must be 25');
    assert(result.order.finalAmount === 165, `Final amount must be 165 (110+30+25), got ${result.order.finalAmount}`);
  });

  // --------------------------------------------------------------------------
  // TEST 6: Unauthenticated Users
  // --------------------------------------------------------------------------
  await runTest('6. Rejects unauthenticated order submission with 401 Unauthorized', async () => {
    let rejectedNoHeader = false;
    try {
      await createOrderServerSide(
        {
          customerName: 'Aarav Sharma',
          customerPhone: '9845012345',
          deliveryAddress: 'Flat 402, Palm Grove Demo Tower',
          locality: 'Indiranagar',
          deliverySlot: 'lunch',
          paymentMethod: 'upi_on_delivery',
          items: [
            {
              mealId: 'meal-north-deluxe',
              frequency: 'single_trial',
              quantity: 1,
              selectedSlot: 'lunch',
            },
          ],
        },
        undefined // No auth header
      );
    } catch (err: unknown) {
      if (err instanceof AuthenticationError) {
        rejectedNoHeader = true;
      }
    }
    assert(rejectedNoHeader, 'Expected AuthenticationError when no auth header provided');

    let rejectedInvalidToken = false;
    try {
      await createOrderServerSide(
        {
          customerName: 'Aarav Sharma',
          customerPhone: '9845012345',
          deliveryAddress: 'Flat 402, Palm Grove Demo Tower',
          locality: 'Indiranagar',
          deliverySlot: 'lunch',
          paymentMethod: 'upi_on_delivery',
          items: [
            {
              mealId: 'meal-north-deluxe',
              frequency: 'single_trial',
              quantity: 1,
              selectedSlot: 'lunch',
            },
          ],
        },
        'Bearer bogus-fake-token-999'
      );
    } catch (err: unknown) {
      if (err instanceof AuthenticationError) {
        rejectedInvalidToken = true;
      }
    }
    assert(rejectedInvalidToken, 'Expected AuthenticationError with invalid token');
  });

  // --------------------------------------------------------------------------
  // TEST 7: Unauthorized Cross-User Access (Ownership Enforcement)
  // --------------------------------------------------------------------------
  await runTest('7. Rejects unauthorized access to orders belonging to other customers with 403 Forbidden', async () => {
    // Customer 1 creates Order X
    const createResult = await createOrderServerSide(
      {
        customerName: 'Aarav Sharma',
        customerPhone: '9845012345',
        deliveryAddress: 'Flat 402, Palm Grove Demo Tower',
        locality: 'Indiranagar',
        deliverySlot: 'lunch',
        paymentMethod: 'upi_on_delivery',
        idempotencyKey: 'test-ownership-order-1',
        items: [
          {
            mealId: 'meal-north-deluxe',
            frequency: 'single_trial',
            quantity: 1,
            selectedSlot: 'lunch',
          },
        ],
      },
      'Bearer demo-customer-token' // Customer 1
    );

    const orderId = createResult.order.id;

    // Customer 1 viewing their own order -> SUCCESS
    const ownerView = await getOrderByIdServerSide(orderId, 'Bearer demo-customer-token');
    assert(ownerView.order.id === orderId, 'Owner can access their own order');

    // Customer 2 attempting to view Customer 1's order -> 403 FORBIDDEN
    let forbiddenCaught = false;
    try {
      await getOrderByIdServerSide(orderId, 'Bearer demo-customer-2-token');
    } catch (err: unknown) {
      if (err instanceof ForbiddenError) {
        forbiddenCaught = true;
      }
    }
    assert(forbiddenCaught, 'Expected ForbiddenError when another user attempts access');

    // Admin viewing the order -> SUCCESS
    const adminView = await getOrderByIdServerSide(orderId, 'Bearer demo-admin-token');
    assert(adminView.order.id === orderId, 'Admin can view any order');
  });

  // --------------------------------------------------------------------------
  // TEST 8: Duplicate Submission Prevention (Idempotency)
  // --------------------------------------------------------------------------
  await runTest('8. Prevents duplicate order creation on repeated submission (Idempotency)', async () => {
    const idempotencyKey = 'test-idemp-rapid-click-123';
    const payload = {
      customerName: 'Aarav Sharma',
      customerPhone: '9845012345',
      deliveryAddress: 'Flat 402, Palm Grove Demo Tower',
      locality: 'Indiranagar',
      deliverySlot: 'lunch' as const,
      paymentMethod: 'upi_on_delivery' as const,
      idempotencyKey,
      items: [
        {
          mealId: 'meal-north-deluxe',
          frequency: 'single_trial' as const,
          quantity: 3,
          selectedSlot: 'lunch' as const,
        },
      ],
    };

    const first = await createOrderServerSide(payload, 'Bearer demo-customer-token');
    assert(!first.isDuplicate, 'First submission is not a duplicate');

    // Repeated immediate submission with same idempotency key
    const second = await createOrderServerSide(payload, 'Bearer demo-customer-token');
    assert(second.isDuplicate === true, 'Second submission flagged as duplicate');
    assert(second.order.id === first.order.id, 'Returned order must match initial order');
  });

  // --------------------------------------------------------------------------
  // TEST 9: Order Status Transition Machine
  // --------------------------------------------------------------------------
  await runTest('9. Enforces state transitions from requested -> confirmed -> preparing -> dispatched -> delivered', async () => {
    const createResult = await createOrderServerSide(
      {
        customerName: 'Aarav Sharma',
        customerPhone: '9845012345',
        deliveryAddress: 'Flat 402, Palm Grove Demo Tower',
        locality: 'Indiranagar',
        deliverySlot: 'lunch',
        paymentMethod: 'upi_on_delivery',
        idempotencyKey: 'test-transitions-order-1',
        items: [
          {
            mealId: 'meal-north-deluxe',
            frequency: 'single_trial',
            quantity: 1,
            selectedSlot: 'lunch',
          },
        ],
      },
      'Bearer demo-customer-token'
    );

    const orderId = createResult.order.id;
    assert(createResult.order.status === 'requested', 'Initial state must be requested');

    // Customer attempting to update status directly -> FORBIDDEN
    let customerBlocked = false;
    try {
      await updateOrderStatusServerSide(orderId, 'confirmed', 'Bearer demo-customer-token');
    } catch (err: unknown) {
      if (err instanceof ForbiddenError) {
        customerBlocked = true;
      }
    }
    assert(customerBlocked, 'Customer cannot update status directly');

    // Provider accepting: requested -> confirmed
    const t1 = await updateOrderStatusServerSide(orderId, 'confirmed', 'Bearer demo-provider-token');
    assert(t1.newStatus === 'confirmed', 'Transitioned to confirmed');

    // Provider cooking: confirmed -> preparing
    const t2 = await updateOrderStatusServerSide(orderId, 'preparing', 'Bearer demo-provider-token');
    assert(t2.newStatus === 'preparing', 'Transitioned to preparing');

    // Provider dispatching: preparing -> dispatched
    const t3 = await updateOrderStatusServerSide(orderId, 'dispatched', 'Bearer demo-provider-token');
    assert(t3.newStatus === 'dispatched', 'Transitioned to dispatched');

    // Provider completing: dispatched -> delivered
    const t4 = await updateOrderStatusServerSide(orderId, 'delivered', 'Bearer demo-provider-token');
    assert(t4.newStatus === 'delivered', 'Transitioned to delivered');

    // Terminal state: delivered -> anything else MUST fail
    let terminalBlocked = false;
    try {
      await updateOrderStatusServerSide(orderId, 'confirmed', 'Bearer demo-provider-token');
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('Terminal state')) {
        terminalBlocked = true;
      }
    }
    assert(terminalBlocked, 'Terminal delivered state cannot transition back');
  });

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 TEST EXECUTION SUMMARY');
  console.log('================================================================');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`Total Scenarios Tested : ${results.length}`);
  console.log(`Passed                 : ${passedCount}`);
  console.log(`Failed                 : ${failedCount}`);

  if (failedCount > 0) {
    console.error('\n❌ SOME TESTS FAILED:');
    results.filter(r => !r.passed).forEach(r => console.error(` - ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log('\n✨ ALL TEST SCENARIOS PASSED SUCCESSFULLY!');
  }
}

// Self-executing if run directly via tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(err => {
    console.error('Test execution fatal error:', err);
    process.exit(1);
  });
}
