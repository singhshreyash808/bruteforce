import sqlite3
import json
import random
import uuid
import datetime
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / 'cybercrimes.db'
JSON_PATH = BASE_DIR.parent.parent / 'src' / 'states-and-districts.json'

CRIME_TYPES = [
    "UPI Fraud", "Identity Theft", "Corporate Cyber Attack", 
    "Phishing", "Ransomware", "Credit Card Fraud", "Job Fraud"
]

def load_locations():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    locations = []
    for state_obj in data.get("states", []):
        state_name = state_obj.get("state")
        districts = state_obj.get("districts", [])
        for d in districts:
            locations.append((state_name, d))
    return locations

def random_date(start_date, end_date):
    time_between_dates = end_date - start_date
    days_between_dates = time_between_dates.days
    random_number_of_days = random.randrange(days_between_dates)
    random_date = start_date + datetime.timedelta(days=random_number_of_days)
    return random_date.isoformat()

def generate_data():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS crimes (
            id TEXT PRIMARY KEY,
            state TEXT,
            district TEXT,
            crime_type TEXT,
            amount REAL,
            timestamp TEXT
        )
    ''')
    
    locations = load_locations()
    if not locations:
        print("Error: No locations loaded from JSON.")
        return

    print("Generating 100,000 synthetic cybercrime records...")
    
    records = []
    end_date = datetime.datetime.now()
    start_date = end_date - datetime.timedelta(days=365) # Last 1 year
    
    for _ in range(100000):
        c_id = str(uuid.uuid4())
        state, district = random.choice(locations)
        crime = random.choice(CRIME_TYPES)
        # 80% small amounts, 20% large amounts
        if random.random() < 0.8:
            amount = round(random.uniform(500, 50000), 2)
        else:
            amount = round(random.uniform(50000, 5000000), 2)
            
        timestamp = random_date(start_date, end_date)
        records.append((c_id, state, district, crime, amount, timestamp))
        
    cursor.executemany('''
        INSERT INTO crimes (id, state, district, crime_type, amount, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', records)
    
    # Create indexes for faster queries
    cursor.execute('CREATE INDEX idx_state_district ON crimes(state, district);')
    
    conn.commit()
    conn.close()
    print(f"Successfully generated 100,000 records in {DB_PATH}")

if __name__ == "__main__":
    generate_data()
