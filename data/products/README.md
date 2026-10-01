# Product source staging

This directory is reserved for the verified 4,363-product source. It is intentionally empty until the user provides the real source URL and the dataset passes count and provenance validation.

**verified PM Cosmetics product source** - This represents the official catalog sourced from authenticated PM Cosmetics distribution channels.

Do not add guessed SKU, name, price, stock, barcode, or image values.

## Requirements for Product Intake

Before any product can be added to this directory:

1. **Source Verification**
   - Provide the official source URL or data feed
   - Verify ownership and authenticity
   - Document the supply chain evidence

2. **Data Validation**
   - All SKUs must match pattern: `PM-[A-Z0-9]{6,12}`
   - Required fields: name, brand, category, status, markets, pricing
   - Pricing must include at least Egypt (EGP)
   - All 11 markets must be defined in config/markets.json

3. **Staging Evidence**
   - Products in this directory are "staged"
   - Staging evidence alone does not open the commercial publication gate
   - Additional validation passes required before GATE OPEN

4. **Image Requirements**
   - Product images must be in data/images/real/
   - Images must be verified PM-owned real product images
   - No placeholders or mock images allowed
   - Image count must match product count validation

## Current Status

- **Total Expected Products:** 4,363
- **Current Products:** 0 (Awaiting verified source)
- **Gate Status:** CLOSED
- **Publication:** Locked pending evidence verification

See ../images/real/README.md for image requirements.

## Product Data Schema

All products must conform to `config/catalog.schema.json`:

```json
{
  "sku": "PM-ABC12345",           // Required: PM-[A-Z0-9]{6,12}
  "name": "Product Name",          // Required: 3-255 chars
  "nameAr": "اسم المنتج",         // Optional: Arabic name
  "brand": "Brand Name",           // Required: 2-120 chars
  "category": "Skincare",          // Required: enum from schema
  "description": "...",            // Optional: max 1000 chars
  "status": "active",              // Required: draft/active/inactive/archived/discontinued
  "markets": ["EG", "SA", "AE"],   // Required: array of 11 country codes
  "pricing": {                     // Required: at minimum EGP for Egypt
    "EG": {
      "currency": "EGP",           // Required: must match market
      "retail": 100.00,            // Required: > 0
      "wholesale": 80.00,          // Required: > 0
      "cost": 60.00                // Optional: cost price
    },
    "SA": { ... },                 // Additional markets optional
    "AE": { ... }
  },
  "metadata": {                    // Optional but recommended
    "barcode": "123456789012",
    "weight": 250,
    "expiryDate": "2026-12-31",
    "certifications": ["ISO-9001"]
  },
  "media": {                       // Optional: image URLs
    "images": [
      "https://cdn.pmcosmetics.hub/images/PM-ABC12345-front.jpg",
      "https://cdn.pmcosmetics.hub/images/PM-ABC12345-back.jpg"
    ]
  }
}
```

## Upload Methods

### Method 1: CSV Import
```csv
sku,name,nameAr,brand,category,status,markets,pricing.EG.retail,pricing.EG.wholesale
PM-ABC12345,Product A,منتج أ,Brand A,Skincare,active,EG;SA;AE,100,80
PM-DEF67890,Product B,منتج ب,Brand B,Makeup,active,EG;SA,120,95
```

### Method 2: JSON Array
```json
[
  {
    "sku": "PM-ABC12345",
    "name": "Product A",
    "brand": "Brand A",
    "category": "Skincare",
    "status": "active",
    "markets": ["EG", "SA", "AE"],
    "pricing": { "EG": { "currency": "EGP", "retail": 100, "wholesale": 80 } }
  }
]
```

### Method 3: API Direct
```bash
curl -X POST https://api.pmcosmetics.hub/api/intake/products/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @products.json
```

## Validation Checklist

Before submitting products:

- [ ] SKU format correct (PM-XXXXXX)
- [ ] All required fields populated
- [ ] No duplicate SKUs
- [ ] Pricing for at least Egypt (EGP)
- [ ] Category matches enum
- [ ] Status is valid
- [ ] Markets are valid country codes
- [ ] No placeholder or mock data
- [ ] Images match verified real product images
- [ ] Barcode verified (if applicable)
- [ ] Cost/supply chain documented
- [ ] All 4,363 products included

## Commercial Publication Gate

The gate transition flow:

```
CLOSED (Current) 
  ↓ Products uploaded and staged
CONTROLLED_PILOT (Approval required)
  ↓ Evidence verified + CI passes
GATE_OPEN (Commercial)
  ↓ Products published to channels
COMMERCIAL (Live across all channels)
```

**Gate remains CLOSED** until:
1. All 4,363 products staged with evidence
2. All 72 images verified and integrated
3. Catalog validation passes
4. Inventory validation passes
5. CI/CD all green
6. Manual approval from PM Cosmetics leadership
