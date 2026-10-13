-- ==============================================================================
-- TiffinTrack Supabase PostgreSQL Seed Script
-- Realistic, clearly labeled sample demo data
-- ==============================================================================

-- 1. Seed Providers (Home Kitchens)
INSERT INTO providers (
    id, name, lead_chef, avatar_url, banner_url, bio, locality, city, distance_km,
    open_slots, demo_license_notice, contact_phone, hygiene_standards,
    lunch_window, dinner_window, rating, active_subscribers, established_year, is_active
) VALUES
(
    'prov-annapurna',
    'Shree Annapurna Kitchen (Demo)',
    'Sunita Sharma & Family',
    '/src/assets/images/meal_north_thali_1791881641558.jpg',
    '/src/assets/images/tiffin_hero_thali_1791881640666.jpg',
    'Homestyle cooking prepared daily in small batches with low oil and freshly ground spices. Specializing in warm phulkas and comforting North Indian & Rajasthani dal preparations.',
    'Indiranagar 2nd Stage',
    'Bengaluru',
    2.1,
    ARRAY['lunch', 'dinner'],
    'Demo FSSAI Registration #DEMO-KA-88194',
    '+91 98450 12048 (Demo)',
    ARRAY['Filtered RO water for all cooking', 'Daily temperature checks & hairnets', 'Food cooked fresh 90 mins prior to delivery', 'Zero artificial colors or preservatives'],
    '12:15 PM – 1:15 PM',
    '7:45 PM – 8:45 PM',
    4.9,
    84,
    2021,
    true
),
(
    'prov-dakshin',
    'Dakshin Dabba Co. (Demo)',
    'Meenakshi Iyer',
    '/src/assets/images/meal_south_meals_1791881641536.jpg',
    '/src/assets/images/meal_south_meals_1791881641536.jpg',
    'Authentic South Indian everyday meals passed down through generations. Wholesome drumstick sambar, soothing pepper rasam, and light poriyals with freshly grated coconut.',
    'Koramangala 4th Block',
    'Bengaluru',
    3.4,
    ARRAY['lunch', 'dinner'],
    'Demo FSSAI Registration #DEMO-KA-77402',
    '+91 98860 33912 (Demo)',
    ARRAY['Fresh daily local market vegetables', 'Stainless steel sanitization cycle', 'Traditional stone-ground sambar masala', 'Insulated thermal dabba bags'],
    '12:00 PM – 1:00 PM',
    '7:30 PM – 8:30 PM',
    4.8,
    62,
    2022,
    true
),
(
    'prov-swasthya',
    'Swasthya Sattvic Meals (Demo)',
    'Hasmukh & Hansa Shah',
    '/src/assets/images/meal_jain_sattvic_1791881641292.jpg',
    '/src/assets/images/meal_jain_sattvic_1791881641292.jpg',
    'Dedicated pure sattvic kitchen strictly adhering to Jain principles. Completely free from onion, garlic, and root vegetables. Gentle, easily digestible everyday lunches and dinners.',
    'Jayanagar 4th Block',
    'Bengaluru',
    4.2,
    ARRAY['lunch', 'dinner'],
    'Demo FSSAI Registration #DEMO-KA-99105',
    '+91 99001 44520 (Demo)',
    ARRAY['Strict 100% vegetarian & sattvic utensils', 'Pure cold-pressed groundnut oil and cow ghee', 'Solar-heated sanitization for tiffin containers', 'Daily morning kitchen inspection'],
    '11:45 AM – 12:45 PM',
    '6:45 PM – 7:45 PM',
    4.9,
    91,
    2020,
    true
),
(
    'prov-gharka',
    'Ghar Ka Khana Express (Demo)',
    'Rekha Devi',
    '/src/assets/images/tiffin_hero_thali_1791881640666.jpg',
    '/src/assets/images/tiffin_hero_thali_1791881640666.jpg',
    'Budget-friendly, wholesome meals specially tailored for college students and working professionals craving mother''s cooking away from home.',
    'HSR Layout Sector 1',
    'Bengaluru',
    1.8,
    ARRAY['lunch', 'dinner'],
    'Demo FSSAI Registration #DEMO-KA-55219',
    '+91 97412 88190 (Demo)',
    ARRAY['Daily menu rotation so you never get bored', 'Low spice and low salt option available', 'High-grade microwave-safe sealed compartments', 'Contactless delivery at security reception'],
    '12:30 PM – 1:30 PM',
    '8:00 PM – 9:00 PM',
    4.7,
    110,
    2023,
    true
)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Meals
INSERT INTO meals (
    id, provider_id, title, tagline, description, price_per_meal,
    weekly_price_per_meal, monthly_price_per_meal, diet_type, cuisine, slot,
    spice_level, packaging, rating, total_ratings_count, image_url, contents,
    is_available, preparation_lead_time, calories_estimate
) VALUES
(
    'meal-north-deluxe',
    'prov-annapurna',
    'Maa''s Homestyle North Deluxe Thali (Demo)',
    'Fresh phulkas, comforting dal tadka, paneer specialty, and fragrant basmati rice.',
    'Our flagship daily tiffin. Every meal features 4 piping hot whole-wheat phulkas brushed with pure cow ghee, slow-cooked yellow arhar dal with cumin-garlic tadka, rich cottage cheese bhurji, and fresh salad. Packed in reusable insulated dabbas.',
    110.00,
    95.00,
    85.00,
    'pure_veg',
    'north_indian',
    'both',
    'Medium',
    'Insulated Stainless Dabba',
    4.9,
    230,
    '/src/assets/images/meal_north_thali_1791881641558.jpg',
    ARRAY['4 Soft Whole-Wheat Ghee Phulkas', 'Dal Tadka with Hing & Jeera', 'Paneer Bhurji / Matar Paneer', 'Steamed Fragrant Basmati Rice', 'Carrot-Cucumber Kachumber Salad & Lemon', 'Homestyle Mango Pickle'],
    true,
    'Order 90 mins before slot',
    '560 kcal'
),
(
    'meal-south-meals',
    'prov-dakshin',
    'Traditional Dakshin Homestyle Lunch Dabba (Demo)',
    'Warm sambar, rejuvenating rasam, dry vegetable poriyal, and cooling curd rice.',
    'A balanced Tamil-Brahmin and Kerala inspired everyday lunch. Features drumstick and shallot sambar tempered with fresh curry leaves, a soothing pepper rasam, seasonal vegetable poriyal with fresh coconut shavings, and homemade curd rice with mustard tadka.',
    100.00,
    88.00,
    78.00,
    'pure_veg',
    'south_indian',
    'lunch',
    'Medium',
    'Insulated Stainless Dabba',
    4.8,
    168,
    '/src/assets/images/meal_south_meals_1791881641536.jpg',
    ARRAY['Piping Hot Drumstick Shallot Sambar', 'Freshly Ground Pepper Cumin Rasam', 'Carrot & Beans Coconut Poriyal', 'Soothing Curd Rice with Mustard Tadka', 'Steamed Sona Masoori Rice', 'Crispy Urad Dal Appalam & Lemon Pickle'],
    true,
    'Order 2 hrs before slot',
    '510 kcal'
),
(
    'meal-jain-sattvic',
    'prov-swasthya',
    'Sattvic Jain Pure Health Tiffin (Demo)',
    '100% Jain: No onion, garlic, or root vegetables. Light on stomach, high on nutrition.',
    'Crafted strictly for sattvic practitioners and mindful eaters. Fresh methi theplas, protein-packed yellow moong dal, dairy-fresh paneer curry made with fresh tomato-cashew puree, steamed jeera rice, and cucumber slices.',
    115.00,
    99.00,
    89.00,
    'jain',
    'gujarati',
    'both',
    'Mild',
    'Food-Grade Sealed Tray',
    4.9,
    195,
    '/src/assets/images/meal_jain_sattvic_1791881641292.jpg',
    ARRAY['3 Soft Methi Theplas (Light Cow Ghee)', 'Yellow Moong Dal with Cumin Tadka', 'Mild Shahi Paneer (No Onion/Garlic)', 'Steamed Fragrant Jeera Rice', 'Crisp Cucumber & Tomato Slices', 'Sweet Gujarati Chhundo'],
    true,
    'Order 90 mins before slot',
    '490 kcal'
),
(
    'meal-homestyle-budget',
    'prov-gharka',
    'Daily Student & Pro Comfort Dabba (Demo)',
    'Simple, unpretentious homestyle food with minimal oil that feels just like mom made it.',
    'Designed for daily consumption without feeling heavy. Light yellow dal, 3 whole-wheat rotis, seasonal dry sabzi, and plain steamed rice. Guaranteed zero digestive burnout.',
    90.00,
    80.00,
    72.00,
    'homestyle',
    'north_indian',
    'both',
    'Mild',
    'Food-Grade Sealed Tray',
    4.7,
    310,
    '/src/assets/images/tiffin_hero_thali_1791881640666.jpg',
    ARRAY['3 Soft Tawa Rotis', 'Simple Ghar Ki Dal (Moong / Masoor)', 'Seasonal Sabzi (Aloo Matar / Bhindi / Gobi)', 'Steamed Basmati Rice', 'Homemade Fresh Curd', 'Lemon & Green Chili'],
    true,
    'Order 1 hr before slot',
    '460 kcal'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Meal Schedules
INSERT INTO meal_schedules (
    meal_id, day_of_week, sabzi_primary, sabzi_secondary, dal, bread, rice, sweet_or_special
) VALUES
('meal-north-deluxe', 'Monday', 'Paneer Bhurji', 'Aloo Jeera', 'Yellow Dal Tadka', '4 Phulkas', 'Jeera Rice', 'Gulab Jamun'),
('meal-north-deluxe', 'Tuesday', 'Palak Paneer', 'Lauki Chana Dal', 'Dal Makhani (Light)', '4 Phulkas', 'Steamed Rice', NULL),
('meal-north-deluxe', 'Wednesday', 'Shahi Matar Paneer', 'Bhindi Masala', 'Panchmel Dal', '4 Phulkas', 'Peas Pulao', 'Kheer'),
('meal-north-deluxe', 'Thursday', 'Kadhai Paneer', 'Baingan Bharta', 'Moong Dal Fry', '4 Phulkas', 'Steamed Rice', NULL),
('meal-north-deluxe', 'Friday', 'Paneer Do Pyaza', 'Aloo Methi', 'Chana Dal Tadka', '4 Phulkas', 'Veg Pulao', 'Suji Halwa'),
('meal-north-deluxe', 'Saturday', 'Amritsari Chole Paneer', 'Tinda Masala', 'Arhar Dal', '4 Phulkas', 'Jeera Rice', NULL);

-- 4. Seed Demo Customer Reviews
INSERT INTO customer_reviews (
    provider_id, meal_id, author_name, rating, review_text, diet_tag, is_demo_feedback
) VALUES
('prov-annapurna', 'meal-north-deluxe', 'Arjun K.', 5, 'The phulkas arrive genuinely warm and soft! I work remotely from Indiranagar and was tired of oily restaurant food. This feels exactly like mom cooked it.', 'Pure Veg', true),
('prov-dakshin', 'meal-south-meals', 'Divya Nambiar', 5, 'The pepper rasam is medicinal and fragrant, and the curd rice is properly tempered. Perfect daily lunch subscription for office days.', 'South Indian', true),
('prov-swasthya', 'meal-jain-sattvic', 'Bhavin Mehta', 5, 'Finding genuine Jain tiffin without hidden garlic in Bengaluru was nearly impossible until I found Hansaben''s kitchen. The theplas stay soft for hours.', 'Jain Sattvic', true),
('prov-gharka', 'meal-homestyle-budget', 'Priya Sengupta', 4, 'Incredible value for money at ₹80/meal for the monthly plan. Delivery guy arrives at our apartment reception right between 12:45 and 1:00 PM every weekday.', 'Homestyle', true);
