import os
import threading
import datetime
import subprocess

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_wsgi_application()


def _daily_task_scheduler():
    """Fire run_daily_tasks once per day at 2am Sydney time."""
    import zoneinfo
    sydney = zoneinfo.ZoneInfo('Australia/Sydney')
    last_run_date = None

    while True:
        try:
            now = datetime.datetime.now(sydney)
            today = now.date()
            # Run at 02:00 Sydney, but only once per calendar day
            if now.hour == 2 and last_run_date != today:
                subprocess.run(
                    ['python', 'manage.py', 'run_daily_tasks'],
                    cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                )
                last_run_date = today
        except Exception:
            pass
        threading.Event().wait(60)  # check every minute


_scheduler_thread = threading.Thread(target=_daily_task_scheduler, daemon=True, name='daily-scheduler')
_scheduler_thread.start()
