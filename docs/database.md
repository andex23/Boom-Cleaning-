# Database foundation

The initial schema covers staff profiles, customers and cross-channel identities, services, configurable service questions, pricing-rule configuration, leads and audit logs.

`customer_identities` is unique by channel and external identifier so an Instagram, WhatsApp or website touchpoint can be attached to one customer. Services are database-managed and ordered with `sort_order`; no service catalogue is hardcoded in frontend code.

All business tables have RLS enabled. Staff may read operational records while administrator-only policies manage the service catalogue and audit log visibility. Public booking and quote policies are intentionally deferred until the corresponding secure server actions exist.

## Space-based pricing

`property_types` carries a `base_multiplier` and a `minimum_charge` so a characteristic such
as "penthouse" scales the whole job and still clears a profitable floor on small work.
`space_types` is the countable vocabulary a customer uses to describe a property — bedrooms
and bathrooms alongside boys' quarters, gazebo, balcony, external staircase and pool area.
`service_space_prices` joins the two with a per-unit price and an `included_count` that lets
a base price absorb the first N units; the unique constraint on `(service_id, space_type_id)`
keeps one price per pairing.

A missing `service_space_prices` row is meaningful: it means the service has no agreed price
for that space, and `calculate_quote` routes the quote to manual review rather than charging
nothing.

`quote_items` stores the line items produced for a quote — base, each space line, the area
surcharge, the property multiplier adjustment and any minimum top-up. They are written in the
same transaction as the booking and never recalculated, so editing a price later cannot
rewrite a quote a customer already accepted.

All five tables have RLS enabled with staff read and administrator write, matching the rest of
the schema. `calculate_quote` is `security definer` and executable only by `service_role`.
