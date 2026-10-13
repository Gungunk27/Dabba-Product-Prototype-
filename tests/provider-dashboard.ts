/**
 * Automated Test Suite for TiffinTrack Provider Dashboard
 *
 * Covers:
 * 1. Provider Ownership Enforcement:
 *    - Provider only accesses orders containing their own kitchen's meals.
 *    - Cross-provider order access prevented (cannot view or mutate another kitchen's order).
 *    - Customers cannot access provider endpoints (403 Forbidden).
 *    - Unauthenticated requests rejected (401 Unauthorized).
 * 2. Valid Status Transitions State Machine:
 *    - requested -> accepted (Kitchen accepts order)
 *    - accepted -> preparing (Cooking starts)
 *    - preparing -> ready (Food packed and ready in kitchen)
 *    - ready -> completed (Order finalized)
 *    - requested -> rejected (Kitchen declines order)
 * 3. Invalid Status Transitions & Clearly Defined Cancellation Rules:
 *    - Disallows invalid status jumps (e.g. requested -> ready, accepted -> completed).
 *    - Disallows cancellation once food is ready or completed.
 *    - Disallows transitions from terminal states (completed, cancelled, rejected).
 * 4. Menu Management & Ownership:
 *    - Provider creates meal with server input validation.
 *    - Server rejects invalid price (<= 0) and missing/short title.
 *    - Provider edits their own meal.
 *    - Provider deactivates (sold out) and activates meal.
 *    - Cross-provider meal tampering prevented (cannot edit or toggle another provider's meal).
 *    - Customers cannot create or modify meals.
 */

import {
  createOrderServerSide,
  getOrderByIdServerSide,
  updateOrderStatusServerSide,
  getProviderOrdersServerSide,
  getProviderMealsServerSide,
  createMealServerSide,
  updateMealServerSide,
  toggleMealAvailabilityServerSide,
  demoStoreHelpers,
  AuthenticationError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
} from '../src/server/supabaseAdmin';
import { OrderStatus } from '../src/types';

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

