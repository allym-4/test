import requests
from apps.users.models import StudioSettings


KISI_BASE = 'https://api.kisi.io'


def _headers():
    settings = StudioSettings.get()
    return {
        'Authorization': f'KISI-LOGIN {settings.kisi_api_key}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }


def create_link(place_id, name, email, valid_from, valid_until):
    """Create a Kisi access link for a student. Returns the Kisi link object."""
    payload = {
        'lock_group_id': int(place_id),
        'name': name,
        'email': email,
        'starts_at': valid_from.isoformat(),
        'ends_at': valid_until.isoformat(),
    }
    r = requests.post(f'{KISI_BASE}/share_links', json=payload, headers=_headers(), timeout=10)
    r.raise_for_status()
    return r.json()


def revoke_link(kisi_link_id):
    """Delete a Kisi access link by ID."""
    r = requests.delete(f'{KISI_BASE}/share_links/{kisi_link_id}', headers=_headers(), timeout=10)
    r.raise_for_status()


def list_links(place_id=None):
    """List active Kisi share links, optionally filtered by place (lock group)."""
    params = {}
    if place_id:
        params['lock_group_id'] = place_id
    r = requests.get(f'{KISI_BASE}/share_links', params=params, headers=_headers(), timeout=10)
    r.raise_for_status()
    return r.json()


def list_lock_events(place_id=None, limit=50):
    """List recent unlock events from Kisi."""
    params = {'limit': limit}
    if place_id:
        params['lock_group_id'] = place_id
    r = requests.get(f'{KISI_BASE}/lock_events', params=params, headers=_headers(), timeout=10)
    r.raise_for_status()
    return r.json()
