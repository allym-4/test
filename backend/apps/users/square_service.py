import requests
from django.conf import settings

SQUARE_BASE = 'https://connect.squareup.com/v2'


def _headers():
    return {
        'Authorization': f'Bearer {settings.SQUARE_ACCESS_TOKEN}',
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
    }


def list_catalog_items():
    """Fetch all active ITEM objects from Square catalog."""
    items = []
    cursor = None
    while True:
        params = {'types': 'ITEM', 'limit': 100}
        if cursor:
            params['cursor'] = cursor
        r = requests.get(f'{SQUARE_BASE}/catalog/list', params=params, headers=_headers(), timeout=15)
        r.raise_for_status()
        data = r.json()
        items.extend(data.get('objects', []))
        cursor = data.get('cursor')
        if not cursor:
            break
    return items


def sync_catalog_to_products():
    """
    Pull Square catalog items and upsert into local Product model.
    Returns (created, updated, skipped) counts.
    """
    from .models import Product

    items = list_catalog_items()
    created = updated = skipped = 0

    for obj in items:
        if obj.get('is_deleted') or obj.get('type') != 'ITEM':
            skipped += 1
            continue

        item_data = obj.get('item_data', {})
        name = item_data.get('name', '').strip()
        if not name:
            skipped += 1
            continue

        square_id = obj['id']
        description = item_data.get('description', '')

        # Get price from first variation
        variations = item_data.get('variations', [])
        price = None
        sku = ''
        stock = 0
        for var in variations:
            var_data = var.get('item_variation_data', {})
            sku = var_data.get('sku', '')
            price_money = var_data.get('price_money', {})
            if price_money:
                price = price_money.get('amount', 0) / 100  # cents → dollars
            break

        if price is None:
            price = 0

        # Category from category references
        category = ''
        categories = item_data.get('categories', [])
        if categories:
            category = categories[0].get('id', '')

        existing = Product.objects.filter(sku=square_id).first()
        if existing:
            existing.name = name
            existing.price = price
            existing.is_active = not obj.get('is_deleted', False)
            existing.save(update_fields=['name', 'price', 'is_active'])
            updated += 1
        else:
            Product.objects.create(
                name=name,
                sku=square_id,
                price=price,
                stock=stock,
                category=category[:50] if category else '',
                is_active=True,
            )
            created += 1

    return created, updated, skipped
