-- ==========================================================
-- FORCE FIX & SEED: DVD Rental Semantic Model & Metrics
-- ==========================================================

-- 1. FORCE DROP problematic constraint
ALTER TABLE public.metrics_library DROP CONSTRAINT IF EXISTS metrics_library_category_check;

-- 2. Ensure Schema Consistency
DO $$ 
BEGIN
    -- Rename sql_formula to formula if it exists in metrics_library
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'metrics_library' AND column_name = 'sql_formula') THEN
        ALTER TABLE public.metrics_library RENAME COLUMN sql_formula TO formula;
    END IF;

    -- Ensure required columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'metrics_library' AND column_name = 'formula') THEN
        ALTER TABLE public.metrics_library ADD COLUMN formula TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'metrics_library' AND column_name = 'required_fields') THEN
        ALTER TABLE public.metrics_library ADD COLUMN required_fields TEXT[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'metrics_library' AND column_name = 'is_global') THEN
        ALTER TABLE public.metrics_library ADD COLUMN is_global BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 3. Clear existing metrics to avoid duplicate name conflicts (Optional but recommended for fresh seed)
DELETE FROM public.metrics_library WHERE is_global = true;

-- 4. Insert Global Metrics into metrics_library
INSERT INTO public.metrics_library 
(name, formula, description, format, category, required_fields, is_global)
VALUES
('Total Revenue', 'SUM(payment.amount)', 'Total gross revenue from all payments processed.', 'currency', 'Financial', ARRAY['payment.amount'], true),
('Rental Transactions', 'COUNT(rental.rental_id)', 'Total volume of rental transactions across all stores.', 'number', 'Activity', ARRAY['rental.rental_id'], true),
('Current Active Rentals', 'SUM(CASE WHEN rental.return_date IS NULL THEN 1 ELSE 0 END)', 'Number of films currently checked out (not yet returned).', 'number', 'Operations', ARRAY['rental.return_date', 'rental.rental_id'], true),
('Average Rental Rate', 'AVG(film.rental_rate)', 'The average unit price charged per film rental.', 'currency', 'Inventory', ARRAY['film.rental_rate'], true),
('Average Film Length', 'AVG(film.length)', 'Average duration of films in the catalog (minutes).', 'number', 'Inventory', ARRAY['film.length'], true),
('Avg Revenue Per Customer', 'SUM(payment.amount) / COUNT(DISTINCT payment.customer_id)', 'Average total spend per unique customer (Lifetime Value).', 'currency', 'Financial', ARRAY['payment.amount', 'payment.customer_id'], true),
('Total Film Catalog', 'COUNT(film.film_id)', 'The total count of unique film titles available.', 'number', 'Inventory', ARRAY['film.film_id'], true);

-- 5. Create/Update the DVD Rental Master Model Configuration
DELETE FROM public.configurations WHERE name = 'DVD Rental Master Model';
INSERT INTO public.configurations 
(name, description, type, config, is_public)
VALUES
(
    'DVD Rental Master Model', 
    'Pre-configured semantic model for the DVD Rental store database including core tables and analytical joins.', 
    'db_config', 
    '{
        "tables": [
            {"name": "film", "fields": ["film_id", "title", "rental_rate", "length", "rating"]},
            {"name": "rental", "fields": ["rental_id", "rental_date", "inventory_id", "customer_id", "return_date"]},
            {"name": "payment", "fields": ["payment_id", "customer_id", "amount", "payment_date", "rental_id"]},
            {"name": "inventory", "fields": ["inventory_id", "film_id", "store_id"]},
            {"name": "customer", "fields": ["customer_id", "first_name", "last_name", "email", "active"]}
        ],
        "joins": [
            {"from": "rental.inventory_id", "to": "inventory.inventory_id", "type": "inner"},
            {"from": "inventory.film_id", "to": "film.film_id", "type": "inner"},
            {"from": "payment.rental_id", "to": "rental.rental_id", "type": "inner"},
            {"from": "rental.customer_id", "to": "customer.customer_id", "type": "inner"}
        ]
    }'::jsonb, 
    true
);
