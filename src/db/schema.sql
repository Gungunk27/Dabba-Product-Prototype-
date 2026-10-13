-- ==============================================================================
-- TiffinTrack Supabase PostgreSQL Database Schema & Migration
-- ==============================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Customer & Kitchen Operator Accounts linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    full_name TEXT NOT NULL,
    phone TEXT,
    default_address TEXT,
    default_locality TEXT,
    role TEXT NOT NULL CHECK (role IN ('customer', 'provider', 'admin')) DEFAULT 'customer',
    provider_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Providers Table (Home Kitchens / Tiffin Centers)
CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lead_chef TEXT NOT NULL,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT NOT NULL,
    locality TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Bengaluru',
    distance_km NUMERIC(3,1) NOT NULL DEFAULT 2.5,
    open_slots TEXT[] NOT NULL DEFAULT ARRAY['lunch', 'dinner'],
    demo_license_notice TEXT NOT NULL DEFAULT 'Demo FSSAI #DEMO-REG-2026',
    contact_phone TEXT NOT NULL,
    hygiene_standards TEXT[] NOT NULL,
    lunch_window TEXT NOT NULL DEFAULT '12:15 PM - 1:15 PM',
    dinner_window TEXT NOT NULL DEFAULT '7:45 PM - 8:45 PM',
    rating NUMERIC(2,1) NOT NULL DEFAULT 4.7,
    active_subscribers INT NOT NULL DEFAULT 0,
    established_year INT NOT NULL DEFAULT 2022,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Foreign key link from profile to provider
ALTER TABLE profiles 
    DROP CONSTRAINT IF EXISTS fk_profiles_provider,
    ADD CONSTRAINT fk_profiles_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL;

-- 3. Meals Table (Tiffin Plans & Daily Dabbas)
CREATE TABLE IF NOT EXISTS meals (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    tagline TEXT NOT NULL,
    description TEXT NOT NULL,
    price_per_meal NUMERIC(6,2) NOT NULL CHECK (price_per_meal > 0),
    weekly_price_per_meal NUMERIC(6,2) NOT NULL CHECK (weekly_price_per_meal > 0),
    monthly_price_per_meal NUMERIC(6,2) NOT NULL CHECK (monthly_price_per_meal > 0),
    diet_type TEXT NOT NULL CHECK (diet_type IN ('pure_veg', 'jain', 'egg_curry', 'homestyle', 'low_oil')),
    cuisine TEXT NOT NULL CHECK (cuisine IN ('north_indian', 'south_indian', 'gujarati', 'maharashtrian')),
    slot TEXT NOT NULL CHECK (slot IN ('lunch', 'dinner', 'both')),
    spice_level TEXT NOT NULL CHECK (spice_level IN ('Mild', 'Medium', 'Zesty')),
    packaging TEXT NOT NULL CHECK (packaging IN ('Insulated Stainless Dabba', 'Food-Grade Sealed Tray')),
    rating NUMERIC(2,1) NOT NULL DEFAULT 4.8,
    total_ratings_count INT NOT NULL DEFAULT 0,
    image_url TEXT NOT NULL,
    contents TEXT[] NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    preparation_lead_time TEXT NOT NULL DEFAULT 'Order 2 hrs prior',
    calories_estimate TEXT NOT NULL DEFAULT '500-600 kcal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Daily Schedules Table (Rotational weekday menus)
CREATE TABLE IF NOT EXISTS meal_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    sabzi_primary TEXT NOT NULL,
    sabzi_secondary TEXT,
    dal TEXT NOT NULL,
    bread TEXT NOT NULL,
    rice TEXT NOT NULL,
    sweet_or_special TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Customer Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    locality TEXT NOT NULL,
    landmark TEXT,
    subtotal NUMERIC(8,2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(6,2) NOT NULL DEFAULT 0,
    packaging_fee NUMERIC(6,2) NOT NULL DEFAULT 0,
    discount NUMERIC(6,2) NOT NULL DEFAULT 0,
    final_amount NUMERIC(8,2) NOT NULL CHECK (final_amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'upi_on_delivery')),
    delivery_slot TEXT NOT NULL CHECK (delivery_slot IN ('lunch', 'dinner')),
    order_notes TEXT,
    idempotency_key TEXT,
    status TEXT NOT NULL CHECK (status IN ('requested', 'accepted', 'confirmed', 'preparing', 'ready', 'completed', 'dispatched', 'delivered', 'cancelled', 'rejected')) DEFAULT 'requested',
    estimated_delivery_time TEXT NOT NULL,
    is_demo_order BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Order Line Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    meal_id TEXT NOT NULL REFERENCES meals(id),
    meal_title TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('single_trial', 'weekly_6days', 'monthly_24days')),
    quantity INT NOT NULL CHECK (quantity > 0 AND quantity <= 50),
    delivery_slot TEXT NOT NULL CHECK (delivery_slot IN ('lunch', 'dinner')),
    unit_price NUMERIC(6,2) NOT NULL CHECK (unit_price > 0),
    total_price NUMERIC(8,2) NOT NULL CHECK (total_price > 0),
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Customer Reviews Table
CREATE TABLE IF NOT EXISTS customer_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    meal_id TEXT REFERENCES meals(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    diet_tag TEXT NOT NULL,
    is_demo_feedback BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_providers_is_active ON providers(is_active);
CREATE INDEX IF NOT EXISTS idx_meals_provider_id ON meals(provider_id);
CREATE INDEX IF NOT EXISTS idx_meals_is_available ON meals(is_available);
CREATE INDEX IF NOT EXISTS idx_meals_diet_type ON meals(diet_type);
CREATE INDEX IF NOT EXISTS idx_meals_cuisine ON meals(cuisine);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- Do not treat hidden UI elements as security; enforce permissions at DB level.
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS
DROP POLICY IF EXISTS "Public can view provider profiles" ON profiles;
CREATE POLICY "Public can view provider profiles" ON profiles 
    FOR SELECT USING (role = 'provider');

DROP POLICY IF EXISTS "Users can view and edit their own profile" ON profiles;
CREATE POLICY "Users can view and edit their own profile" ON profiles 
    FOR ALL USING (auth.uid() = id);

-- 2. Providers RLS: Public discovery allows only active providers
DROP POLICY IF EXISTS "Public can discover active providers" ON providers;
CREATE POLICY "Public can discover active providers" ON providers 
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Kitchen operators can update their own provider profile" ON providers;
CREATE POLICY "Kitchen operators can update their own provider profile" ON providers 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.provider_id = providers.id
        )
    );

