import os
import threading
import datetime
import subprocess

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_wsgi_application()

_LOCK_FILE = '/tmp/duality_daily_tasks.date'


def _daily_task_scheduler():
    """Fire run_daily_tasks once per day at 2am Sydney time.

    Uses a date-stamp file in /tmp so that only one gunicorn worker process
    actually runs the tasks even when multiple workers are active.
    """
    try:
        import zoneinfo
        sydney = zoneinfo.ZoneInfo('Australia/Sydney')
    except Exception:
        return  # zoneinfo unavailable — skip scheduler

    manage_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    while True:
        try:
            now = datetime.datetime.now(sydney)
            if now.hour == 2:
                today_str = now.date().isoformat()
                # Atomic claim: only the first worker to write wins
                try:
                    with open(_LOCK_FILE, 'x') as f:
                        f.write(today_str)
                    # We wrote the file — we own today's run
                    subprocess.run(['python', 'manage.py', 'run_daily_tasks'], cwd=manage_dir)
                except FileExistsError:
                    # Another worker already claimed today — check if it's stale
                    try:
                        with open(_LOCK_FILE) as f:
                            claimed = f.read().strip()
                        if claimed != today_str:
                            # Stale from a previous day; remove and let next loop claim it
                            os.remove(_LOCK_FILE)
                    except OSError:
                        pass
        except Exception:
            pass
        threading.Event().wait(60)  # check every minute


_scheduler_thread = threading.Thread(target=_daily_task_scheduler, daemon=True, name='daily-scheduler')
_scheduler_thread.start()
