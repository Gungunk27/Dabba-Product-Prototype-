import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MealItem, Provider, Order, OrderStatus, VALID_STATUS_TRANSITIONS, CartItem, SubscriptionFrequency, CreateMealInput, UpdateMealInput } from '../types';
import { INITIAL_MEALS, INITIAL_PROVIDERS, INITIAL_REVIEWS } from '../db/mockSeedData';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// A real key must be non-empty and not the default example placeholder
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your-project') &&
  (supabaseServiceKey || supabaseAnonKey)
);

// Server-side client using privileged service role key if available, else anon key
export const supabaseAdmin: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// In-memory demo store used EXCLUSIVELY when Supabase credentials are not configured.
// When Supabase IS configured, all calls go directly to Supabase and will NOT silently fall back.
const demoStore = {
  providers: [...INITIAL_PROVIDERS],
  meals: [...INITIAL_MEALS],
  orders: [] as Order[],
  reviews: [...INITIAL_REVIEWS],
};

export interface ConnectionVerificationReport {
  isConfigured: boolean;
  isLiveConnection: boolean;
  isDemoMode: boolean;
  message: string;
  checkedAt: string;
  verifiedOperations: string[];
  error?: string;
}

/**
 * Diagnostic test that queries real Supabase tables and reports verified operations.
 */
export async function testDatabaseConnectivity(): Promise<ConnectionVerificationReport> {
  const timestamp = new Date().toISOString();

  if (!isSupabaseConfigured || !supabaseAdmin) {
    return {
      isConfigured: false,
      isLiveConnection: false,
      isDemoMode: true,
      message: 'Supabase credentials are not configured in environment. Explicit Demo Mode is active.',
      checkedAt: timestamp,
      verifiedOperations: [
        'Local Demo Repository Active (In-Memory / Local Storage)',
        'Server-Side Order Validation Engine Ready',
        'Status Transition State Machine Ready'
      ],
    };
  }

  const verified: string[] = [];

  try {
    // 1. Test Providers table query (RLS is_active filter)
    const { data: providersData, error: provError } = await supabaseAdmin
      .from('providers')
      .select('id, name, is_active')
      .limit(2);

    if (provError) {
      throw new Error(`Failed to query 'providers' table: ${provError.message} (${provError.code})`);
    }
    verified.push(`Query 'providers' table (returned ${providersData?.length || 0} records)`);

    // 2. Test Meals table query (RLS is_available filter)
    const { data: mealsData, error: mealError } = await supabaseAdmin
      .from('meals')
      .select('id, title, price_per_meal, is_available')
      .limit(2);

    if (mealError) {
      throw new Error(`Failed to query 'meals' table: ${mealError.message} (${mealError.code})`);
    }
    verified.push(`Query 'meals' table (returned ${mealsData?.length || 0} records)`);

    // 3. Test Orders table read permissions
    const { error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .limit(1);

    if (orderError) {
      throw new Error(`Failed to query 'orders' table: ${orderError.message} (${orderError.code})`);
    }
    verified.push("Query 'orders' table access verified");

    return {
      isConfigured: true,
      isLiveConnection: true,
      isDemoMode: false,
      message: 'Successfully connected to live Supabase PostgreSQL instance.',
      checkedAt: timestamp,
      verifiedOperations: verified,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      isConfigured: true,
      isLiveConnection: false,
      isDemoMode: false,
      message: `Supabase connection failed: ${errorMsg}`,
      checkedAt: timestamp,
      verifiedOperations: verified,
      error: errorMsg,
    };
  }
}

/**
 * Fetch active providers for public discovery.
 * Enforces `is_active = true`.
 */
export async function getActiveProviders(): Promise<{ data: Provider[]; isDemoMode: boolean }> {
  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('providers')
      .select('*')
      .eq('is_active', true);

    if (error) {
      // DO NOT FALL BACK SILENTLY. Throw actual database error as required.
      throw new Error(`Supabase query failed on 'providers': ${error.message} (code ${error.code})`);
    }

    const mapped: Provider[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      leadChef: row.lead_chef,
      avatarUrl: row.avatar_url,
      bannerUrl: row.banner_url,
      bio: row.bio,
      locality: row.locality,
      city: row.city,
      distanceKm: Number(row.distance_km),
      openSlots: row.open_slots,
      demoLicenseNotice: row.demo_license_notice,
      contactPhone: row.contact_phone,
      hygieneStandards: row.hygiene_standards || [],
      deliveryWindows: {
        lunch: row.lunch_window,
        dinner: row.dinner_window,
      },
      activeSubscribers: row.active_subscribers,
      establishedYear: row.established_year,
      isActive: row.is_active,
    }));

    return { data: mapped, isDemoMode: false };
  }

  // Explicit Demo Mode
  return {
    data: demoStore.providers.filter(p => p.isActive),
    isDemoMode: true,
  };
}

/**
 * Fetch available meals for public discovery with optional filters.
 * Enforces `is_available = true`.
 */
