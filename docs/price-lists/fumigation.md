# Fumigation price list

Source: BOOM published pricelist card ("FUMIGATION Pricelist", Boom cleaning service).
Received 2026-08-19. Amounts in NGN.

## By bedroom

| Bedrooms | Price   |
|---------:|--------:|
| 1        |  50,000 |
| 2        |  70,000 |
| 3        |  90,000 |
| 4        | 100,000 |
| 5        | 120,000 |
| 6        | 140,000 |
| 7        | 150,000 |
| 8        | 170,000 |

Steps are +20,000, +20,000, +10,000, +20,000, +20,000, +10,000, +20,000 — no formula
reproduces this, so it is stored as a published table exactly like the deep-cleaning tiers.

## Boys' quarters

| BQ rooms | Price  |
|---------:|-------:|
| 1        | 30,000 |
| 2        | 50,000 |

Not per-unit: a second BQ room adds 20,000, not another 30,000. Cannot be expressed with
the existing per-unit `service_space_prices`, so it needs its own quantity-keyed tier.

## Effect on the current site

`fumigation` is presently `requires_review = true` with `base_price = 0`, so it advertises
itself as "Quoted for you". With this table it becomes an instant-quote service starting
from NGN 50,000.
