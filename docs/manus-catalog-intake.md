# Manus Catalog Intake — PM Cosmetics Hub

## Source
- Manus workspace/store: https://pmcosmetics-jn8vylmg.manus.space/
- User-reported catalog size: **more than 2,000 products**.
- Verification status: **candidate source / not yet machine-verified from ChatGPT** because there is no direct Manus connector in the current environment.

## Import contract
A Manus export should be supplied as JSON, CSV, or XLSX. The intake process must preserve the original source values and create a stable source record for each row.

### Preferred identity fields
- Product Name
- Brand
- Size / Variant
- SKU
- GTIN / Barcode
- Category
- Country / Market
- Source URL or Manus record ID

### Evidence fields required before publication
- Product Image URL / asset
- PM Stock quantity or stock evidence
- Supplier / batch / expiry when applicable
- Cost EGP
- Retail Price EGP
- Verification Date
- Evidence Source

## Safety gates
1. Do not invent SKU, GTIN, stock, cost, image, or price.
2. Deduplicate by GTIN first; then SKU; then normalized Brand + Product Name + Size/Variant.
3. Conflicts remain Needs Review.
4. Manus import is **staging only**; it does not publish to Shopify, Noon, Amazon, or Jumia.
5. Only records that pass PM evidence validation can move to Publish-Ready.

## Target flow
Manus export → Intake/Staging → Normalize → Deduplicate → Identity QA → Airtable Candidate/Needs Review → Evidence Gate → Pilot → Verify → Channel Sync.
