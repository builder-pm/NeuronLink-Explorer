-- Seed Data for Sample Configurations

-- 1. DB Configuration: Rental Business Overview
INSERT INTO public.configurations (name, description, type, is_public, config)
VALUES (
    'Rental Business Model',
    'A complete model for analyzing rentals, customers, and payments.',
    'db_config',
    true,
    '{
        "modelConfiguration": {
            "rental": ["rental_id", "rental_date", "inventory_id", "customer_id", "return_date", "staff_id"],
            "customer": ["customer_id", "store_id", "first_name", "last_name", "email", "active", "create_date"],
            "payment": ["payment_id", "customer_id", "staff_id", "rental_id", "amount", "payment_date"],
            "inventory": ["inventory_id", "film_id", "store_id"],
            "film": ["film_id", "title", "description", "release_year", "language_id", "rental_duration", "rental_rate", "length", "replacement_cost", "rating"]
        },
        "joins": [
            {
                "from": "rental",
                "to": "customer",
                "type": "INNER JOIN",
                "on": { "from": "customer_id", "to": "customer_id" }
            },
            {
                "from": "rental",
                "to": "inventory",
                "type": "INNER JOIN",
                "on": { "from": "inventory_id", "to": "inventory_id" }
            },
            {
                "from": "inventory",
                "to": "film",
                "type": "INNER JOIN",
                "on": { "from": "film_id", "to": "film_id" }
            },
            {
                "from": "payment",
                "to": "rental",
                "type": "INNER JOIN",
                "on": { "from": "rental_id", "to": "rental_id" }
            }
        ],
        "tablePositions": {
            "rental": { "top": 300, "left": 400 },
            "customer": { "top": 100, "left": 100 },
            "payment": { "top": 500, "left": 400 },
            "inventory": { "top": 300, "left": 800 },
            "film": { "top": 300, "left": 1100 }
        }
    }'::jsonb
);

-- 2. Analysis Configuration: Sales by Film Category
INSERT INTO public.configurations (name, description, type, is_public, config)
VALUES (
    'Sales by Film Category',
    'Pivot analysis showing total sales revenue broken down by film category.',
    'analysis_config',
    true,
    '{
        "selectedFields": ["category.name", "payment.amount", "film.rating"],
        "pivotConfig": {
            "rows": ["name"],
            "columns": ["rating"],
            "values": [
                {
                    "field": "amount",
                    "aggregation": "SUM",
                    "displayName": "Total Revenue"
                }
            ]
        },
        "filters": []
    }'::jsonb
);

-- 3. Analysis Configuration: Customer Activity
INSERT INTO public.configurations (name, description, type, is_public, config)
VALUES (
    'Customer Activity Analysis',
    'Analyze customer rental frequency and active status.',
    'analysis_config',
    true,
    '{
        "selectedFields": ["customer.active", "rental.rental_id"],
        "pivotConfig": {
            "rows": ["active"],
            "columns": [],
            "values": [
                {
                    "field": "rental_id",
                    "aggregation": "COUNT",
                    "displayName": "Total Rentals"
                }
            ]
        },
        "filters": []
    }'::jsonb
);

-- 4. DB Configuration: Staff & Store Performance
INSERT INTO public.configurations (name, description, type, is_public, config)
VALUES (
    'Staff & Store Operations',
    'Focus on staff hierarchy, store assignments, and payment processing.',
    'db_config',
    true,
    '{
        "modelConfiguration": {
            "staff": ["staff_id", "first_name", "last_name", "store_id", "email", "active"],
            "store": ["store_id", "manager_staff_id", "address_id"],
            "payment": ["payment_id", "customer_id", "staff_id", "amount", "payment_date"],
            "address": ["address_id", "address", "district", "city_id", "postal_code"]
        },
        "joins": [
            {
                "from": "staff",
                "to": "store",
                "type": "INNER JOIN",
                "on": { "from": "store_id", "to": "store_id" }
            },
            {
                "from": "payment",
                "to": "staff",
                "type": "INNER JOIN",
                "on": { "from": "staff_id", "to": "staff_id" }
            },
             {
                "from": "store",
                "to": "address",
                "type": "INNER JOIN",
                "on": { "from": "address_id", "to": "address_id" }
            }
        ],
        "tablePositions": {
            "staff": { "top": 100, "left": 400 },
            "store": { "top": 100, "left": 100 },
            "payment": { "top": 400, "left": 400 },
            "address": { "top": 400, "left": 100 }
        }
    }'::jsonb
);

-- 5. DB Configuration: Inventory Deep Dive
INSERT INTO public.configurations (name, description, type, is_public, config)
VALUES (
    'Global Inventory Catalog',
    'Full view of film inventory, categories, and languages.',
    'db_config',
    true,
    '{
        "modelConfiguration": {
            "inventory": ["inventory_id", "film_id", "store_id"],
            "film": ["film_id", "title", "release_year", "language_id", "original_language_id"],
            "film_category": ["film_id", "category_id"],
            "category": ["category_id", "name"],
            "language": ["language_id", "name"]
        },
        "joins": [
            {
                "from": "inventory",
                "to": "film",
                "type": "INNER JOIN",
                "on": { "from": "film_id", "to": "film_id" }
            },
            {
                "from": "film_category",
                "to": "film",
                "type": "INNER JOIN",
                "on": { "from": "film_id", "to": "film_id" }
            },
            {
                "from": "film_category",
                "to": "category",
                "type": "INNER JOIN",
                "on": { "from": "category_id", "to": "category_id" }
            },
             {
                "from": "film",
                "to": "language",
                "type": "INNER JOIN",
                "on": { "from": "language_id", "to": "language_id" }
            }
        ],
        "tablePositions": {
            "inventory": { "top": 300, "left": 100 },
            "film": { "top": 300, "left": 400 },
            "language": { "top": 100, "left": 400 },
            "film_category": { "top": 300, "left": 700 },
            "category": { "top": 300, "left": 1000 }
        }
    }'::jsonb
);

