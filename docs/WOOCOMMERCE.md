# WooCommerce Integration

The PM Cosmetics Hub API exposes:

- `GET /api/woocommerce/status`
- `GET /api/woocommerce/check`
- `POST /api/woocommerce/sync`
- `POST /api/manus/woocommerce/sync`

The connector uses the WooCommerce REST API over HTTPS with a consumer key and consumer secret. It reads existing products, matches by SKU, and uses the product batch endpoint for create/update operations.

Dry-run is the default. Live writes require both:

- `WOOCOMMERCE_SYNC_ENABLED=true`
- `COMMERCIAL_PUBLISH_GATE=OPEN`

The commercial gate must only be opened after PM Cosmetics evidence is verified for the products being published.

Recommended batch size: 50–100 records. The connector removes duplicate SKUs before writing and refuses runs above 10,000 products.