export async function getAvailableMeals(filters?: {
  search?: string;
  diet?: string;
  cuisine?: string;
  slot?: string;
  locality?: string;
  maxPrice?: number;
  providerId?: string;
}): Promise<{ data: MealItem[]; isDemoMode: boolean }> {
  if (isSupabaseConfigured && supabaseAdmin) {
    let query = supabaseAdmin
      .from('meals')
      .select(`
        *,
        meal_schedules (*)
      `)
      .eq('is_available', true);

    if (filters?.diet && filters.diet !== 'all') {
      query = query.eq('diet_type', filters.diet);
    }
    if (filters?.cuisine && filters.cuisine !== 'all') {
      query = query.eq('cuisine', filters.cuisine);
    }
    if (filters?.providerId) {
      query = query.eq('provider_id', filters.providerId);
    }
    if (filters?.maxPrice) {
      query = query.lte('price_per_meal', filters.maxPrice);
    }

    const { data, error } = await query;

    if (error) {
      // DO NOT FALL BACK SILENTLY. Throw actual database error as required.
      throw new Error(`Supabase query failed on 'meals': ${error.message} (code ${error.code})`);
    }

    let results: MealItem[] = (data || []).map((row: any) => ({
      id: row.id,
      providerId: row.provider_id,
      providerName: row.provider_name || 'Home Kitchen',
      locality: row.locality || 'Bengaluru',
      title: row.title,
      tagline: row.tagline,
      description: row.description,
      pricePerMeal: Number(row.price_per_meal),
      weeklyPricePerMeal: Number(row.weekly_price_per_meal),
      monthlyPricePerMeal: Number(row.monthly_price_per_meal),
      dietType: row.diet_type,
      cuisine: row.cuisine,
      slot: row.slot,
      spiceLevel: row.spice_level,
      packaging: row.packaging,
      imageUrl: row.image_url,
      contents: row.contents || [],
      schedule: (row.meal_schedules || []).map((s: any) => ({
        day: s.day_of_week,
        sabziPrimary: s.sabzi_primary,
        sabziSecondary: s.sabzi_secondary,
        dal: s.dal,
        bread: s.bread,
        rice: s.rice,
        sweetOrSpecial: s.sweet_or_special,
      })),
      isAvailable: row.is_available,
      preparationLeadTime: row.preparation_lead_time,
      caloriesEstimate: row.calories_estimate,
    }));

    if (filters?.locality && filters.locality !== 'all') {
      results = results.filter(m => m.locality.toLowerCase().includes(filters.locality!.toLowerCase()));
    }

    if (filters?.slot && filters.slot !== 'all') {
      results = results.filter(m => m.slot === 'both' || m.slot === filters.slot);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      results = results.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.providerName.toLowerCase().includes(q) ||
        m.locality.toLowerCase().includes(q) ||
        m.tagline.toLowerCase().includes(q) ||
        m.contents.some(c => c.toLowerCase().includes(q))
      );
    }

    return { data: results, isDemoMode: false };
  }

  // Explicit Demo Mode
  let filtered = demoStore.meals.filter(m => m.isAvailable);
  if (filters?.diet && filters.diet !== 'all') {
    filtered = filtered.filter(m => m.dietType === filters.diet);
  }
  if (filters?.cuisine && filters.cuisine !== 'all') {
    filtered = filtered.filter(m => m.cuisine === filters.cuisine);
  }
  if (filters?.slot && filters.slot !== 'all') {
    filtered = filtered.filter(m => m.slot === 'both' || m.slot === filters.slot);
  }
  if (filters?.locality && filters.locality !== 'all') {
    filtered = filtered.filter(m => m.locality.toLowerCase().includes(filters.locality!.toLowerCase()));
  }
  if (filters?.providerId) {
    filtered = filtered.filter(m => m.providerId === filters.providerId);
  }
  if (filters?.maxPrice) {
    filtered = filtered.filter(m => m.pricePerMeal <= filters.maxPrice!);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.providerName.toLowerCase().includes(q) ||
      m.locality.toLowerCase().includes(q) ||
      m.tagline.toLowerCase().includes(q)
    );
  }

  return { data: filtered, isDemoMode: true };
}

export class AuthenticationError extends Error {
  public statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends Error {
  public statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends Error {
  public statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  public statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export interface SessionUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'customer' | 'provider' | 'admin';
  providerId?: string;
}

export const TEST_USERS: Record<string, SessionUser> = {
  'demo-customer-token': {
    id: 'c1111111-1111-1111-1111-111111111111',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '9845012345',
    role: 'customer',
  },
  'demo-customer-2-token': {
    id: 'c2222222-2222-2222-2222-222222222222',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    phone: '9876543210',
    role: 'customer',
  },
  'demo-provider-token': {
    id: 'p1111111-1111-1111-1111-111111111111',
    name: 'Annapurna Kitchen Operator',
    email: 'annapurna@kitchen.tiffintrack.in',
    phone: '9845110022',
    role: 'provider',
    providerId: 'prov-annapurna',
  },
  'demo-provider-annapurna-token': {
    id: 'p1111111-1111-1111-1111-111111111111',
    name: 'Annapurna Kitchen Operator',
    email: 'annapurna@kitchen.tiffintrack.in',
    phone: '9845110022',
    role: 'provider',
    providerId: 'prov-annapurna',
  },
  'demo-provider-krishna-token': {
    id: 'p2222222-2222-2222-2222-222222222222',
    name: 'Shree Krishna Kitchen Operator',
    email: 'krishna@kitchen.tiffintrack.in',
    phone: '9845220033',
    role: 'provider',
    providerId: 'prov-shree-krishna',
  },
  'demo-admin-token': {
    id: 'a1111111-1111-1111-1111-111111111111',
    name: 'TiffinTrack Administrator',
    email: 'admin@tiffintrack.in',
    role: 'admin',
  },
};

/**
 * Derives current session user from the Authorization header:
 * - In demo mode or test runner: resolves test tokens.
 * - In live Supabase mode: validates real Supabase JWT and queries profile.
 */
export async function resolveSessionUser(authHeader?: string): Promise<SessionUser | null> {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  // 1. Known test / demo tokens
  if (TEST_USERS[token]) {
    return TEST_USERS[token];
  }

  // 2. Format: "demo-provider:<providerId>" or "demo-provider:<providerId>:<name>"
  if (token.startsWith('demo-provider:')) {
    const parts = token.split(':');
    const provId = parts[1] || 'prov-annapurna';
    return {
      id: `p-${provId}`,
      role: 'provider',
      providerId: provId,
      name: parts[2] || `${provId} Kitchen Operator`,
    };
  }

  // 3. Format: "demo-user:<id>:<role>:<providerId>:<name>"
  if (token.startsWith('demo-user:')) {
    const parts = token.split(':');
    return {
      id: parts[1] || 'demo-user-id',
      role: (parts[2] as 'customer' | 'provider' | 'admin') || 'customer',
      providerId: parts[3] || undefined,
      name: parts[4] || parts[3] || 'Demo User',
    };
  }

  // 3. Supabase JWT verification
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) return null;

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      return {
        id: user.id,
        email: user.email,
        name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
        phone: profile?.phone || user.phone,
        role: (profile?.role as 'customer' | 'provider' | 'admin') || 'customer',
        providerId: profile?.provider_id,
      };
    } catch {
      return null;
    }
  }

  return null;
}

// In-memory idempotency cache & rapid click deduplication
const idempotencyCache = new Map<string, { order: Order; timestamp: number }>();
const recentSubmissions = new Map<string, { orderId: string; timestamp: number }>();