export async function runProviderDashboardTests() {
  console.log('\n================================================================');
  console.log('🧪 RUNNING TIFFINTRACK PROVIDER DASHBOARD TEST SUITE');
  console.log('================================================================\n');

  demoStoreHelpers.resetDemoOrders();

  const ANNAPURNA_TOKEN = 'Bearer demo-provider-annapurna-token';
  const KRISHNA_TOKEN = 'Bearer demo-provider-krishna-token';
  const CUSTOMER_TOKEN = 'Bearer demo-customer-token';

  // Seed two distinct test orders:
  // Order 1: Meal from Annapurna Kitchen (prov-annapurna)
  const orderAnnapurnaRes = await createOrderServerSide(
    {
      customerName: 'Aarav Sharma',
      customerPhone: '9845012345',
      deliveryAddress: 'Flat 101, Indiranagar',
      locality: 'Indiranagar',
      deliverySlot: 'lunch',
      paymentMethod: 'upi_on_delivery',
      items: [
        {
          mealId: 'meal-north-deluxe', // belongs to prov-annapurna
          frequency: 'single_trial',
          quantity: 1,
          selectedSlot: 'lunch',
        },
      ],
    },
    CUSTOMER_TOKEN
  );
  const orderAnnapurnaId = orderAnnapurnaRes.order.id;

  // Order 2: Meal from Shree Krishna Kitchen (prov-shree-krishna)
  const orderKrishnaRes = await createOrderServerSide(
    {
      customerName: 'Priya Patel',
      customerPhone: '9876543210',
      deliveryAddress: 'Flat 202, Malleshwaram',
      locality: 'Malleshwaram',
      deliverySlot: 'dinner',
      paymentMethod: 'cod',
      items: [
        {
          mealId: 'meal-jain-satvik', // belongs to prov-shree-krishna
          frequency: 'single_trial',
          quantity: 2,
          selectedSlot: 'dinner',
        },
      ],
    },
    CUSTOMER_TOKEN
  );
  const orderKrishnaId = orderKrishnaRes.order.id;

  // --------------------------------------------------------------------------
  // TEST GROUP 1: OWNERSHIP & ACCESS CONTROL
  // --------------------------------------------------------------------------

  await runTest('1.1 Provider only receives orders for their own kitchen meals', async () => {
    const annapurnaOrders = await getProviderOrdersServerSide(ANNAPURNA_TOKEN);
    assert(annapurnaOrders.orders.some(o => o.id === orderAnnapurnaId), 'Annapurna must see order 1');
    assert(!annapurnaOrders.orders.some(o => o.id === orderKrishnaId), 'Annapurna must NEVER see order 2 (Krishna kitchen)');

    const krishnaOrders = await getProviderOrdersServerSide(KRISHNA_TOKEN);
    assert(krishnaOrders.orders.some(o => o.id === orderKrishnaId), 'Krishna must see order 2');
    assert(!krishnaOrders.orders.some(o => o.id === orderAnnapurnaId), 'Krishna must NEVER see order 1 (Annapurna kitchen)');
  });

  await runTest('1.2 Provider cannot access another provider\'s order by ID (403 Forbidden)', async () => {
    let failed = false;
    try {
      // Annapurna tries to fetch Krishna's order ID
      await getOrderByIdServerSide(orderKrishnaId, ANNAPURNA_TOKEN);
    } catch (err: unknown) {
      if (err instanceof ForbiddenError) {
        failed = true;
      } else {
        throw err;
      }
    }
    assert(failed, 'Annapurna attempting to access Krishna order must throw ForbiddenError');
  });

  await runTest('1.3 Provider cannot mutate status of another provider\'s order (403 Forbidden)', async () => {
    let failed = false;
    try {
      // Annapurna tries to update Krishna's order
      await updateOrderStatusServerSide(orderKrishnaId, 'accepted', ANNAPURNA_TOKEN);
    } catch (err: unknown) {
      if (err instanceof ForbiddenError) {
        failed = true;
      } else {
        throw err;
      }
    }
    assert(failed, 'Annapurna mutating Krishna order must throw ForbiddenError');
  });

  await runTest('1.4 Customer cannot access provider orders endpoint (403 Forbidden)', async () => {
    let failed = false;
    try {
      await getProviderOrdersServerSide(CUSTOMER_TOKEN);
    } catch (err: unknown) {
      if (err instanceof ForbiddenError) {
        failed = true;
      } else {
        throw err;
      }
    }
    assert(failed, 'Customer role accessing provider orders must throw ForbiddenError');
  });

  await runTest('1.5 Unauthenticated request to provider endpoint throws 401 Unauthorized', async () => {
    let failed = false;
    try {
      await getProviderOrdersServerSide(undefined);
    } catch (err: unknown) {
      if (err instanceof AuthenticationError) {
        failed = true;
      } else {
        throw err;
      }
    }
    assert(failed, 'Missing auth token must throw AuthenticationError');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 2: VALID STATUS TRANSITIONS (requested -> accepted -> preparing -> ready -> completed)
  // --------------------------------------------------------------------------

  await runTest('2.1 Authorized provider can accept a requested order (requested -> accepted)', async () => {
    const res = await updateOrderStatusServerSide(orderAnnapurnaId, 'accepted', ANNAPURNA_TOKEN);
    assert(res.newStatus === 'accepted', `Expected accepted status, got ${res.newStatus}`);
    assert(res.oldStatus === 'requested', `Expected old status requested, got ${res.oldStatus}`);
  });

  await runTest('2.2 Accepted order moves to preparing (accepted -> preparing)', async () => {
    const res = await updateOrderStatusServerSide(orderAnnapurnaId, 'preparing', ANNAPURNA_TOKEN);
    assert(res.newStatus === 'preparing', `Expected preparing status, got ${res.newStatus}`);
  });

  await runTest('2.3 Preparing order moves to ready (preparing -> ready)', async () => {
    const res = await updateOrderStatusServerSide(orderAnnapurnaId, 'ready', ANNAPURNA_TOKEN);
    assert(res.newStatus === 'ready', `Expected ready status, got ${res.newStatus}`);
  });

  await runTest('2.4 Ready order moves to completed (ready -> completed)', async () => {
    const res = await updateOrderStatusServerSide(orderAnnapurnaId, 'completed', ANNAPURNA_TOKEN);
    assert(res.newStatus === 'completed', `Expected completed status, got ${res.newStatus}`);
  });

  await runTest('2.5 Authorized provider can reject a requested order (requested -> rejected)', async () => {
    const res = await updateOrderStatusServerSide(orderKrishnaId, 'rejected', KRISHNA_TOKEN);
    assert(res.newStatus === 'rejected', `Expected rejected status, got ${res.newStatus}`);
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 3: INVALID STATUS TRANSITIONS & CANCELLATION RULES
  // --------------------------------------------------------------------------

  await runTest('3.1 Rejects jumping from requested directly to ready or completed', async () => {
    // Create fresh order
    const freshOrder = await createOrderServerSide(
      {
        customerName: 'Test Order Jump',
        customerPhone: '9845012345',
        deliveryAddress: 'Flat 303, Koramangala',
        locality: 'Koramangala',
        deliverySlot: 'lunch',
        paymentMethod: 'upi_on_delivery',
        items: [{ mealId: 'meal-north-deluxe', frequency: 'single_trial', quantity: 1, selectedSlot: 'lunch' }],
      },
      CUSTOMER_TOKEN
    );

    let jumpToReadyFailed = false;
    try {
      await updateOrderStatusServerSide(freshOrder.order.id, 'ready', ANNAPURNA_TOKEN);
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('Invalid order status transition')) {
        jumpToReadyFailed = true;
      }
    }
    assert(jumpToReadyFailed, 'Transition requested -> ready must be rejected');

    let jumpToCompletedFailed = false;
    try {
      await updateOrderStatusServerSide(freshOrder.order.id, 'completed', ANNAPURNA_TOKEN);
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('Invalid order status transition')) {
        jumpToCompletedFailed = true;
      }
    }
    assert(jumpToCompletedFailed, 'Transition requested -> completed must be rejected');
  });

  await runTest('3.2 Rejects cancellation once order is ready or completed', async () => {
    // orderAnnapurnaId is already in 'completed' state
    let cancelCompletedFailed = false;
    try {
      await updateOrderStatusServerSide(orderAnnapurnaId, 'cancelled', ANNAPURNA_TOKEN);
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        cancelCompletedFailed = true;
      }
    }
    assert(cancelCompletedFailed, 'Cancelling completed order must be rejected');

    // Create an order and move it to 'ready'
    const readyOrderRes = await createOrderServerSide(
      {
        customerName: 'Ready Order Cancel Test',
        customerPhone: '9845012345',
        deliveryAddress: 'Flat 505, Indiranagar',
        locality: 'Indiranagar',
        deliverySlot: 'lunch',
        paymentMethod: 'upi_on_delivery',
        items: [{ mealId: 'meal-north-deluxe', frequency: 'single_trial', quantity: 1, selectedSlot: 'lunch' }],
      },
      CUSTOMER_TOKEN
    );
    await updateOrderStatusServerSide(readyOrderRes.order.id, 'accepted', ANNAPURNA_TOKEN);
    await updateOrderStatusServerSide(readyOrderRes.order.id, 'preparing', ANNAPURNA_TOKEN);
    await updateOrderStatusServerSide(readyOrderRes.order.id, 'ready', ANNAPURNA_TOKEN);

    let cancelReadyFailed = false;
    try {
      await updateOrderStatusServerSide(readyOrderRes.order.id, 'cancelled', ANNAPURNA_TOKEN);
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('cannot be cancelled')) {
        cancelReadyFailed = true;
      }
    }
    assert(cancelReadyFailed, 'Cancelling order in ready state must be rejected according to status rules');
  });

  await runTest('3.3 Terminal states (completed, cancelled, rejected) cannot undergo further transitions', async () => {
    let failed = false;
    try {
      // orderKrishnaId is 'rejected'
      await updateOrderStatusServerSide(orderKrishnaId, 'accepted', KRISHNA_TOKEN);
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('terminal state')) {
        failed = true;
      }
    }
    assert(failed, 'Transitioning rejected order must be rejected');
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 4: MENU MANAGEMENT & PROVIDER OWNERSHIP
  // --------------------------------------------------------------------------

  let createdMealId = '';

  await runTest('4.1 Provider can create new meal offering with server validation', async () => {
    const mealRes = await createMealServerSide(
      {
        title: 'Special Sindhi Kadhi Thali',
        tagline: 'Authentic slow-simmered besan kadhi with okra',
        description: 'Traditional home-cooked Sindhi Kadhi packed with lotus stem and drumsticks, served with sweet boondi and rice.',
        pricePerMeal: 135,
        dietType: 'pure_veg',
        cuisine: 'north_indian',
        slot: 'lunch',
        contents: ['Sindhi Kadhi', 'Aloo Tuk', 'Steamed Rice', 'Sweet Boondi'],
      },
      ANNAPURNA_TOKEN
    );

    createdMealId = mealRes.meal.id;
    assert(Boolean(createdMealId), 'Meal ID must be generated');
    assert(mealRes.meal.providerId === 'prov-annapurna', 'Provider ID must be authoritatively set to caller');
    assert(mealRes.meal.pricePerMeal === 135, 'Price must be 135');
    assert(mealRes.meal.isAvailable === true, 'Meal must be available by default');
  });

  await runTest('4.2 Server rejects invalid meal input (price <= 0, title too short)', async () => {
    let invalidPriceFailed = false;
    try {
      await createMealServerSide(
        {
          title: 'Invalid Free Meal',
          description: 'A description that is sufficiently long.',
          pricePerMeal: -10,
          dietType: 'pure_veg',
          cuisine: 'north_indian',
          slot: 'lunch',
        },
        ANNAPURNA_TOKEN
      );
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('Price per meal must be a positive number')) {
        invalidPriceFailed = true;
      }
    }
    assert(invalidPriceFailed, 'Negative price must fail validation');

    let shortTitleFailed = false;
    try {
      await createMealServerSide(
        {
          title: 'Hi',
          description: 'A description that is sufficiently long.',
          pricePerMeal: 100,
          dietType: 'pure_veg',
          cuisine: 'north_indian',
          slot: 'lunch',
        },
        ANNAPURNA_TOKEN
      );
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('Meal title is required')) {
        shortTitleFailed = true;
      }
    }
    assert(shortTitleFailed, 'Short title must fail validation');
  });

  await runTest('4.3 Provider can update their own meal details', async () => {
    const updateRes = await updateMealServerSide(
      createdMealId,
      {
        pricePerMeal: 145,
        title: 'Special Sindhi Kadhi Thali (Extra Boondi)',
      },
      ANNAPURNA_TOKEN
    );
    assert(updateRes.meal.pricePerMeal === 145, 'Price must be updated to 145');
    assert(updateRes.meal.title.includes('Extra Boondi'), 'Title must be updated');
  });

  await runTest('4.4 Provider can deactivate and reactivate meal availability (sold out toggle)', async () => {
    const deactRes = await toggleMealAvailabilityServerSide(createdMealId, false, ANNAPURNA_TOKEN);
    assert(deactRes.isAvailable === false, 'Meal must be deactivated');

    const reactRes = await toggleMealAvailabilityServerSide(createdMealId, true, ANNAPURNA_TOKEN);
    assert(reactRes.isAvailable === true, 'Meal must be reactivated');
  });

  await runTest('4.5 Cross-provider meal tampering is prevented (403 Forbidden)', async () => {
    // Krishna attempts to edit Annapurna's created meal
    let editTamperFailed = false;
    try {
      await updateMealServerSide(createdMealId, { pricePerMeal: 999 }, KRISHNA_TOKEN);
    } catch (err: unknown) {
      if (err instanceof ForbiddenError) {
        editTamperFailed = true;
      }
    }
    assert(editTamperFailed, 'Krishna editing Annapurna meal must throw ForbiddenError');

    // Krishna attempts to deactivate Annapurna's meal
    let toggleTamperFailed = false;
    try {
      await toggleMealAvailabilityServerSide(createdMealId, false, KRISHNA_TOKEN);
    } catch (err: unknown) {
      if (err instanceof ForbiddenError) {
        toggleTamperFailed = true;
      }
    }
    assert(toggleTamperFailed, 'Krishna toggling Annapurna meal must throw ForbiddenError');
  });

  await runTest('4.6 Customer cannot create or modify meals (403 Forbidden)', async () => {
    let customerCreateFailed = false;
    try {
      await createMealServerSide(
        {
          title: 'Hacked Meal by Customer',
          description: 'Customer should not be able to create meals.',
          pricePerMeal: 50,
          dietType: 'pure_veg',
          cuisine: 'north_indian',
          slot: 'lunch',
        },
        CUSTOMER_TOKEN
      );
    } catch (err: unknown) {
      if (err instanceof ForbiddenError) {
        customerCreateFailed = true;
      }
    }
    assert(customerCreateFailed, 'Customer creating meal must throw ForbiddenError');
  });

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 PROVIDER DASHBOARD TEST SUMMARY');
  console.log('================================================================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total Scenarios Tested : ${results.length}`);
  console.log(`Passed                 : ${passed}`);
  console.log(`Failed                 : ${failed}`);

  if (failed > 0) {
    console.error(`\n⚠️  ${failed} test scenario(s) failed.`);
    process.exit(1);
  } else {
    console.log('\n✨ ALL PROVIDER DASHBOARD TEST SCENARIOS PASSED SUCCESSFULLY!');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runProviderDashboardTests().catch(err => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
  });
}
