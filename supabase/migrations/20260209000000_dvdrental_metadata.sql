-- =============================================================================
-- DVDRental Database Metadata Migration
-- =============================================================================
-- This migration adds comprehensive metadata (descriptions, semantic types,
-- PK/FK info) to all tables and columns in the dvdrental schema.
--
-- Execute this in your Supabase SQL Editor after restoring the dvdrental database.
-- =============================================================================

-- =============================================================================
-- TABLE DESCRIPTIONS
-- =============================================================================

COMMENT ON TABLE public.actor IS 'Catalog of film actors. Contains actor names and serves as a lookup for film casting information.';

COMMENT ON TABLE public.address IS 'Physical address records for customers, staff, and store locations. Links to city for geographic hierarchy.';

COMMENT ON TABLE public.category IS 'Film genre classifications (Action, Comedy, Drama, etc.). Used to categorize films for browsing and recommendation.';

COMMENT ON TABLE public.city IS 'Geographic city records linked to countries. Part of the address hierarchy for location-based queries.';

COMMENT ON TABLE public.country IS 'Master list of countries for geographic classification of addresses and regional analysis.';

COMMENT ON TABLE public.customer IS 'Customer profiles including contact information and account status. Central entity for rental transactions.';

COMMENT ON TABLE public.film IS 'Core film catalog with detailed movie information including titles, ratings, rental terms, and content metadata.';

COMMENT ON TABLE public.film_actor IS 'Junction table mapping films to actors. Enables many-to-many relationship for cast information.';

COMMENT ON TABLE public.film_category IS 'Junction table mapping films to categories. Allows films to belong to multiple genres.';

COMMENT ON TABLE public.inventory IS 'Physical inventory tracking for films at each store location. Each record represents one rentable copy.';

COMMENT ON TABLE public.language IS 'Language reference table for film audio tracks and subtitles. Used for localization filtering.';

COMMENT ON TABLE public.payment IS 'Financial transaction records for rental payments. Links customers, staff, and rentals for revenue tracking.';

COMMENT ON TABLE public.rental IS 'Rental transaction records tracking check-out and return dates. Core table for operational reporting.';

COMMENT ON TABLE public.staff IS 'Employee records for store personnel. Includes login credentials and store assignment.';

COMMENT ON TABLE public.store IS 'Physical store locations with manager assignments. Hub for inventory and staff allocation.';


-- =============================================================================
-- COLUMN DESCRIPTIONS - ACTOR TABLE
-- =============================================================================
-- Semantic Types: identifier, dimension, measure, date, text, boolean

COMMENT ON COLUMN public.actor.actor_id IS 'Primary key. Unique identifier for each actor. [semantic:identifier]';
COMMENT ON COLUMN public.actor.first_name IS 'Actor''s first/given name. Used for display and search. [semantic:dimension]';
COMMENT ON COLUMN public.actor.last_name IS 'Actor''s family/surname. Used for sorting and search. [semantic:dimension]';
COMMENT ON COLUMN public.actor.last_update IS 'Timestamp of last record modification. For audit trail. [semantic:date]';


-- =============================================================================
-- COLUMN DESCRIPTIONS - ADDRESS TABLE
-- =============================================================================

COMMENT ON COLUMN public.address.address_id IS 'Primary key. Unique identifier for each address record. [semantic:identifier]';
COMMENT ON COLUMN public.address.address IS 'Primary street address line (street number and name). [semantic:text]';
COMMENT ON COLUMN public.address.address2 IS 'Secondary address line (apartment, suite, unit). Optional. [semantic:text]';
COMMENT ON COLUMN public.address.district IS 'State, province, or district name for regional grouping. [semantic:dimension]';
COMMENT ON COLUMN public.address.city_id IS 'Foreign key to city table. Links address to geographic location. [semantic:identifier] [fk:city.city_id]';
COMMENT ON COLUMN public.address.postal_code IS 'ZIP or postal code for mail delivery and regional analysis. [semantic:dimension]';
COMMENT ON COLUMN public.address.phone IS 'Contact phone number associated with this address. [semantic:text]';
COMMENT ON COLUMN public.address.last_update IS 'Timestamp of last record modification. [semantic:date]';


