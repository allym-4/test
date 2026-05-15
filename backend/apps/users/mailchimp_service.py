import hashlib
import requests


def _dc(api_key):
    return api_key.split('-')[-1] if api_key and '-' in api_key else 'us1'


def _auth(api_key):
    return requests.auth.HTTPBasicAuth('anystring', api_key)


def _base(api_key):
    return f'https://{_dc(api_key)}.api.mailchimp.com/3.0'


def check_status(api_key):
    """Returns (ok, info_dict). Pings Mailchimp to validate key and returns account info."""
    try:
        r = requests.get(f'{_base(api_key)}/', auth=_auth(api_key), timeout=10)
        if r.status_code == 200:
            d = r.json()
            return True, {'account_name': d.get('account_name', ''), 'email': d.get('email', '')}
        return False, {'error': r.json().get('detail', 'Invalid API key')}
    except Exception as e:
        return False, {'error': str(e)}


def get_list_info(api_key, list_id):
    """Returns (ok, info_dict)."""
    try:
        r = requests.get(f'{_base(api_key)}/lists/{list_id}', auth=_auth(api_key), timeout=10)
        if r.status_code == 200:
            d = r.json()
            return True, {
                'name': d.get('name', ''),
                'member_count': d.get('stats', {}).get('member_count', 0),
            }
        return False, {'error': r.json().get('detail', 'List not found')}
    except Exception as e:
        return False, {'error': str(e)}


def _subscriber_hash(email):
    return hashlib.md5(email.strip().lower().encode()).hexdigest()


def sync_members(api_key, list_id, students):
    """
    Upsert a list of student dicts [{email, first_name, last_name}] to a Mailchimp audience.
    Returns (added, updated, errors).
    """
    added = 0
    updated = 0
    errors = 0
    base = _base(api_key)
    auth = _auth(api_key)

    for s in students:
        email = (s.get('email') or '').strip().lower()
        if not email:
            continue
        h = _subscriber_hash(email)
        payload = {
            'email_address': email,
            'status_if_new': 'subscribed',
            'merge_fields': {
                'FNAME': s.get('first_name', '') or '',
                'LNAME': s.get('last_name', '') or '',
            },
        }
        try:
            r = requests.put(
                f'{base}/lists/{list_id}/members/{h}',
                json=payload,
                auth=auth,
                timeout=10,
            )
            if r.status_code == 201:
                added += 1
            elif r.status_code == 200:
                updated += 1
            else:
                errors += 1
        except Exception:
            errors += 1

    return added, updated, errors