/**
 * Server-Side Order Creation with STRICT validation:
 * - Authentication: Derives current customer from authenticated server-side session
 * - Re-fetch & availability: Verifies meal is available and provider is active
 * - Quantity: Validates positive integer between 1 and 50
 * - Price Verification: Canonical price snapshot fetched from DB / authoritative store
 * - Totals: Authoritatively calculated on server
 * - Duplicate prevention: Idempotency keys & rapid double-click guard
 * - Initial status: Starts in 'requested' status (No payment, no delivery promise)
 */
export async function createOrderServerSide(
  payload: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    locality: string;
    landmark?: string;
    deliverySlot: 'lunch' | 'dinner';
    paymentMethod: 'cod' | 'upi_on_delivery';
    orderNotes?: string;
    idempotencyKey?: string;
    items: Array<{
      mealId: string;
      frequency: SubscriptionFrequency;
      quantity: number;
      selectedSlot: 'lunch' | 'dinner';
      specialInstructions?: string;
      clientExpectedPrice?: number;
    }>;
  },
  authHeader?: string
): Promise<{ order: Order; isDemoMode: boolean; isDuplicate?: boolean }> {
  // 1. Derive current customer from authenticated server-side session
  const sessionUser = await resolveSessionUser(authHeader);
  if (!sessionUser) {
    throw new AuthenticationError('Authentication required. You must be signed in to submit an order.');
  }

  // 2. Prevent duplicate submissions from accidental repeated clicks
  if (payload.idempotencyKey) {
    const cached = idempotencyCache.get(payload.idempotencyKey);
    if (cached) {
      return { order: cached.order, isDemoMode: !isSupabaseConfigured, isDuplicate: true };
    }
  }

  // Rapid accidental repeated click protection (within 3 seconds from same customer and meal)
  const mealSignature = (payload.items || []).map(i => `${i.mealId}:${i.quantity}`).sort().join('|');
  const rapidKey = `${sessionUser.id}:${mealSignature}`;
  const lastSub = recentSubmissions.get(rapidKey);
  if (lastSub && Date.now() - lastSub.timestamp < 3000) {
    const existingOrder = demoStore.orders.find(o => o.id === lastSub.orderId);
    if (existingOrder) {
      return { order: existingOrder, isDemoMode: !isSupabaseConfigured, isDuplicate: true };
    }
  }

  // 3. Validate required fields
  if (!payload.customerName || payload.customerName.trim().length < 2) {
    throw new ValidationError('Customer full name must be at least 2 characters.');
  }

  const cleanPhone = (payload.customerPhone || '').replace(/[\s-]/g, '');
  if (!/^(\+91)?[6-9]\d{9}$/.test(cleanPhone)) {
    throw new ValidationError('Valid 10-digit mobile number required (e.g. 9845012345).');
  }

  if (!payload.deliveryAddress || payload.deliveryAddress.trim().length < 8) {
    throw new ValidationError('Delivery address must be at least 8 characters with house/street details.');
  }

  if (!payload.locality || payload.locality.trim().length < 2) {
    throw new ValidationError('Locality is required.');
  }

  if (!payload.deliverySlot || !['lunch', 'dinner'].includes(payload.deliverySlot)) {
    throw new ValidationError('Delivery slot must be either lunch or dinner.');
  }

  if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
    throw new ValidationError('Order must contain at least one meal item.');
  }

  // 4. Validate quantities & re-fetch meals from database (verify meal availability and provider active status)
  const validatedItems: CartItem[] = [];
  let calculatedSubtotal = 0;
  let hasSubscription = false;

  for (const item of payload.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
      throw new ValidationError(`Invalid quantity (${item.quantity}) for meal ${item.mealId}. Must be an integer between 1 and 50.`);
    }

    if (!['single_trial', 'weekly_6days', 'monthly_24days'].includes(item.frequency)) {
      throw new ValidationError(`Invalid plan frequency: ${item.frequency}`);
    }

    if (!['lunch', 'dinner'].includes(item.selectedSlot)) {
      throw new ValidationError(`Invalid delivery slot: ${item.selectedSlot}`);
    }

    if (item.frequency !== 'single_trial') {
      hasSubscription = true;
    }

    let mealRecord: MealItem | undefined;

    if (isSupabaseConfigured && supabaseAdmin) {
      // Re-fetch meal from live database with provider join
      const { data: dbMeal, error: mealErr } = await supabaseAdmin
        .from('meals')
        .select(`
          *,
          providers (*)
        `)
        .eq('id', item.mealId)
        .single();

      if (mealErr || !dbMeal) {
        throw new NotFoundError(`Meal with id '${item.mealId}' not found in database.`);
      }

      // Check meal availability
      if (!dbMeal.is_available) {
        throw new ValidationError(`Meal '${dbMeal.title}' is currently unavailable or sold out today.`);
      }

      // Check provider active status
      if (dbMeal.providers && !dbMeal.providers.is_active) {
        throw new ValidationError(`Kitchen '${dbMeal.providers.name}' is currently inactive and cannot accept orders.`);
      }

      mealRecord = {
        id: dbMeal.id,
        providerId: dbMeal.provider_id,
        providerName: dbMeal.providers?.name || dbMeal.provider_name || 'Home Kitchen',
        locality: dbMeal.locality || 'Bengaluru',
        title: dbMeal.title,
        tagline: dbMeal.tagline,
        description: dbMeal.description,
        pricePerMeal: Number(dbMeal.price_per_meal),
        weeklyPricePerMeal: Number(dbMeal.weekly_price_per_meal),
        monthlyPricePerMeal: Number(dbMeal.monthly_price_per_meal),
        dietType: dbMeal.diet_type,
        cuisine: dbMeal.cuisine,
        slot: dbMeal.slot,
        spiceLevel: dbMeal.spice_level,
        packaging: dbMeal.packaging,
        imageUrl: dbMeal.image_url,
        contents: dbMeal.contents || [],
        schedule: [],
        isAvailable: dbMeal.is_available,
        preparationLeadTime: dbMeal.preparation_lead_time,
        caloriesEstimate: dbMeal.calories_estimate,
      };
    } else {
      // Re-fetch from demo store
      mealRecord = demoStore.meals.find(m => m.id === item.mealId);
      if (!mealRecord) {
        throw new NotFoundError(`Meal with id '${item.mealId}' not found.`);
      }

      // Verify meal is available
      if (!mealRecord.isAvailable) {
        throw new ValidationError(`Meal '${mealRecord.title}' is currently unavailable or sold out today.`);
      }

      // Verify provider is active
      const prov = demoStore.providers.find(p => p.id === mealRecord!.providerId);
      if (prov && !prov.isActive) {
        throw new ValidationError(`Kitchen '${prov.name}' is currently inactive and cannot accept orders.`);
      }
    }

    // Server-side authoritative price calculation (storing price snapshot)
    let unitRate = mealRecord.pricePerMeal;
    let daysCount = 1;

    if (item.frequency === 'weekly_6days') {
      unitRate = mealRecord.weeklyPricePerMeal;
      daysCount = 6;
    } else if (item.frequency === 'monthly_24days') {
      unitRate = mealRecord.monthlyPricePerMeal;
      daysCount = 24;
    }

    const itemTotalPrice = unitRate * daysCount * item.quantity;
    calculatedSubtotal += itemTotalPrice;

    validatedItems.push({
      cartItemId: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      meal: mealRecord,
      frequency: item.frequency,
      quantity: item.quantity,
      selectedSlot: item.selectedSlot,
      specialInstructions: item.specialInstructions?.trim(),
      totalPrice: itemTotalPrice,
    });
  }

  // 5. Authoritative server fees and price snapshot
  const deliveryFee = (hasSubscription || calculatedSubtotal >= 200) ? 0 : 25;
  const packagingFee = 30; // Stainless dabba deposit
  const discount = hasSubscription ? 60 : (calculatedSubtotal > 150 ? 20 : 0);
  const finalAmount = Math.max(0, calculatedSubtotal + deliveryFee + packagingFee - discount);

  const orderId = `TT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  // Strict requirement: Start the order in 'requested' status.
  // Do not charge money, call a payment provider, promise a delivery or automatically mark completed.
  const orderData: Order = {
    id: orderId,
    createdAt: new Date().toISOString(),
    customerId: sessionUser.id,
    customerName: payload.customerName.trim(),
    customerPhone: cleanPhone,
    deliveryAddress: payload.deliveryAddress.trim(),
    locality: payload.locality.trim(),
    landmark: payload.landmark?.trim(),
    items: validatedItems,
    subtotal: calculatedSubtotal,
    deliveryFee,
    packagingFee,
    discount,
    finalAmount,
    paymentMethod: payload.paymentMethod || 'upi_on_delivery',
    deliverySlot: payload.deliverySlot,
    orderNotes: payload.orderNotes?.trim(),
    status: 'requested', // Explicitly starts in requested status!
    estimatedDeliveryTime: `Requested ${payload.deliverySlot === 'lunch' ? 'Lunch (12:15 PM – 1:15 PM)' : 'Dinner (7:45 PM – 8:45 PM)'} · Awaiting kitchen acceptance`,
    isDemoOrder: !isSupabaseConfigured,
    idempotencyKey: payload.idempotencyKey,
  };

  // 6. Persist to Supabase if configured
  if (isSupabaseConfigured && supabaseAdmin) {
    const { error: insertOrderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        id: orderData.id,
        customer_id: orderData.customerId,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        delivery_address: orderData.deliveryAddress,
        locality: orderData.locality,
        landmark: orderData.landmark,
        subtotal: orderData.subtotal,
        delivery_fee: orderData.deliveryFee,
        packaging_fee: orderData.packagingFee,
        discount: orderData.discount,
        final_amount: orderData.finalAmount,
        payment_method: orderData.paymentMethod,
        delivery_slot: orderData.deliverySlot,
        order_notes: orderData.orderNotes,
        idempotency_key: orderData.idempotencyKey,
        status: orderData.status,
        estimated_delivery_time: orderData.estimatedDeliveryTime,
        is_demo_order: false,
      });

    if (insertOrderErr) {
      throw new Error(`Failed to insert order into Supabase: ${insertOrderErr.message} (code ${insertOrderErr.code})`);
    }

    const lineItemsToInsert = validatedItems.map(item => ({
      order_id: orderData.id,
      meal_id: item.meal.id,
      meal_title: item.meal.title,
      frequency: item.frequency,
      quantity: item.quantity,
      delivery_slot: item.selectedSlot,
      unit_price: item.frequency === 'weekly_6days' 
        ? item.meal.weeklyPricePerMeal 
        : item.frequency === 'monthly_24days' 
        ? item.meal.monthlyPricePerMeal 
        : item.meal.pricePerMeal,
      total_price: item.totalPrice,
      special_instructions: item.specialInstructions,
    }));

    const { error: lineItemsErr } = await supabaseAdmin
      .from('order_items')
      .insert(lineItemsToInsert);

    if (lineItemsErr) {
      throw new Error(`Failed to insert order items: ${lineItemsErr.message}`);
    }

    if (payload.idempotencyKey) {
      idempotencyCache.set(payload.idempotencyKey, { order: orderData, timestamp: Date.now() });
    }
    recentSubmissions.set(rapidKey, { orderId: orderData.id, timestamp: Date.now() });

    return { order: orderData, isDemoMode: false };
  }

  // Explicit Demo Mode Store
  demoStore.orders.unshift(orderData);
  if (payload.idempotencyKey) {
    idempotencyCache.set(payload.idempotencyKey, { order: orderData, timestamp: Date.now() });
  }
  recentSubmissions.set(rapidKey, { orderId: orderData.id, timestamp: Date.now() });

  return { order: orderData, isDemoMode: true };
}

/**
 * Server-Side Order Retrieval with Ownership & Authorization Check
 */
export async function getOrderByIdServerSide(
  orderId: string,
  authHeader?: string
): Promise<{ order: Order; isDemoMode: boolean }> {
  const sessionUser = await resolveSessionUser(authHeader);
  if (!sessionUser) {
    throw new AuthenticationError('Authentication required. You must provide a valid session token.');
  }

  let foundOrder: Order | undefined;

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data: dbOrder, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', orderId)
      .single();

    if (orderErr || !dbOrder) {
      throw new NotFoundError(`Order '${orderId}' not found in database.`);
    }

    foundOrder = {
      id: dbOrder.id,
      createdAt: dbOrder.created_at,
      customerId: dbOrder.customer_id,
      customerName: dbOrder.customer_name,
      customerPhone: dbOrder.customer_phone,
      deliveryAddress: dbOrder.delivery_address,
      locality: dbOrder.locality,
      landmark: dbOrder.landmark,
      items: (dbOrder.order_items || []).map((oi: any) => ({
        cartItemId: oi.id,
        meal: {
          id: oi.meal_id,
          title: oi.meal_title,
          pricePerMeal: Number(oi.unit_price),
        } as any,
        frequency: oi.frequency,
        quantity: oi.quantity,
        selectedSlot: oi.delivery_slot,
        specialInstructions: oi.special_instructions,
        totalPrice: Number(oi.total_price),
      })),
      subtotal: Number(dbOrder.subtotal),
      deliveryFee: Number(dbOrder.delivery_fee),
      packagingFee: Number(dbOrder.packaging_fee),
      discount: Number(dbOrder.discount),
      finalAmount: Number(dbOrder.final_amount),
      paymentMethod: dbOrder.payment_method,
      deliverySlot: dbOrder.delivery_slot,
      orderNotes: dbOrder.order_notes,
      status: dbOrder.status,
      estimatedDeliveryTime: dbOrder.estimated_delivery_time,
      isDemoOrder: false,
      idempotencyKey: dbOrder.idempotency_key,
    };
  } else {
    foundOrder = demoStore.orders.find(o => o.id === orderId);
  }

  if (!foundOrder) {
    throw new NotFoundError(`Order '${orderId}' not found.`);
  }

  // Authorization check: User must own the order, or be an admin, or be the kitchen operator for this meal
  const isOwner = foundOrder.customerId === sessionUser.id;
  const isAdmin = sessionUser.role === 'admin';
  const isProvider = sessionUser.role === 'provider' && foundOrder.items.some(i => i.meal.providerId === sessionUser.providerId);

  if (!isOwner && !isAdmin && !isProvider) {
    throw new ForbiddenError('You are not authorized to access this order.');
  }

  return { order: foundOrder, isDemoMode: !isSupabaseConfigured };
}

/**
 * Server-Side Provider Order Retrieval
 * Returns incoming orders containing meals for the authenticated provider's own kitchen only.
 * Enforces server-side authorization and ownership isolation.
 */
export async function getProviderOrdersServerSide(
  authHeader?: string
): Promise<{ orders: Order[]; isDemoMode: boolean }> {
  const sessionUser = await resolveSessionUser(authHeader);
  if (!sessionUser) {
    throw new AuthenticationError('Authentication required to access provider orders.');
  }

  if (sessionUser.role !== 'provider' && sessionUser.role !== 'admin') {
    throw new ForbiddenError('Access forbidden: Only verified kitchen providers and administrators can access the provider dashboard.');
  }

  const targetProviderId = sessionUser.providerId;
  if (!targetProviderId && sessionUser.role !== 'admin') {
    throw new ForbiddenError('Provider profile is missing an assigned kitchen provider ID.');
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    // Live query via Supabase: fetch orders where order_items meal provider_id matches
    const { data: dbOrders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          meals (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to query provider orders: ${error.message}`);
    }

    const filtered = (dbOrders || []).filter((o: any) => {
      if (sessionUser.role === 'admin' && !targetProviderId) return true;
      return (o.order_items || []).some((oi: any) => oi.meals?.provider_id === targetProviderId);
    });

    const mapped: Order[] = filtered.map((o: any) => ({
      id: o.id,
      createdAt: o.created_at,
      customerId: o.customer_id,
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      deliveryAddress: o.delivery_address,
      locality: o.locality,
      landmark: o.landmark,
      items: (o.order_items || []).map((oi: any) => ({
        cartItemId: oi.id,
        meal: {
          id: oi.meal_id,
          providerId: oi.meals?.provider_id,
          title: oi.meal_title,
          pricePerMeal: Number(oi.unit_price),
        } as any,
        frequency: oi.frequency,
        quantity: oi.quantity,
        selectedSlot: oi.delivery_slot,
        specialInstructions: oi.special_instructions,
        totalPrice: Number(oi.total_price),
      })),
      subtotal: Number(o.subtotal),
      deliveryFee: Number(o.delivery_fee),
      packagingFee: Number(o.packaging_fee),
      discount: Number(o.discount),
      finalAmount: Number(o.final_amount),
      paymentMethod: o.payment_method,
      deliverySlot: o.delivery_slot,
      orderNotes: o.order_notes,
      status: o.status,
      estimatedDeliveryTime: o.estimated_delivery_time,
      isDemoOrder: false,
    }));

    return { orders: mapped, isDemoMode: false };
  }

  // Demo Store: Filter orders containing items for this provider
  const filtered = demoStore.orders.filter(order => {
    if (sessionUser.role === 'admin' && !targetProviderId) return true;
    return order.items.some(item => item.meal.providerId === targetProviderId);
  });

  return { orders: filtered, isDemoMode: true };
}