-- =============================================================================
-- COLUMN DESCRIPTIONS - CATEGORY TABLE
-- =============================================================================

COMMENT ON COLUMN public.category.category_id IS 'Primary key. Unique identifier for each film category/genre. [semantic:identifier]';
COMMENT ON COLUMN public.category.name IS 'Genre name (Action, Comedy, Drama, etc.). Primary dimension for film classification. [semantic:dimension]';
COMMENT ON COLUMN public.category.last_update IS 'Timestamp of last record modification. [semantic:date]';


-- =============================================================================
-- COLUMN DESCRIPTIONS - CITY TABLE
-- =============================================================================

COMMENT ON COLUMN public.city.city_id IS 'Primary key. Unique identifier for each city. [semantic:identifier]';
COMMENT ON COLUMN public.city.city IS 'City name for geographic classification and display. [semantic:dimension]';
COMMENT ON COLUMN public.city.country_id IS 'Foreign key to country table. Links city to its parent country. [semantic:identifier] [fk:country.country_id]';
COMMENT ON COLUMN public.city.last_update IS 'Timestamp of last record modification. [semantic:date]';


-- =============================================================================
-- COLUMN DESCRIPTIONS - COUNTRY TABLE
-- =============================================================================

COMMENT ON COLUMN public.country.country_id IS 'Primary key. Unique identifier for each country. [semantic:identifier]';
COMMENT ON COLUMN public.country.country IS 'Country name for top-level geographic classification. [semantic:dimension]';
COMMENT ON COLUMN public.country.last_update IS 'Timestamp of last record modification. [semantic:date]';


-- =============================================================================
-- COLUMN DESCRIPTIONS - CUSTOMER TABLE
-- =============================================================================

COMMENT ON COLUMN public.customer.customer_id IS 'Primary key. Unique identifier for each customer account. [semantic:identifier]';
COMMENT ON COLUMN public.customer.store_id IS 'Foreign key to store table. The home store where customer is registered. [semantic:identifier] [fk:store.store_id]';
COMMENT ON COLUMN public.customer.first_name IS 'Customer''s first/given name for personalization and search. [semantic:dimension]';
COMMENT ON COLUMN public.customer.last_name IS 'Customer''s family/surname for sorting and formal communication. [semantic:dimension]';
COMMENT ON COLUMN public.customer.email IS 'Customer email address for electronic communication. [semantic:text]';
COMMENT ON COLUMN public.customer.address_id IS 'Foreign key to address table. Customer''s physical mailing address. [semantic:identifier] [fk:address.address_id]';
COMMENT ON COLUMN public.customer.activebool IS 'Boolean flag indicating if customer account is currently active. [semantic:boolean]';
COMMENT ON COLUMN public.customer.create_date IS 'Date when customer account was created. For customer lifetime analysis. [semantic:date]';
COMMENT ON COLUMN public.customer.last_update IS 'Timestamp of last record modification. [semantic:date]';
COMMENT ON COLUMN public.customer.active IS 'Integer activity status (1=active, 0=inactive). Legacy field, prefer activebool. [semantic:boolean]';


-- =============================================================================
-- COLUMN DESCRIPTIONS - FILM TABLE
-- =============================================================================

