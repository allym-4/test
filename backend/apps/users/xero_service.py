import requests
from urllib.parse import urlencode
from datetime import timedelta


XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize'
XERO_TOKEN_URL = 'https://identity.xero.com/connect/token'
XERO_CONNECTIONS_URL = 'https://api.xero.com/connections'
XERO_API_BASE = 'https://api.xero.com/api.xro/2.0'
XERO_SCOPE = 'openid profile email accounting.transactions accounting.contacts offline_access'


def get_auth_url(client_id, redirect_uri, state=''):
    params = {
        'response_type': 'code',
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'scope': XERO_SCOPE,
        'state': state,
    }
    return f'{XERO_AUTH_URL}?{urlencode(params)}'


def exchange_code(client_id, client_secret, code, redirect_uri):
    """Exchange an authorization code for tokens. Returns token dict or raises."""
    r = requests.post(
        XERO_TOKEN_URL,
        data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri,
        },
        auth=(client_id, client_secret),
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


def refresh_access_token(client_id, client_secret, refresh_token_val):
    """Returns new token dict or raises."""
    r = requests.post(
        XERO_TOKEN_URL,
        data={
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token_val,
        },
        auth=(client_id, client_secret),
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


def get_tenants(access_token):
    """Returns list of tenant dicts [{tenantId, tenantName, ...}]."""
    r = requests.get(
        XERO_CONNECTIONS_URL,
        headers={'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


def _get_valid_token(settings_obj):
    """Returns a valid access token, refreshing if needed. Saves updated tokens to settings."""
    from django.utils import timezone as tz
    now = tz.now()
    if settings_obj.xero_token_expires_at and settings_obj.xero_token_expires_at > now + timedelta(minutes=5):
        return settings_obj.xero_access_token
    token_data = refresh_access_token(
        settings_obj.xero_client_id,
        settings_obj.xero_client_secret,
        settings_obj.xero_refresh_token,
    )
    settings_obj.xero_access_token = token_data['access_token']
    settings_obj.xero_refresh_token = token_data.get('refresh_token', settings_obj.xero_refresh_token)
    settings_obj.xero_token_expires_at = now + timedelta(seconds=token_data.get('expires_in', 1800))
    settings_obj.save()
    return settings_obj.xero_access_token


def sync_payment(settings_obj, payment):
    """
    Create a Xero invoice + mark paid for a local Payment record.
    Uses DPS-{payment.id} as the invoice number to prevent duplicates.
    Returns xero_invoice_id or raises.
    """
    token = _get_valid_token(settings_obj)
    tenant_id = settings_obj.xero_tenant_id
    headers = {
        'Authorization': f'Bearer {token}',
        'Xero-tenant-id': tenant_id,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
    invoice_ref = f'DPS-{payment.id}'

    # Check if invoice already exists to avoid duplicates
    check = requests.get(
        f'{XERO_API_BASE}/Invoices',
        params={'InvoiceNumbers': invoice_ref},
        headers=headers,
        timeout=10,
    )
    check.raise_for_status()
    existing = check.json().get('Invoices', [])
    if existing:
        return existing[0]['InvoiceID']

    student = payment.student
    invoice_payload = {
        'Type': 'ACCREC',
        'Contact': {'Name': student.display_name, 'EmailAddress': student.email or ''},
        'InvoiceNumber': invoice_ref,
        'Date': payment.created_at.date().isoformat(),
        'DueDate': payment.created_at.date().isoformat(),
        'Status': 'AUTHORISED',
        'LineItems': [{
            'Description': payment.description or 'Studio payment',
            'Quantity': 1.0,
            'UnitAmount': float(payment.amount),
            'TaxType': 'OUTPUT2',
        }],
    }

    r = requests.post(
        f'{XERO_API_BASE}/Invoices',
        json={'Invoices': [invoice_payload]},
        headers=headers,
        timeout=15,
    )
    r.raise_for_status()
    invoice = r.json()['Invoices'][0]
    invoice_id = invoice['InvoiceID']

    # Record payment against invoice (using default bank account code)
    r2 = requests.post(
        f'{XERO_API_BASE}/Payments',
        json={'Payments': [{
            'Invoice': {'InvoiceID': invoice_id},
            'Account': {'Code': '090'},
            'Date': payment.created_at.date().isoformat(),
            'Amount': float(payment.amount),
        }]},
        headers=headers,
        timeout=15,
    )
    r2.raise_for_status()

    return invoice_id