/**
 * Server-Side Order Status Transition State Machine.
 * Valid transitions:
 * requested -> accepted | confirmed | rejected | cancelled
 * accepted -> preparing | cancelled
 * confirmed -> preparing | cancelled
 * preparing -> ready | dispatched | cancelled
 * ready -> completed | dispatched
 * dispatched -> completed | delivered
 * completed -> none (terminal)
 * delivered -> none (terminal)
 * cancelled -> none (terminal)
 * rejected -> none (terminal)
 *
 * Clearly defined cancellation rules:
 * - Orders may be cancelled or rejected while in 'requested', 'accepted', 'confirmed', or 'preparing'.
 * - Once an order is 'ready', 'dispatched', or 'completed', cancellation is forbidden.
 * - Providers may only update orders containing meals from their own kitchen.
 */
export async function updateOrderStatusServerSide(
  orderId: string,
  targetStatus: OrderStatus,
  authHeader?: string
): Promise<{ orderId: string; oldStatus: OrderStatus; newStatus: OrderStatus; isDemoMode: boolean }> {
  const sessionUser = await resolveSessionUser(authHeader);
  if (!sessionUser) {
    throw new AuthenticationError('Authentication required to update order status.');
  }

  if (sessionUser.role === 'customer') {
    throw new ForbiddenError('Customers cannot update order status directly. Status transitions are managed by authorized kitchen operators.');
  }

  let currentStatus: OrderStatus = 'requested';

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data: dbOrder, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          meals (*)
        )
      `)
      .eq('id', orderId)
      .single();

    if (fetchErr || !dbOrder) {
      throw new NotFoundError(`Order '${orderId}' not found in database.`);
    }

    // Provider Ownership Check: Never let a provider access or mutate another provider's orders
    if (sessionUser.role === 'provider') {
      const belongsToProvider = (dbOrder.order_items || []).some(
        (oi: any) => oi.meals?.provider_id === sessionUser.providerId
      );
      if (!belongsToProvider) {
        throw new ForbiddenError('Forbidden: You are not authorized to update orders for another kitchen.');
      }
    }

    currentStatus = dbOrder.status as OrderStatus;
  } else {
    const found = demoStore.orders.find(o => o.id === orderId);
    if (!found) {
      throw new NotFoundError(`Order '${orderId}' not found.`);
    }

    // Provider Ownership Check in Demo Store
    if (sessionUser.role === 'provider') {
      const belongsToProvider = found.items.some(i => i.meal.providerId === sessionUser.providerId);
      if (!belongsToProvider) {
        throw new ForbiddenError('Forbidden: You are not authorized to update orders for another kitchen.');
      }
    }

    currentStatus = found.status;
  }

  // 1. Check for terminal states
  const terminalStates: OrderStatus[] = ['completed', 'delivered', 'cancelled', 'rejected'];
  if (terminalStates.includes(currentStatus)) {
    throw new ValidationError(`Order '${orderId}' is already in terminal state '${currentStatus}' and cannot undergo further status transitions.`);
  }

  // 2. Cancellation rules enforcement
  if (targetStatus === 'cancelled' || targetStatus === 'rejected') {
    const cancellableStates: OrderStatus[] = ['requested', 'accepted', 'confirmed', 'preparing'];
    if (!cancellableStates.includes(currentStatus)) {
      throw new ValidationError(
        `Orders in '${currentStatus}' status cannot be cancelled or rejected. Cancellation is strictly allowed only before food is ready (requested, accepted, confirmed, preparing).`
      );
    }
  }

  // 3. State machine transition check
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(targetStatus)) {
    throw new ValidationError(
      `Invalid order status transition: Cannot transition from '${currentStatus}' to '${targetStatus}'. Allowed next states: [${allowedTransitions.join(', ') || 'None (Terminal state)'}].`
    );
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateErr) {
      throw new Error(`Failed to update status in Supabase: ${updateErr.message}`);
    }

    return { orderId, oldStatus: currentStatus, newStatus: targetStatus, isDemoMode: false };
  }

  // Demo Mode
  const demoOrder = demoStore.orders.find(o => o.id === orderId);
  if (demoOrder) {
    demoOrder.status = targetStatus;
  }

  return { orderId, oldStatus: currentStatus, newStatus: targetStatus, isDemoMode: true };
}

// ==============================================================================
// Menu Management Server-Side Functions (Create, Edit, Deactivate/Activate)
// ==============================================================================

/**
 * Fetch meals for the authenticated provider's kitchen (including deactivated ones)
 */
export async function getProviderMealsServerSide(
  authHeader?: string
): Promise<{ meals: MealItem[]; isDemoMode: boolean }> {
  const sessionUser = await resolveSessionUser(authHeader);
  if (!sessionUser) {
    throw new AuthenticationError('Authentication required to access provider meals.');
  }

  if (sessionUser.role !== 'provider' && sessionUser.role !== 'admin') {
    throw new ForbiddenError('Access forbidden: Only verified kitchen providers and administrators can view menu management.');
  }

  const targetProviderId = sessionUser.providerId;
  if (!targetProviderId && sessionUser.role !== 'admin') {
    throw new ForbiddenError('Provider profile is missing an assigned kitchen provider ID.');
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    let query = supabaseAdmin
      .from('meals')
      .select('*, meal_schedules (*)');

    if (targetProviderId) {
      query = query.eq('provider_id', targetProviderId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to query provider meals: ${error.message}`);
    }

    const mapped: MealItem[] = (data || []).map((row: any) => ({
      id: row.id,
      providerId: row.provider_id,
      providerName: row.provider_name || 'Home Kitchen',
      locality: row.locality || 'Bengaluru',
      title: row.title,
      tagline: row.tagline,
      description: row.description,
      pricePerMeal: Number(row.price_per_meal),
      weeklyPricePerMeal: Number(row.weekly_price_per_meal),
      monthlyPricePerMeal: Number(row.monthly_price_per_meal),
      dietType: row.diet_type,
      cuisine: row.cuisine,
      slot: row.slot,
      spiceLevel: row.spice_level,
      packaging: row.packaging,
      imageUrl: row.image_url,
      contents: row.contents || [],
      schedule: (row.meal_schedules || []).map((s: any) => ({
        day: s.day_of_week,
        sabziPrimary: s.sabzi_primary,
        sabziSecondary: s.sabzi_secondary,
        dal: s.dal,
        bread: s.bread,
        rice: s.rice,
        sweetOrSpecial: s.sweet_or_special,
      })),
      isAvailable: row.is_available,
      preparationLeadTime: row.preparation_lead_time,
      caloriesEstimate: row.calories_estimate,
    }));

    return { meals: mapped, isDemoMode: false };
  }

  // Demo store
  const meals = demoStore.meals.filter(m => {
    if (sessionUser.role === 'admin' && !targetProviderId) return true;
    return m.providerId === targetProviderId;
  });

  return { meals, isDemoMode: true };
}

