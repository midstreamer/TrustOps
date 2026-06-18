"""Update demo user emails from .local to .demo if needed."""

from app.db.session import SessionLocal
from app.models import User

MAPPING = {
    "admin@trustops.local": "admin@trustops.demo",
    "manager@trustops.local": "manager@trustops.demo",
    "analyst1@trustops.local": "analyst1@trustops.demo",
    "analyst2@trustops.local": "analyst2@trustops.demo",
    "client@apex.local": "client@apex.demo",
}

if __name__ == "__main__":
    db = SessionLocal()
    try:
        updated = 0
        for old, new in MAPPING.items():
            user = db.query(User).filter(User.email == old).first()
            if user:
                user.email = new
                updated += 1
        db.commit()
        print(f"Updated {updated} user emails.")
    finally:
        db.close()
