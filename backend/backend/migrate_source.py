import os
from sqlalchemy import create_engine, text
from config import get_config

def migrate():
    config = get_config()
    engine = create_engine(config.DATABASE_URL)
    
    with engine.connect() as conn:
        print("Checking for 'source' column in 'coach_ratings' table...")
        # Check if column exists
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='coach_ratings' AND column_name='source';
        """)
        result = conn.execute(check_query).fetchone()
        
        if not result:
            print("Adding 'source' column...")
            try:
                conn.execute(text("ALTER TABLE coach_ratings ADD COLUMN source VARCHAR(20) DEFAULT 'coach' NOT NULL;"))
                conn.commit()
                print("Column added successfully.")
            except Exception as e:
                print(f"Error adding column: {e}")
        else:
            print("Column 'source' already exists.")

if __name__ == "__main__":
    migrate()