-- 6. Analysis Configuration: Revenue by Store
INSERT INTO public.configurations (name, description, type, is_public, config)
VALUES (
    'Store Revenue Performance',
    'Compare total revenue generated by each store.',
    'analysis_config',
    true,
    '{
        "selectedFields": ["store.store_id", "payment.amount"],
        "pivotConfig": {
            "rows": ["store_id"],
            "columns": [],
            "values": [
                {
                    "field": "amount",
                    "aggregation": "SUM",
                    "displayName": "Total Revenue"
                }
            ]
        },
        "filters": []
    }'::jsonb
);

-- 7. Analysis Configuration: Rental Duration vs Rating
INSERT INTO public.configurations (name, description, type, is_public, config)
VALUES (
    'Rental Duration Strategy',
    'Average rental duration analyzed by film rating.',
    'analysis_config',
    true,
    '{
        "selectedFields": ["film.rating", "film.rental_duration"],
        "pivotConfig": {
            "rows": ["rating"],
            "columns": [],
            "values": [
                {
                    "field": "rental_duration",
                    "aggregation": "AVG",
                    "displayName": "Avg Duration (Days)"
                }
            ]
        },
        "filters": []
    }'::jsonb
);

-- 8. DB Configuration: Actor Filmography
INSERT INTO public.configurations (name, description, type, is_public, config)
VALUES (
    'Actor Filmography',
    'Track which actors appeared in which films.',
    'db_config',
    true,
    '{
        "modelConfiguration": {
            "actor": ["actor_id", "first_name", "last_name", "last_update"],
            "film_actor": ["actor_id", "film_id", "last_update"],
            "film": ["film_id", "title", "release_year", "rating"]
        },
        "joins": [
            {
                "from": "actor",
                "to": "film_actor",
                "type": "INNER JOIN",
                "on": { "from": "actor_id", "to": "actor_id" }
            },
            {
                "from": "film_actor",
                "to": "film",
                "type": "INNER JOIN",
                "on": { "from": "film_id", "to": "film_id" }
            }
        ],
        "tablePositions": {
            "actor": { "top": 200, "left": 100 },
            "film_actor": { "top": 200, "left": 400 },
            "film": { "top": 200, "left": 700 }
        }
    }'::jsonb
);

-- 9. DB Configuration: Customer Geography
INSERT INTO public.configurations (name, description, type, is_public, config)
VALUES (
    'Customer Geography',
    'Map customers to their cities and countries.',
    'db_config',
    true,
    '{
        "modelConfiguration": {
            "customer": ["customer_id", "first_name", "last_name", "address_id", "email"],
            "address": ["address_id", "address", "city_id", "postal_code"],
            "city": ["city_id", "city", "country_id"],
            "country": ["country_id", "country"]
        },
        "joins": [
            {
                "from": "customer",
                "to": "address",
                "type": "INNER JOIN",
                "on": { "from": "address_id", "to": "address_id" }
            },
            {
                "from": "address",
                "to": "city",
                "type": "INNER JOIN",
                "on": { "from": "city_id", "to": "city_id" }
            },
            {
                "from": "city",
                "to": "country",
                "type": "INNER JOIN",
                "on": { "from": "country_id", "to": "country_id" }
            }
        ],
        "tablePositions": {
            "customer": { "top": 100, "left": 100 },
            "address": { "top": 100, "left": 400 },
            "city": { "top": 100, "left": 700 },
            "country": { "top": 100, "left": 1000 }
        }
    }'::jsonb
);

-- 10. Analysis Configuration: Film Costs by Rating
INSERT INTO public.configurations (name, description, type, is_public, config)
VALUES (
    'Film Costs by Rating',
    'Analyze replacement costs and rental rates across different ratings.',
    'analysis_config',
    true,
    '{
        "selectedFields": ["film.rating", "film.replacement_cost", "film.rental_rate"],
        "pivotConfig": {
            "rows": ["rating"],
            "columns": [],
            "values": [
                {
                    "field": "replacement_cost",
                    "aggregation": "AVG",
                    "displayName": "Avg Replacement Cost"
                },
                {
                    "field": "rental_rate",
                    "aggregation": "AVG",
                    "displayName": "Avg Rental Rate"
                }
            ]
        },
        "filters": []
    }'::jsonb
);

-- 11. Analysis Configuration: Payments by Customer
INSERT INTO public.configurations (name, description, type, is_public, config)
VALUES (
    'Top Spending Customers',
    'Identify customers with the highest total payments.',
    'analysis_config',
    true,
    '{
        "selectedFields": ["customer.last_name", "payment.amount"],
        "pivotConfig": {
            "rows": ["last_name"],
            "columns": [],
            "values": [
                {
                    "field": "amount",
                    "aggregation": "SUM",
                    "displayName": "Total Spend"
                }
            ]
        },
        "filters": []
    }'::jsonb
);