COMMENT ON COLUMN public.film.film_id IS 'Primary key. Unique identifier for each film in the catalog. [semantic:identifier]';
COMMENT ON COLUMN public.film.title IS 'Official film title for display and search. Primary text identifier. [semantic:dimension]';
COMMENT ON COLUMN public.film.description IS 'Synopsis or plot summary of the film. Used for content discovery. [semantic:text]';
COMMENT ON COLUMN public.film.release_year IS 'Year the film was originally released. For temporal filtering. [semantic:dimension]';
COMMENT ON COLUMN public.film.language_id IS 'Foreign key to language table. Primary audio language of the film. [semantic:identifier] [fk:language.language_id]';
COMMENT ON COLUMN public.film.rental_duration IS 'Standard rental period in days. Defines checkout terms. [semantic:measure]';
COMMENT ON COLUMN public.film.rental_rate IS 'Daily rental price in currency units. Core pricing metric. [semantic:measure]';
COMMENT ON COLUMN public.film.length IS 'Film runtime in minutes. Used for scheduling and content selection. [semantic:measure]';
COMMENT ON COLUMN public.film.replacement_cost IS 'Charge for lost or damaged film. Asset value metric. [semantic:measure]';
COMMENT ON COLUMN public.film.rating IS 'MPAA content rating (G, PG, PG-13, R, NC-17). Age-based restriction. [semantic:dimension]';
COMMENT ON COLUMN public.film.last_update IS 'Timestamp of last record modification. [semantic:date]';
COMMENT ON COLUMN public.film.special_features IS 'Array of bonus content types (Trailers, Commentaries, Deleted Scenes). [semantic:dimension]';
COMMENT ON COLUMN public.film.fulltext IS 'PostgreSQL tsvector for full-text search optimization. Internal use. [semantic:text]';


-- =============================================================================
-- COLUMN DESCRIPTIONS - FILM_ACTOR TABLE
-- =============================================================================

COMMENT ON COLUMN public.film_actor.actor_id IS 'Foreign key to actor table. Part of composite primary key. [semantic:identifier] [fk:actor.actor_id]';
COMMENT ON COLUMN public.film_actor.film_id IS 'Foreign key to film table. Part of composite primary key. [semantic:identifier] [fk:film.film_id]';
COMMENT ON COLUMN public.film_actor.last_update IS 'Timestamp of last record modification. [semantic:date]';


-- =============================================================================
-- COLUMN DESCRIPTIONS - FILM_CATEGORY TABLE
-- =============================================================================

COMMENT ON COLUMN public.film_category.film_id IS 'Foreign key to film table. Part of composite primary key. [semantic:identifier] [fk:film.film_id]';
COMMENT ON COLUMN public.film_category.category_id IS 'Foreign key to category table. Part of composite primary key. [semantic:identifier] [fk:category.category_id]';
COMMENT ON COLUMN public.film_category.last_update IS 'Timestamp of last record modification. [semantic:date]';


-- =============================================================================
-- COLUMN DESCRIPTIONS - INVENTORY TABLE
-- =============================================================================

COMMENT ON COLUMN public.inventory.inventory_id IS 'Primary key. Unique identifier for each physical copy in inventory. [semantic:identifier]';
COMMENT ON COLUMN public.inventory.film_id IS 'Foreign key to film table. Which film this inventory item represents. [semantic:identifier] [fk:film.film_id]';
COMMENT ON COLUMN public.inventory.store_id IS 'Foreign key to store table. Which store holds this inventory item. [semantic:identifier] [fk:store.store_id]';
COMMENT ON COLUMN public.inventory.last_update IS 'Timestamp of last record modification. [semantic:date]';


-- =============================================================================
-- COLUMN DESCRIPTIONS - LANGUAGE TABLE
-- =============================================================================

COMMENT ON COLUMN public.language.language_id IS 'Primary key. Unique identifier for each language option. [semantic:identifier]';
COMMENT ON COLUMN public.language.name IS 'Language name (English, Italian, Japanese, etc.). For localization filtering. [semantic:dimension]';
COMMENT ON COLUMN public.language.last_update IS 'Timestamp of last record modification. [semantic:date]';


-- =============================================================================
-- COLUMN DESCRIPTIONS - PAYMENT TABLE
-- =============================================================================

COMMENT ON COLUMN public.payment.payment_id IS 'Primary key. Unique identifier for each payment transaction. [semantic:identifier]';
COMMENT ON COLUMN public.payment.customer_id IS 'Foreign key to customer table. Who made this payment. [semantic:identifier] [fk:customer.customer_id]';
COMMENT ON COLUMN public.payment.staff_id IS 'Foreign key to staff table. Who processed this payment. [semantic:identifier] [fk:staff.staff_id]';
COMMENT ON COLUMN public.payment.rental_id IS 'Foreign key to rental table. Which rental this payment is for. [semantic:identifier] [fk:rental.rental_id]';
COMMENT ON COLUMN public.payment.amount IS 'Payment amount in currency units. Core revenue metric. [semantic:measure]';
COMMENT ON COLUMN public.payment.payment_date IS 'Timestamp when payment was processed. For financial reporting. [semantic:date]';


