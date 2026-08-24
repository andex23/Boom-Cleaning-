-- Keep extension-owned objects out of the exposed public API schema. Existing GiST
-- exclusion constraints reference their operator classes by OID, so relocating this
-- extension does not rebuild or weaken booking-overlap protection.
alter extension btree_gist set schema extensions;
