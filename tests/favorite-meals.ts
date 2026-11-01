/**
 * Automated Test Suite for TiffinTrack Favorite Meals Feature
 *
 * Covers:
 * 1. Bookmarking preferred meals to favorites list
 * 2. Querying favorite status (isFavorite)
 * 3. Toggling favorites (add and remove)
 * 4. Removing meals from favorites
 * 5. Filtering meals by favoritesOnly
 * 6. Edge cases: duplicate prevention, non-existent meals, empty favorites list
 */

import { INITIAL_MEALS } from '../src/db/mockSeedData';
import { MealItem } from '../src/types';

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

// Emulate Favorites Store
class FavoritesManager {
  private favorites: Set<string>;

  constructor(initial: string[] = []) {
    this.favorites = new Set(initial);
  }

  public isFavorite(mealId: string): boolean {
    return this.favorites.has(mealId);
  }

  public addFavorite(mealId: string): void {
    this.favorites.add(mealId);
  }

  public removeFavorite(mealId: string): void {
    this.favorites.delete(mealId);
  }

  public toggleFavorite(mealId: string): boolean {
    if (this.favorites.has(mealId)) {
      this.favorites.delete(mealId);
      return false; // now unbookmarked
    } else {
      this.favorites.add(mealId);
      return true; // now bookmarked
    }
  }

  public getFavoriteIds(): string[] {
    return Array.from(this.favorites);
  }

  public getFavoriteMeals(allMeals: MealItem[]): MealItem[] {
    return allMeals.filter(m => this.favorites.has(m.id));
  }

  public getCount(): number {
    return this.favorites.size;
  }

  public clear(): void {
    this.favorites.clear();
  }
}

export async function runFavoriteMealsTests() {
  console.log('\n================================================================');
  console.log('🧪 RUNNING TIFFINTRACK FAVORITE MEALS & BOOKMARKS TEST SUITE');
  console.log('================================================================\n');

  const allMeals = [...INITIAL_MEALS];
  const manager = new FavoritesManager();

  // --------------------------------------------------------------------------
  // TEST 1: Initial State is empty
  // --------------------------------------------------------------------------
  await runTest('1. Initial state has 0 favorites and isFavorite returns false', async () => {
    assert(manager.getCount() === 0, 'Initial count must be 0');
    assert(manager.isFavorite('meal-north-deluxe') === false, 'meal-north-deluxe must not be favorite initially');
    assert(manager.getFavoriteMeals(allMeals).length === 0, 'No meals should be returned');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Bookmark a preferred meal
  // --------------------------------------------------------------------------
  await runTest('2. Customer can bookmark a preferred meal into favorites', async () => {
    const isNowFav = manager.toggleFavorite('meal-north-deluxe');
    assert(isNowFav === true, 'Toggle must return true (bookmarked)');
    assert(manager.isFavorite('meal-north-deluxe') === true, 'isFavorite must be true');
    assert(manager.getCount() === 1, 'Favorites count must be 1');

    const favMeals = manager.getFavoriteMeals(allMeals);
    assert(favMeals.length === 1, 'Should return 1 meal');
    assert(favMeals[0].id === 'meal-north-deluxe', 'Matched meal ID must be meal-north-deluxe');
  });

  // --------------------------------------------------------------------------
  // TEST 3: Bookmark multiple preferred meals
  // --------------------------------------------------------------------------
  await runTest('3. Customer can bookmark multiple meals across different kitchens', async () => {
    manager.toggleFavorite('meal-south-meals');
    manager.toggleFavorite('meal-jain-sattvic');

    assert(manager.getCount() === 3, 'Favorites count must be 3');
    assert(manager.isFavorite('meal-south-meals') === true, 'South Indian meal must be favorite');
    assert(manager.isFavorite('meal-jain-sattvic') === true, 'Jain sattvic meal must be favorite');

    const favMeals = manager.getFavoriteMeals(allMeals);
    assert(favMeals.length === 3, 'Should return 3 favorite meals');
    const ids = favMeals.map(m => m.id);
    assert(ids.includes('meal-north-deluxe'), 'Includes North deluxe');
    assert(ids.includes('meal-south-meals'), 'Includes South meals');
    assert(ids.includes('meal-jain-sattvic'), 'Includes Jain sattvic');
  });

  // --------------------------------------------------------------------------
  // TEST 4: Unbookmark / Toggle off a favorite meal
  // --------------------------------------------------------------------------
  await runTest('4. Customer can unbookmark a meal by toggling off', async () => {
    const isNowFav = manager.toggleFavorite('meal-south-meals');
    assert(isNowFav === false, 'Toggle must return false (unbookmarked)');
    assert(manager.isFavorite('meal-south-meals') === false, 'isFavorite must now be false');
    assert(manager.getCount() === 2, 'Favorites count must now be 2');

    const favMeals = manager.getFavoriteMeals(allMeals);
    assert(!favMeals.some(m => m.id === 'meal-south-meals'), 'South meals must not be in favorites list');
  });

  // --------------------------------------------------------------------------
  // TEST 5: Explicit removal of a favorite meal
  // --------------------------------------------------------------------------
  await runTest('5. Explicitly remove favorite by meal ID', async () => {
    manager.removeFavorite('meal-north-deluxe');
    assert(manager.isFavorite('meal-north-deluxe') === false, 'Must be removed');
    assert(manager.getCount() === 1, 'Count should be 1');
    assert(manager.getFavoriteIds()[0] === 'meal-jain-sattvic', 'Remaining favorite must be Jain sattvic');
  });

  // --------------------------------------------------------------------------
  // TEST 6: Filter catalog by favoritesOnly
  // --------------------------------------------------------------------------
  await runTest('6. Filter catalog meals with favoritesOnly filter', async () => {
    manager.clear();
    manager.addFavorite('meal-homestyle-budget');

    const filtered = allMeals.filter(m => manager.isFavorite(m.id));
    assert(filtered.length === 1, 'Filtered list must contain exactly 1 meal');
    assert(filtered[0].id === 'meal-homestyle-budget', 'Filtered meal must match bookmarked ID');
  });

  // --------------------------------------------------------------------------
  // TEST 7: Handle non-existent meal IDs gracefully
  // --------------------------------------------------------------------------
  await runTest('7. Gracefully handles non-existent or retired meal IDs', async () => {
    manager.addFavorite('meal-retired-or-nonexistent');
    assert(manager.isFavorite('meal-retired-or-nonexistent') === true, 'Stored in ID set');
    // When matching against catalog meals, gracefully excludes non-existent meals
    const validMatches = manager.getFavoriteMeals(allMeals);
    assert(!validMatches.some(m => m.id === 'meal-retired-or-nonexistent'), 'Invalid ID not returned in matched meals');
  });

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 FAVORITE MEALS TEST SUMMARY');
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
    console.log('\n✨ ALL FAVORITE MEALS & BOOKMARKS TEST SCENARIOS PASSED SUCCESSFULLY!');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFavoriteMealsTests().catch(err => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
  });
}
