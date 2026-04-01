from app import create_app
from app.jobs.email_collector import collect_emails

if __name__ == "__main__":
    app = create_app()
    collect_emails(app)