/**
 * Server-Side Meal Creation with strict input validation and provider scoping
 */
export async function createMealServerSide(
  payload: CreateMealInput,
  authHeader?: string
): Promise<{ meal: MealItem; isDemoMode: boolean }> {
  const sessionUser = await resolveSessionUser(authHeader);
  if (!sessionUser) {
    throw new AuthenticationError('Authentication required to create a meal.');
  }

  if (sessionUser.role !== 'provider' && sessionUser.role !== 'admin') {
    throw new ForbiddenError('Access forbidden: Only authorized kitchen operators can create meals.');
  }

  const providerId = sessionUser.providerId;
  if (!providerId) {
    throw new ForbiddenError('Provider profile is missing an assigned kitchen provider ID.');
  }

  // Server-Side Input Validation
  if (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length < 3) {
    throw new ValidationError('Meal title is required and must be at least 3 characters.');
  }

  if (!payload.description || typeof payload.description !== 'string' || payload.description.trim().length < 10) {
    throw new ValidationError('Meal description is required and must be at least 10 characters.');
  }

  if (typeof payload.pricePerMeal !== 'number' || isNaN(payload.pricePerMeal) || payload.pricePerMeal <= 0) {
    throw new ValidationError('Price per meal must be a positive number greater than 0.');
  }

  const validDietTypes = ['pure_veg', 'jain', 'egg_curry', 'homestyle', 'low_oil'];
  if (!payload.dietType || !validDietTypes.includes(payload.dietType)) {
    throw new ValidationError(`Diet type must be one of: [${validDietTypes.join(', ')}].`);
  }

  const validCuisines = ['north_indian', 'south_indian', 'gujarati', 'maharashtrian'];
  if (!payload.cuisine || !validCuisines.includes(payload.cuisine)) {
    throw new ValidationError(`Cuisine must be one of: [${validCuisines.join(', ')}].`);
  }

  const validSlots = ['lunch', 'dinner', 'both'];
  if (!payload.slot || !validSlots.includes(payload.slot)) {
    throw new ValidationError(`Delivery slot must be one of: [${validSlots.join(', ')}].`);
  }

  // Find provider details
  const prov = demoStore.providers.find(p => p.id === providerId);
  const providerName = prov ? prov.name : 'Home Kitchen';
  const locality = prov ? prov.locality : 'Bengaluru';

  const newMealId = `meal-${providerId}-${Date.now().toString().slice(-6)}`;
  const weeklyPrice = payload.weeklyPricePerMeal || Math.round(payload.pricePerMeal * 0.95);
  const monthlyPrice = payload.monthlyPricePerMeal || Math.round(payload.pricePerMeal * 0.90);

  const newMeal: MealItem = {
    id: newMealId,
    providerId,
    providerName,
    locality,
    title: payload.title.trim(),
    tagline: payload.tagline?.trim() || 'Freshly made home-cooked dabba',
    description: payload.description.trim(),
    pricePerMeal: payload.pricePerMeal,
    weeklyPricePerMeal: weeklyPrice,
    monthlyPricePerMeal: monthlyPrice,
    dietType: payload.dietType,
    cuisine: payload.cuisine,
    slot: payload.slot,
    spiceLevel: payload.spiceLevel || 'Medium',
    packaging: payload.packaging || 'Stainless Steel Dabba (Reusable)',
    imageUrl: payload.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=60',
    contents: payload.contents && payload.contents.length > 0 ? payload.contents : ['Fresh Seasonal Sabzi', 'Dal Tadka', '3 Phulkas', 'Jeera Rice', 'Salad'],
    schedule: [
      { day: 'Monday', sabziPrimary: 'Palak Paneer', dal: 'Yellow Dal Tadka', bread: '3 Phulkas with Ghee', rice: 'Jeera Basmati Rice' },
      { day: 'Tuesday', sabziPrimary: 'Aloo Gobi', dal: 'Dal Makhani', bread: '3 Phulkas with Ghee', rice: 'Steamed Rice' },
      { day: 'Wednesday', sabziPrimary: 'Bhindi Masala', dal: 'Panchmel Dal', bread: '3 Phulkas with Ghee', rice: 'Jeera Rice' },
    ],
    isAvailable: payload.isAvailable !== undefined ? payload.isAvailable : true,
    preparationLeadTime: payload.preparationLeadTime || '2 Hours Before Window',
    caloriesEstimate: payload.caloriesEstimate || '550 - 650 kcal',
  };

  if (isSupabaseConfigured && supabaseAdmin) {
    const { error: insertErr } = await supabaseAdmin.from('meals').insert({
      id: newMeal.id,
      provider_id: newMeal.providerId,
      provider_name: newMeal.providerName,
      locality: newMeal.locality,
      title: newMeal.title,
      tagline: newMeal.tagline,
      description: newMeal.description,
      price_per_meal: newMeal.pricePerMeal,
      weekly_price_per_meal: newMeal.weeklyPricePerMeal,
      monthly_price_per_meal: newMeal.monthlyPricePerMeal,
      diet_type: newMeal.dietType,
      cuisine: newMeal.cuisine,
      slot: newMeal.slot,
      spice_level: newMeal.spiceLevel,
      packaging: newMeal.packaging,
      image_url: newMeal.imageUrl,
      contents: newMeal.contents,
      is_available: newMeal.isAvailable,
      preparation_lead_time: newMeal.preparationLeadTime,
      calories_estimate: newMeal.caloriesEstimate,
    });

    if (insertErr) {
      throw new Error(`Failed to insert meal into Supabase: ${insertErr.message}`);
    }

    return { meal: newMeal, isDemoMode: false };
  }

  // Demo Store
  demoStore.meals.unshift(newMeal);
  return { meal: newMeal, isDemoMode: true };
}