-- =============================================================================
-- COLUMN DESCRIPTIONS - RENTAL TABLE
-- =============================================================================

COMMENT ON COLUMN public.rental.rental_id IS 'Primary key. Unique identifier for each rental transaction. [semantic:identifier]';
COMMENT ON COLUMN public.rental.rental_date IS 'Timestamp when film was checked out. Start of rental period. [semantic:date]';
COMMENT ON COLUMN public.rental.inventory_id IS 'Foreign key to inventory table. Which specific copy was rented. [semantic:identifier] [fk:inventory.inventory_id]';
COMMENT ON COLUMN public.rental.customer_id IS 'Foreign key to customer table. Who rented the film. [semantic:identifier] [fk:customer.customer_id]';
COMMENT ON COLUMN public.rental.return_date IS 'Timestamp when film was returned. NULL if still checked out. [semantic:date]';
COMMENT ON COLUMN public.rental.staff_id IS 'Foreign key to staff table. Who processed the rental checkout. [semantic:identifier] [fk:staff.staff_id]';
COMMENT ON COLUMN public.rental.last_update IS 'Timestamp of last record modification. [semantic:date]';


-- =============================================================================
-- COLUMN DESCRIPTIONS - STAFF TABLE
-- =============================================================================

COMMENT ON COLUMN public.staff.staff_id IS 'Primary key. Unique identifier for each staff member. [semantic:identifier]';
COMMENT ON COLUMN public.staff.first_name IS 'Employee''s first/given name. For display and HR. [semantic:dimension]';
COMMENT ON COLUMN public.staff.last_name IS 'Employee''s family/surname. For formal records and sorting. [semantic:dimension]';
COMMENT ON COLUMN public.staff.address_id IS 'Foreign key to address table. Employee''s home address. [semantic:identifier] [fk:address.address_id]';
COMMENT ON COLUMN public.staff.email IS 'Employee email address for internal communication. [semantic:text]';
COMMENT ON COLUMN public.staff.store_id IS 'Foreign key to store table. Primary store assignment. [semantic:identifier] [fk:store.store_id]';
COMMENT ON COLUMN public.staff.active IS 'Boolean flag indicating if employee is currently active. [semantic:boolean]';
COMMENT ON COLUMN public.staff.username IS 'Login username for system access. Must be unique. [semantic:dimension]';
COMMENT ON COLUMN public.staff.password IS 'Hashed password for authentication. Never display or log. [semantic:text]';
COMMENT ON COLUMN public.staff.last_update IS 'Timestamp of last record modification. [semantic:date]';
COMMENT ON COLUMN public.staff.picture IS 'Binary employee photo. For identification purposes. [semantic:text]';


-- =============================================================================
-- COLUMN DESCRIPTIONS - STORE TABLE
-- =============================================================================

COMMENT ON COLUMN public.store.store_id IS 'Primary key. Unique identifier for each store location. [semantic:identifier]';
COMMENT ON COLUMN public.store.manager_staff_id IS 'Foreign key to staff table. Current store manager. [semantic:identifier] [fk:staff.staff_id]';
COMMENT ON COLUMN public.store.address_id IS 'Foreign key to address table. Physical store location. [semantic:identifier] [fk:address.address_id]';
COMMENT ON COLUMN public.store.last_update IS 'Timestamp of last record modification. [semantic:date]';


-- =============================================================================
-- VERIFY METADATA WAS APPLIED
-- =============================================================================
-- Run this query to verify comments were set:

-- SELECT
--     c.table_name,
--     c.column_name,
--     pgd.description
-- FROM information_schema.columns c
-- LEFT JOIN pg_catalog.pg_statio_all_tables st
--     ON c.table_schema = st.schemaname AND c.table_name = st.relname
-- LEFT JOIN pg_catalog.pg_description pgd
--     ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position
-- WHERE c.table_schema = 'public'
-- ORDER BY c.table_name, c.ordinal_position;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
