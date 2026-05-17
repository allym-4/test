import hashlib
import hmac
import json
import os
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator


@method_decorator(csrf_exempt, name='dispatch')
class InstagramWebhookView(View):
    """Handles Meta webhook verification and incoming Instagram DM events."""

    def get(self, request):
        # Meta webhook verification challenge
        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')
        verify_token = os.environ.get('INSTAGRAM_WEBHOOK_VERIFY_TOKEN', 'duality_pole_verify')
        if mode == 'subscribe' and token == verify_token:
            return HttpResponse(challenge, content_type='text/plain')
        return HttpResponse('Forbidden', status=403)

    def post(self, request):
        # Verify payload signature
        sig = request.headers.get('X-Hub-Signature-256', '')
        app_secret = os.environ.get('META_APP_SECRET', '')
        if app_secret:
            expected = 'sha256=' + hmac.new(
                app_secret.encode(), request.body, hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(sig, expected):
                return HttpResponse('Invalid signature', status=403)

        try:
            data = json.loads(request.body)
        except Exception:
            return HttpResponse('Bad request', status=400)

        # Process incoming messages
        for entry in data.get('entry', []):
            for messaging in entry.get('messaging', []):
                sender_id = messaging.get('sender', {}).get('id')
                message = messaging.get('message', {})
                text = message.get('text', '')
                if sender_id and text:
                    self._handle_message(sender_id, text)

        return JsonResponse({'status': 'ok'})

    def _handle_message(self, instagram_sender_id, text):
        # NOTE: The Conversation model in apps.helpdesk needs two additional fields
        # for this to work:
        #   instagram_sender_id = models.CharField(max_length=100, blank=True)
        #   source = models.CharField(max_length=20, default='direct',
        #                             choices=[('direct','Direct'),('instagram','Instagram')])
        # Do NOT modify the helpdesk app here — add those fields separately.
        from apps.helpdesk.models import Conversation, DirectMessage
        conv, _ = Conversation.objects.get_or_create(
            instagram_sender_id=instagram_sender_id,
            defaults={'source': 'instagram'}
        )
        DirectMessage.objects.create(
            conversation=conv,
            sender=None,
            body=text,
        )


class InstagramAuthView(View):
    """Redirects admin to Meta OAuth for Instagram connection."""

    def get(self, request):
        from django.shortcuts import redirect
        meta_app_id = os.environ.get('META_APP_ID', '')
        redirect_uri = request.build_absolute_uri('/api/users/instagram/callback/')
        if not meta_app_id:
            return HttpResponse('META_APP_ID not configured', status=400)
        oauth_url = (
            f'https://www.facebook.com/v18.0/dialog/oauth'
            f'?client_id={meta_app_id}'
            f'&redirect_uri={redirect_uri}'
            f'&scope=instagram_basic,instagram_manage_messages,pages_messaging'
            f'&response_type=code'
        )
        return redirect(oauth_url)


@method_decorator(csrf_exempt, name='dispatch')
class InstagramCallbackView(View):
    """Receives OAuth code from Meta, exchanges for access token."""

    def get(self, request):
        from django.shortcuts import redirect
        import urllib.request
        import urllib.parse

        code = request.GET.get('code')
        if not code:
            return HttpResponse('No code provided', status=400)

        meta_app_id = os.environ.get('META_APP_ID', '')
        meta_app_secret = os.environ.get('META_APP_SECRET', '')
        redirect_uri = request.build_absolute_uri('/api/users/instagram/callback/')

        # Exchange code for token
        params = urllib.parse.urlencode({
            'client_id': meta_app_id,
            'client_secret': meta_app_secret,
            'redirect_uri': redirect_uri,
            'code': code,
        }).encode()

        try:
            with urllib.request.urlopen('https://graph.facebook.com/v18.0/oauth/access_token', params) as resp:
                token_data = json.loads(resp.read())
            access_token = token_data.get('access_token', '')
            from apps.users.models import StudioSettings
            settings_obj = StudioSettings.get()
            settings_obj.instagram_access_token = access_token
            settings_obj.save()
        except Exception as e:
            return HttpResponse(f'OAuth error: {e}', status=500)

        # Redirect back to admin messages page
        return redirect('/admin/messages?instagram=connected')