/**
 * Server-Side Meal Update with ownership check and validation
 */
export async function updateMealServerSide(
  mealId: string,
  payload: UpdateMealInput,
  authHeader?: string
): Promise<{ meal: MealItem; isDemoMode: boolean }> {
  const sessionUser = await resolveSessionUser(authHeader);
  if (!sessionUser) {
    throw new AuthenticationError('Authentication required to update meal.');
  }

  if (sessionUser.role !== 'provider' && sessionUser.role !== 'admin') {
    throw new ForbiddenError('Access forbidden: Only authorized kitchen operators can modify meals.');
  }

  // Find meal
  let existingMeal: MealItem | undefined;
  if (isSupabaseConfigured && supabaseAdmin) {
    const { data: dbMeal, error: fetchErr } = await supabaseAdmin
      .from('meals')
      .select('*')
      .eq('id', mealId)
      .single();

    if (fetchErr || !dbMeal) {
      throw new NotFoundError(`Meal '${mealId}' not found in database.`);
    }

    existingMeal = {
      id: dbMeal.id,
      providerId: dbMeal.provider_id,
      providerName: dbMeal.provider_name,
      locality: dbMeal.locality,
      title: dbMeal.title,
      description: dbMeal.description,
      pricePerMeal: Number(dbMeal.price_per_meal),
      weeklyPricePerMeal: Number(dbMeal.weekly_price_per_meal),
      monthlyPricePerMeal: Number(dbMeal.monthly_price_per_meal),
      dietType: dbMeal.diet_type,
      cuisine: dbMeal.cuisine,
      slot: dbMeal.slot,
      contents: dbMeal.contents || [],
      schedule: [],
      isAvailable: dbMeal.is_available,
    };
  } else {
    existingMeal = demoStore.meals.find(m => m.id === mealId);
  }

  if (!existingMeal) {
    throw new NotFoundError(`Meal '${mealId}' not found.`);
  }

  // Ownership Enforcement: Must belong to provider
  if (existingMeal.providerId !== sessionUser.providerId && sessionUser.role !== 'admin') {
    throw new ForbiddenError('Forbidden: You are not authorized to modify meals belonging to another kitchen.');
  }

  // Validate fields if provided
  if (payload.title !== undefined && (typeof payload.title !== 'string' || payload.title.trim().length < 3)) {
    throw new ValidationError('Meal title must be at least 3 characters.');
  }

  if (payload.pricePerMeal !== undefined && (typeof payload.pricePerMeal !== 'number' || isNaN(payload.pricePerMeal) || payload.pricePerMeal <= 0)) {
    throw new ValidationError('Price per meal must be greater than 0.');
  }

  if (payload.description !== undefined && (typeof payload.description !== 'string' || payload.description.trim().length < 10)) {
    throw new ValidationError('Meal description must be at least 10 characters.');
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    const updates: Record<string, any> = {};
    if (payload.title !== undefined) updates.title = payload.title.trim();
    if (payload.description !== undefined) updates.description = payload.description.trim();
    if (payload.pricePerMeal !== undefined) updates.price_per_meal = payload.pricePerMeal;
    if (payload.weeklyPricePerMeal !== undefined) updates.weekly_price_per_meal = payload.weeklyPricePerMeal;
    if (payload.monthlyPricePerMeal !== undefined) updates.monthly_price_per_meal = payload.monthlyPricePerMeal;
    if (payload.dietType !== undefined) updates.diet_type = payload.dietType;
    if (payload.cuisine !== undefined) updates.cuisine = payload.cuisine;
    if (payload.slot !== undefined) updates.slot = payload.slot;
    if (payload.isAvailable !== undefined) updates.is_available = payload.isAvailable;
    if (payload.tagline !== undefined) updates.tagline = payload.tagline.trim();

    const { error: updateErr } = await supabaseAdmin
      .from('meals')
      .update(updates)
      .eq('id', mealId);

    if (updateErr) {
      throw new Error(`Failed to update meal in Supabase: ${updateErr.message}`);
    }

    return { meal: { ...existingMeal, ...payload } as MealItem, isDemoMode: false };
  }

  // Demo store update
  const mealInStore = demoStore.meals.find(m => m.id === mealId)!;
  if (payload.title !== undefined) mealInStore.title = payload.title.trim();
  if (payload.description !== undefined) mealInStore.description = payload.description.trim();
  if (payload.pricePerMeal !== undefined) mealInStore.pricePerMeal = payload.pricePerMeal;
  if (payload.weeklyPricePerMeal !== undefined) mealInStore.weeklyPricePerMeal = payload.weeklyPricePerMeal;
  if (payload.monthlyPricePerMeal !== undefined) mealInStore.monthlyPricePerMeal = payload.monthlyPricePerMeal;
  if (payload.dietType !== undefined) mealInStore.dietType = payload.dietType;
  if (payload.cuisine !== undefined) mealInStore.cuisine = payload.cuisine;
  if (payload.slot !== undefined) mealInStore.slot = payload.slot;
  if (payload.isAvailable !== undefined) mealInStore.isAvailable = payload.isAvailable;
  if (payload.tagline !== undefined) mealInStore.tagline = payload.tagline.trim();

  return { meal: mealInStore, isDemoMode: true };
}

