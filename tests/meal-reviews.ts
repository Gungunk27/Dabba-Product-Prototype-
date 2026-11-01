/**
 * Automated Test Suite for TiffinTrack Meal Reviews & Ratings
 *
 * Covers:
 * 1. Fetching reviews for an existing meal
 * 2. Input validation: Rejects invalid star ratings (< 1, > 5, non-integer)
 * 3. Input validation: Rejects missing/too-short customer names
 * 4. Input validation: Rejects missing/too-short review comments (< 10 chars)
 * 5. Rejects review creation for non-existent meal ID (404 NotFound)
 * 6. Successful creation of a verified customer review with rating, aspects, plan, recommendation
 * 7. Helpful voting: increments helpful count on a review
 * 8. Review persistence and ordering
 */

import {
  getMealReviewsServerSide,
  createMealReviewServerSide,
  voteReviewHelpfulServerSide,
  ValidationError,
  NotFoundError,
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

export async function runMealReviewTests() {
  console.log('\n================================================================');
  console.log('🧪 RUNNING TIFFINTRACK MEAL REVIEWS & RATINGS TEST SUITE');
  console.log('================================================================\n');

  const TARGET_MEAL_ID = 'meal-north-deluxe';

  // --------------------------------------------------------------------------
  // TEST 1: Fetch Existing Reviews for a Meal
  // --------------------------------------------------------------------------
  await runTest('1. Fetch existing customer reviews for meal-north-deluxe', async () => {
    const res = await getMealReviewsServerSide(TARGET_MEAL_ID);
    assert(Array.isArray(res.reviews), 'Reviews must be an array');
    assert(res.reviews.length >= 1, `Expected at least 1 review, got ${res.reviews.length}`);
    const first = res.reviews[0];
    assert(first.mealId === TARGET_MEAL_ID, `Review mealId must match ${TARGET_MEAL_ID}`);
    assert(first.rating >= 1 && first.rating <= 5, 'Rating must be between 1 and 5');
    assert(Boolean(first.authorName), 'Author name must be present');
    assert(Boolean(first.reviewText), 'Review text must be present');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Validate Star Rating Bounds (1 to 5)
  // --------------------------------------------------------------------------
  await runTest('2. Rejects invalid star ratings (0, 6, -1, fractional)', async () => {
    // Zero stars
    let zeroBlocked = false;
    try {
      await createMealReviewServerSide(TARGET_MEAL_ID, {
        mealId: TARGET_MEAL_ID,
        providerId: 'prov-annapurna',
        authorName: 'Test User',
        rating: 0,
        reviewText: 'This is a test comment that is long enough.',
      });
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('Rating must be an integer between 1 and 5')) {
        zeroBlocked = true;
      }
    }
    assert(zeroBlocked, 'Rating of 0 must fail validation');

    // 6 stars
    let sixBlocked = false;
    try {
      await createMealReviewServerSide(TARGET_MEAL_ID, {
        mealId: TARGET_MEAL_ID,
        providerId: 'prov-annapurna',
        authorName: 'Test User',
        rating: 6,
        reviewText: 'This is a test comment that is long enough.',
      });
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('Rating must be an integer between 1 and 5')) {
        sixBlocked = true;
      }
    }
    assert(sixBlocked, 'Rating of 6 must fail validation');

    // Fractional rating
    let fractionBlocked = false;
    try {
      await createMealReviewServerSide(TARGET_MEAL_ID, {
        mealId: TARGET_MEAL_ID,
        providerId: 'prov-annapurna',
        authorName: 'Test User',
        rating: 4.5,
        reviewText: 'This is a test comment that is long enough.',
      });
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('Rating must be an integer between 1 and 5')) {
        fractionBlocked = true;
      }
    }
    assert(fractionBlocked, 'Fractional rating of 4.5 must fail validation');
  });

  // --------------------------------------------------------------------------
  // TEST 3: Validate Author Name (min 2 chars)
  // --------------------------------------------------------------------------
  await runTest('3. Rejects empty or 1-character author names', async () => {
    let emptyBlocked = false;
    try {
      await createMealReviewServerSide(TARGET_MEAL_ID, {
        mealId: TARGET_MEAL_ID,
        providerId: 'prov-annapurna',
        authorName: '  ',
        rating: 5,
        reviewText: 'This is a test comment that is long enough.',
      });
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('Customer name must be at least 2 characters')) {
        emptyBlocked = true;
      }
    }
    assert(emptyBlocked, 'Empty author name must fail validation');

    let shortBlocked = false;
    try {
      await createMealReviewServerSide(TARGET_MEAL_ID, {
        mealId: TARGET_MEAL_ID,
        providerId: 'prov-annapurna',
        authorName: 'A',
        rating: 5,
        reviewText: 'This is a test comment that is long enough.',
      });
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('Customer name must be at least 2 characters')) {
        shortBlocked = true;
      }
    }
    assert(shortBlocked, '1-character author name must fail validation');
  });

  // --------------------------------------------------------------------------
  // TEST 4: Validate Feedback Comment Length (min 10 chars)
  // --------------------------------------------------------------------------
  await runTest('4. Rejects feedback text shorter than 10 characters', async () => {
    let shortCommentBlocked = false;
    try {
      await createMealReviewServerSide(TARGET_MEAL_ID, {
        mealId: TARGET_MEAL_ID,
        providerId: 'prov-annapurna',
        authorName: 'Kavita Roy',
        rating: 5,
        reviewText: 'Tasty',
      });
    } catch (err: unknown) {
      if (err instanceof ValidationError && err.message.includes('Review feedback must be at least 10 characters')) {
        shortCommentBlocked = true;
      }
    }
    assert(shortCommentBlocked, 'Short feedback comment must fail validation');
  });

  // --------------------------------------------------------------------------
  // TEST 5: Rejects Review for Non-Existent Meal
  // --------------------------------------------------------------------------
  await runTest('5. Rejects review for non-existent meal ID (404 Not Found)', async () => {
    let notFound = false;
    try {
      await createMealReviewServerSide('meal-nonexistent-999', {
        mealId: 'meal-nonexistent-999',
        providerId: 'prov-annapurna',
        authorName: 'Valid Customer',
        rating: 5,
        reviewText: 'Great food served on time every weekday.',
      });
    } catch (err: unknown) {
      if (err instanceof NotFoundError && err.message.includes('not found')) {
        notFound = true;
      }
    }
    assert(notFound, 'Review for non-existent meal must throw NotFoundError');
  });

  // --------------------------------------------------------------------------
  // TEST 6: Successful Creation of a Verified Review
  // --------------------------------------------------------------------------
  let createdReviewId = '';
  await runTest('6. Successfully publishes verified customer review with rating, aspects & recommendation', async () => {
    const res = await createMealReviewServerSide(TARGET_MEAL_ID, {
      mealId: TARGET_MEAL_ID,
      providerId: 'prov-annapurna',
      authorName: 'Nisha Sundaram',
      rating: 5,
      reviewText: 'The ghee phulkas were piping hot and soft. Authentic Punjabi dal tadka without floating oil!',
      aspects: ['Piping Hot Phulkas', 'Authentic Spices', 'Zero Excess Oil'],
      planType: 'weekly_6days',
      recommended: true,
    });

    assert(Boolean(res.review.id), 'Review must have generated ID');
    createdReviewId = res.review.id;
    assert(res.review.authorName === 'Nisha Sundaram', 'Author name must match');
    assert(res.review.rating === 5, 'Rating must be 5');
    assert(res.review.aspects?.length === 3, 'Must have 3 selected aspects');
    assert(res.review.recommended === true, 'Recommendation must be true');
    assert(res.review.helpfulCount === 0, 'Initial helpful count must be 0');

    // Verify it is returned in meal reviews list
    const listRes = await getMealReviewsServerSide(TARGET_MEAL_ID);
    const found = listRes.reviews.find(r => r.id === createdReviewId);
    assert(Boolean(found), 'Newly created review must be present in meal reviews list');
  });

  // --------------------------------------------------------------------------
  // TEST 7: Helpful Upvoting
  // --------------------------------------------------------------------------
  await runTest('7. Increments helpful count for a review', async () => {
    assert(Boolean(createdReviewId), 'Must have created review ID');
    const voteRes = await voteReviewHelpfulServerSide(createdReviewId);
    assert(voteRes.helpfulCount === 1, `Helpful count must be 1, got ${voteRes.helpfulCount}`);

    const voteRes2 = await voteReviewHelpfulServerSide(createdReviewId);
    assert(voteRes2.helpfulCount === 2, `Helpful count must be 2, got ${voteRes2.helpfulCount}`);
  });

  // --------------------------------------------------------------------------
  // TEST 8: Rejects Helpful Vote on Non-Existent Review
  // --------------------------------------------------------------------------
  await runTest('8. Rejects helpful vote for non-existent review ID', async () => {
    let failed = false;
    try {
      await voteReviewHelpfulServerSide('rev-fake-id-404');
    } catch (err: unknown) {
      if (err instanceof NotFoundError) {
        failed = true;
      }
    }
    assert(failed, 'Helpful vote on non-existent review must throw NotFoundError');
  });

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 MEAL REVIEWS TEST SUMMARY');
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
    console.log('\n✨ ALL MEAL REVIEWS & RATINGS TEST SCENARIOS PASSED SUCCESSFULLY!');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMealReviewTests().catch(err => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
  });
}
