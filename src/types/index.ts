/**
 * Core Domain Models for TiffinTrack Marketplace
 */

export type MealDietType = 'pure_veg' | 'jain' | 'egg_curry' | 'homestyle' | 'low_oil';

export type CuisineRegion = 'north_indian' | 'south_indian' | 'gujarati' | 'maharashtrian';

export type MealSlot = 'lunch' | 'dinner' | 'both';

export type SubscriptionFrequency = 'single_trial' | 'weekly_6days' | 'monthly_24days';

export type OrderStatus =
  | 'requested'
  | 'accepted'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'rejected';

export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  requested: ['accepted', 'confirmed', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'dispatched', 'cancelled'],
  ready: ['completed', 'dispatched'],
  dispatched: ['completed', 'delivered'],
  completed: [],
  delivered: [],
  cancelled: [],
  rejected: [],
};

export interface CreateMealInput {
  title: string;
  tagline?: string;
  description: string;
  pricePerMeal: number;
  weeklyPricePerMeal?: number;
  monthlyPricePerMeal?: number;
  dietType: MealDietType;
  cuisine: CuisineRegion;
  slot: MealSlot;
  spiceLevel?: 'Mild' | 'Medium' | 'Spicy';
  packaging?: string;
  imageUrl?: string;
  contents?: string[];
  preparationLeadTime?: string;
  caloriesEstimate?: string;
  isAvailable?: boolean;
}

export interface UpdateMealInput {
  title?: string;
  tagline?: string;
  description?: string;
  pricePerMeal?: number;
  weeklyPricePerMeal?: number;
  monthlyPricePerMeal?: number;
  dietType?: MealDietType;
  cuisine?: CuisineRegion;
  slot?: MealSlot;
  spiceLevel?: 'Mild' | 'Medium' | 'Spicy';
  packaging?: string;
  imageUrl?: string;
  contents?: string[];
  preparationLeadTime?: string;
  caloriesEstimate?: string;
  isAvailable?: boolean;
}

export interface Profile {
  id: string; // matches auth.users(id) or unique UUID
  email?: string;
  fullName: string;
  phone?: string;
  defaultAddress?: string;
  defaultLocality?: string;
  role: 'customer' | 'provider' | 'admin';
  providerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyMenuSchedule {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  sabziPrimary: string;
  sabziSecondary?: string;
  dal: string;
  bread: string;
  rice: string;
  sweetOrSpecial?: string;
}

export interface MealItem {
  id: string;
  providerId: string;
  providerName: string;
  locality: string;
  title: string;
  tagline: string;
  description: string;
  pricePerMeal: number; // in INR (e.g. ₹110)
  weeklyPricePerMeal: number; // e.g. ₹95/meal
  monthlyPricePerMeal: number; // e.g. ₹85/meal
  dietType: MealDietType;
  cuisine: CuisineRegion;
  slot: MealSlot;
  spiceLevel: 'Mild' | 'Medium' | 'Zesty';
  packaging: 'Insulated Stainless Dabba' | 'Food-Grade Sealed Tray';
  imageUrl: string;
  contents: string[];
  schedule: DailyMenuSchedule[];
  isAvailable: boolean;
  preparationLeadTime: string; // e.g. 'Order 2 hrs prior'
  caloriesEstimate?: string; // e.g. '520-580 kcal'
}

export interface Provider {
  id: string;
  name: string;
  leadChef: string;
  avatarUrl: string;
  bannerUrl: string;
  bio?: string;
  locality: string;
  city: string;
  distanceKm: number;
  openSlots: MealSlot[];
  demoLicenseNotice: string;
  contactPhone: string;
  hygieneStandards?: string[];
  deliveryWindows: {
    lunch: string; // e.g. '12:15 PM - 1:15 PM'
    dinner: string; // e.g. '7:45 PM - 8:45 PM'
  };
  activeSubscribers: number;
  establishedYear: number;
  isActive: boolean;
}

export interface CartItem {
  cartItemId: string;
  meal: MealItem;
  frequency: SubscriptionFrequency;
  quantity: number;
  selectedSlot: 'lunch' | 'dinner';
  specialInstructions?: string;
  totalPrice: number;
}

export interface Order {
  id: string;
  createdAt: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  locality: string;
  landmark?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  packagingFee: number;
  discount: number;
  finalAmount: number;
  paymentMethod: 'cod' | 'upi_on_delivery';
  deliverySlot: 'lunch' | 'dinner';
  orderNotes?: string;
  status: OrderStatus;
  estimatedDeliveryTime: string;
  isDemoOrder: boolean;
  idempotencyKey?: string;
}

export interface DemoCustomerReview {
  id: string;
  providerId: string;
  mealId?: string;
  authorName: string;
  rating?: number;
  date: string;
  reviewText: string;
  dietTag: string;
  isDemoFeedback: boolean;
}

export interface FilterState {
  searchQuery: string;
  dietType: 'all' | MealDietType;
  cuisine: 'all' | CuisineRegion;
  slot: 'all' | 'lunch' | 'dinner';
  locality: 'all' | string;
  maxPrice: number;
  sortBy: 'featured' | 'price_asc' | 'price_desc';
}

export interface DatabaseConnectionStatus {
  isConfigured: boolean;
  isLiveConnection: boolean;
  isDemoMode: boolean;
  message: string;
  checkedAt: string;
  verifiedOperations: string[];
  endpointStatus: {
    providers: 'ok' | 'error' | 'demo';
    meals: 'ok' | 'error' | 'demo';
    orders: 'ok' | 'error' | 'demo';
  };
}