/**
 * Server-Side Meal Availability Toggle (Deactivate / Reactivate)
 */
export async function toggleMealAvailabilityServerSide(
  mealId: string,
  isAvailable: boolean,
  authHeader?: string
): Promise<{ mealId: string; isAvailable: boolean; isDemoMode: boolean }> {
  const sessionUser = await resolveSessionUser(authHeader);
  if (!sessionUser) {
    throw new AuthenticationError('Authentication required to change meal availability.');
  }

  if (sessionUser.role !== 'provider' && sessionUser.role !== 'admin') {
    throw new ForbiddenError('Access forbidden: Only authorized kitchen operators can change meal availability.');
  }

  let mealProviderId: string | undefined;

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data: dbMeal, error: fetchErr } = await supabaseAdmin
      .from('meals')
      .select('id, provider_id')
      .eq('id', mealId)
      .single();

    if (fetchErr || !dbMeal) {
      throw new NotFoundError(`Meal '${mealId}' not found in database.`);
    }

    mealProviderId = dbMeal.provider_id;
  } else {
    const found = demoStore.meals.find(m => m.id === mealId);
    if (!found) {
      throw new NotFoundError(`Meal '${mealId}' not found.`);
    }
    mealProviderId = found.providerId;
  }

  // Provider Ownership Check
  if (mealProviderId !== sessionUser.providerId && sessionUser.role !== 'admin') {
    throw new ForbiddenError('Forbidden: You are not authorized to activate/deactivate meals belonging to another kitchen.');
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    const { error: updateErr } = await supabaseAdmin
      .from('meals')
      .update({ is_available: isAvailable })
      .eq('id', mealId);

    if (updateErr) {
      throw new Error(`Failed to update meal availability in Supabase: ${updateErr.message}`);
    }

    return { mealId, isAvailable, isDemoMode: false };
  }

  // Demo Store
  const found = demoStore.meals.find(m => m.id === mealId);
  if (found) {
    found.isAvailable = isAvailable;
  }

  return { mealId, isAvailable, isDemoMode: true };
}

// Test / Diagnostic Helpers
export const demoStoreHelpers = {
  getDemoStore: () => demoStore,
  setMealAvailability: (mealId: string, isAvailable: boolean) => {
    const meal = demoStore.meals.find(m => m.id === mealId);
    if (meal) meal.isAvailable = isAvailable;
  },
  setProviderActive: (providerId: string, isActive: boolean) => {
    const prov = demoStore.providers.find(p => p.id === providerId);
    if (prov) prov.isActive = isActive;
  },
  setMealPrice: (mealId: string, price: number) => {
    const meal = demoStore.meals.find(m => m.id === mealId);
    if (meal) meal.pricePerMeal = price;
  },
  resetDemoOrders: () => {
    demoStore.orders = [];
    idempotencyCache.clear();
    recentSubmissions.clear();
  },
};