-- 3. Meals RLS: Public discovery allows only available meals
DROP POLICY IF EXISTS "Public can discover available meals" ON meals;
CREATE POLICY "Public can discover available meals" ON meals 
    FOR SELECT USING (is_available = true);

DROP POLICY IF EXISTS "Kitchen operators can manage their meals" ON meals;
CREATE POLICY "Kitchen operators can manage their meals" ON meals 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.provider_id = meals.provider_id
        )
    );

-- 4. Meal Schedules RLS: Anyone can view schedules of available meals
DROP POLICY IF EXISTS "Public can view meal schedules" ON meal_schedules;
CREATE POLICY "Public can view meal schedules" ON meal_schedules 
    FOR SELECT USING (true);

-- 5. Orders RLS
DROP POLICY IF EXISTS "Public can create orders" ON orders;
CREATE POLICY "Public can create orders" ON orders 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their orders" ON orders;
CREATE POLICY "Users can view their orders" ON orders 
    FOR SELECT USING (
        -- Customer can view their own orders
        (customer_id = auth.uid())
        -- Admins can view all orders
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
        -- Providers can ONLY view orders containing items from their own kitchen
        OR EXISTS (
            SELECT 1 FROM order_items
            JOIN meals ON meals.id = order_items.meal_id
            JOIN profiles ON profiles.id = auth.uid()
            WHERE order_items.order_id = orders.id
            AND meals.provider_id = profiles.provider_id
            AND profiles.role = 'provider'
        )
    );

DROP POLICY IF EXISTS "Authorized providers and admins can update order status" ON orders;
CREATE POLICY "Authorized providers and admins can update order status" ON orders
    FOR UPDATE USING (
        -- Admins can update any order
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
        -- Providers can ONLY update orders for their own kitchen
        OR EXISTS (
            SELECT 1 FROM order_items
            JOIN meals ON meals.id = order_items.meal_id
            JOIN profiles ON profiles.id = auth.uid()
            WHERE order_items.order_id = orders.id
            AND meals.provider_id = profiles.provider_id
            AND profiles.role = 'provider'
        )
    );

-- 6. Order Items RLS
DROP POLICY IF EXISTS "Anyone can insert order items" ON order_items;
CREATE POLICY "Anyone can insert order items" ON order_items 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their order items" ON order_items;
CREATE POLICY "Users can view their order items" ON order_items 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.customer_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM meals
            JOIN profiles ON profiles.id = auth.uid()
            WHERE meals.id = order_items.meal_id
            AND meals.provider_id = profiles.provider_id
            AND profiles.role = 'provider'
        )
    );

-- 7. Reviews RLS: Public read
DROP POLICY IF EXISTS "Public can view reviews" ON customer_reviews;
CREATE POLICY "Public can view reviews" ON customer_reviews 
    FOR SELECT USING (true);
