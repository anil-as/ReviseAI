import sys
import os

# Ensure we're in the right directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
import models

print("Starting database reset...")

try:
    # Drop all tables
    models.Base.metadata.drop_all(bind=engine)
    print("All tables dropped successfully.")
    
    # Recreate all tables
    models.Base.metadata.create_all(bind=engine)
    print("All tables recreated successfully.")
    print("✅ Database is now completely empty!")
except Exception as e:
    print(f"❌ Error resetting database: {e}")
