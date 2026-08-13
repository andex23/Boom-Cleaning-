# Database foundation

The initial schema covers staff profiles, customers and cross-channel identities, services, configurable service questions, pricing-rule configuration, leads and audit logs.

`customer_identities` is unique by channel and external identifier so an Instagram, WhatsApp or website touchpoint can be attached to one customer. Services are database-managed and ordered with `sort_order`; no service catalogue is hardcoded in frontend code.

All business tables have RLS enabled. Staff may read operational records while administrator-only policies manage the service catalogue and audit log visibility. Public booking and quote policies are intentionally deferred until the corresponding secure server actions exist.
