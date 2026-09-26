# Manus Catalog Intake

The PM Cosmetics Hub can accept a Manus catalog containing more than 2,000 products through `/api/manus/import` or a configured HTTPS JSON feed.

Expected shapes:

```json
[
  { "sku": "123", "name": "Product", "barcode": "..." }
]
```

or:

```json
{ "products": [ { "sku": "123", "name": "Product" } ] }
```

Required identity for a record: `sku` and product `name`.

The adapter reports invalid records and duplicate SKUs. It never marks products publishable by itself.

To connect a live Manus feed, configure `MANUS_PRODUCTS_URL` and, when required, `MANUS_API_TOKEN` in the deployment secret store. The current project has no native Manus connector available in the connected toolset, so the feed URL/token are intentionally treated as external configuration rather than guessed.

For a 2,000+ item catalog, use the configured feed and dry-run first. The adapter is capped at 10,000 records per run by default.
