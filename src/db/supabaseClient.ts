import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MealItem, Provider, Order, OrderStatus, DemoCustomerReview } from '../types';
import { INITIAL_MEALS, INITIAL_PROVIDERS, INITIAL_REVIEWS } from './mockSeedData';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Local persistent reactive store for offline-first & immediate development
const STORAGE_KEYS = {
  MEALS: 'tiffintrack_meals_v1',
  PROVIDERS: 'tiffintrack_providers_v1',
  ORDERS: 'tiffintrack_orders_v1',
  REVIEWS: 'tiffintrack_reviews_v1',
};

class LocalDatabaseStore {
  private meals: MealItem[];
  private providers: Provider[];
  private orders: Order[];
  private reviews: DemoCustomerReview[];

  constructor() {
    this.meals = this.loadFromStorage(STORAGE_KEYS.MEALS, INITIAL_MEALS);
    this.providers = this.loadFromStorage(STORAGE_KEYS.PROVIDERS, INITIAL_PROVIDERS);
    this.orders = this.loadFromStorage(STORAGE_KEYS.ORDERS, [
      {
        id: 'TT-2026-9042',
        createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        customerName: 'Rohit Verma',
        customerPhone: '+91 98451 22910',
        deliveryAddress: 'Flat 402, Sunshine Heights, 12th Main Road, HAL 2nd Stage',
        locality: 'Indiranagar',
        landmark: 'Near BDA Complex',
        items: [
          {
            cartItemId: 'sample-item-1',
            meal: INITIAL_MEALS[0],
            frequency: 'weekly_6days',
            quantity: 1,
            selectedSlot: 'lunch',
            specialInstructions: 'Please deliver to security desk on ground floor.',
            totalPrice: 570,
          }
        ],
        subtotal: 570,
        deliveryFee: 0,
        packagingFee: 30,
        discount: 50,
        finalAmount: 550,
        paymentMethod: 'upi_on_delivery',
        deliverySlot: 'lunch',
        orderNotes: 'Leave with guard if intercom not answered.',
        status: 'requested',
        estimatedDeliveryTime: 'Requested Lunch Slot · Awaiting confirmation',
        isDemoOrder: true
      }
    ]);
    this.reviews = this.loadFromStorage(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
  }

  private loadFromStorage<T>(key: string, fallback: T): T {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback if localStorage is unavailable
    }
    return fallback;
  }

  private saveToStorage(key: string, data: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  public getMeals(): MealItem[] {
    return [...this.meals];
  }

  public getMealById(id: string): MealItem | undefined {
    return this.meals.find(m => m.id === id);
  }

  public getMealsByProvider(providerId: string): MealItem[] {
    return this.meals.filter(m => m.providerId === providerId);
  }

  public getProviders(): Provider[] {
    return [...this.providers];
  }

  public getProviderById(id: string): Provider | undefined {
    return this.providers.find(p => p.id === id);
  }

  public getOrders(): Order[] {
    return [...this.orders];
  }

  public getOrderById(id: string): Order | undefined {
    return this.orders.find(o => o.id === id);
  }

  public getReviewsByProvider(providerId: string): DemoCustomerReview[] {
    return this.reviews.filter(r => r.providerId === providerId);
  }

  public getReviewsByMeal(mealId: string): DemoCustomerReview[] {
    return this.reviews.filter(r => r.mealId === mealId);
  }

  public getAllReviews(): DemoCustomerReview[] {
    return [...this.reviews];
  }

  public addReview(review: DemoCustomerReview): DemoCustomerReview {
    this.reviews.unshift(review);
    this.saveToStorage(STORAGE_KEYS.REVIEWS, this.reviews);
    return review;
  }

  public voteReviewHelpful(reviewId: string): { helpfulCount: number; hasVoted: boolean } {
    const review = this.reviews.find(r => r.id === reviewId);
    if (!review) return { helpfulCount: 0, hasVoted: false };

    const votedKey = `voted_helpful_${reviewId}`;
    const alreadyVoted = localStorage.getItem(votedKey) === 'true';

    if (alreadyVoted) {
      // Toggle off
      review.helpfulCount = Math.max(0, (review.helpfulCount || 1) - 1);
      try { localStorage.removeItem(votedKey); } catch {}
      this.saveToStorage(STORAGE_KEYS.REVIEWS, this.reviews);
      return { helpfulCount: review.helpfulCount, hasVoted: false };
    } else {
      // Upvote
      review.helpfulCount = (review.helpfulCount || 0) + 1;
      try { localStorage.setItem(votedKey, 'true'); } catch {}
      this.saveToStorage(STORAGE_KEYS.REVIEWS, this.reviews);
      return { helpfulCount: review.helpfulCount, hasVoted: true };
    }
  }

  public createOrder(order: Order): Order {
    this.orders.unshift(order);
    this.saveToStorage(STORAGE_KEYS.ORDERS, this.orders);
    return order;
  }

  public updateOrderStatus(orderId: string, status: OrderStatus): Order | null {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return null;
    order.status = status;
    this.saveToStorage(STORAGE_KEYS.ORDERS, this.orders);
    return { ...order };
  }

  public updateMealAvailability(mealId: string, isAvailable: boolean): MealItem | null {
    const meal = this.meals.find(m => m.id === mealId);
    if (!meal) return null;
    meal.isAvailable = isAvailable;
    this.saveToStorage(STORAGE_KEYS.MEALS, this.meals);
    return { ...meal };
  }

  public updateTodaySabzi(mealId: string, day: string, primarySabzi: string): MealItem | null {
    const meal = this.meals.find(m => m.id === mealId);
    if (!meal) return null;
    const scheduleItem = meal.schedule.find(s => s.day.toLowerCase() === day.toLowerCase());
    if (scheduleItem) {
      scheduleItem.sabziPrimary = primarySabzi;
      this.saveToStorage(STORAGE_KEYS.MEALS, this.meals);
    }
    return { ...meal };
  }

  public resetToDefaults() {
    this.meals = [...INITIAL_MEALS];
    this.providers = [...INITIAL_PROVIDERS];
    this.reviews = [...INITIAL_REVIEWS];
    this.saveToStorage(STORAGE_KEYS.MEALS, this.meals);
    this.saveToStorage(STORAGE_KEYS.PROVIDERS, this.providers);
    this.saveToStorage(STORAGE_KEYS.REVIEWS, this.reviews);
  }
}

export const localDb = new LocalDatabaseStore();
