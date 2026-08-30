from flask import Flask, request, jsonify
import random
import time
import sqlite3
import os
from india_geo_data import get_district_coords

DB_PATH = os.path.join(os.path.dirname(__file__), 'cybercrimes.db')

app = Flask(__name__)

# In a real-world scenario, we would load a pre-trained model like:
# import joblib
# model = joblib.load('fraud_model.pkl')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    if not data:
        return jsonify({"error": "No input data provided"}), 400
    
    # Extract features (simulated extraction)
    amount = data.get('amount', '0')
    crime_type = data.get('crimeType', 'Unknown')
    
    # Simulate some ML processing delay
    time.sleep(0.5)
    
    # Simulated ML Logic based on simple heuristics to mimic a real model
    try:
        # amount might be something like '₹85,000'
        numeric_amount = int(''.join(filter(str.isdigit, str(amount))))
    except ValueError:
        numeric_amount = 0

    score = random.randint(30, 60) # Base score
    
    # Increase score based on amount
    if numeric_amount > 200000:
        score += 30
    elif numeric_amount > 50000:
        score += 20
        
    # Adjust based on crime type severity
    if "Corporate" in crime_type or "UPI" in crime_type:
        score += 10
        
    # Clamp score to 100 max
    score = min(score, 99)
    
    # Determine risk level
    if score >= 85:
        risk_level = "CRITICAL"
        action = "Immediate inter-bank debit hold notification via 1930 portal and dispatch armed vigilance unit."
    elif score >= 70:
        risk_level = "HIGH"
        action = "Place real-time CCTV monitoring alert and verify IP subnet proxy."
    elif score >= 50:
        risk_level = "MEDIUM"
        action = "Monitor account activity and initiate standard KYC re-verification."
    else:
        risk_level = "LOW"
        action = "Standard timeline investigation. Log the mule account for future references."
        
    confidence = round(random.uniform(75.5, 98.9), 1)

    prediction = {
        "score": score,
        "riskLevel": risk_level,
        "confidence": f"{confidence}%",
        "recommendedAction": action,
        "model": "Simulated Random Forest (Flask Endpoint)"
    }
    
    return jsonify(prediction)

@app.route('/api/hotspots/predict', methods=['GET'])
def predict_hotspots():
    state = request.args.get('state', None)
    category = request.args.get('category', None)
    if not state:
        return jsonify({"error": "State parameter is required"}), 400
        
    if not os.path.exists(DB_PATH):
        return jsonify({"error": "Database not found. Please generate data first."}), 500
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        if category and category != "All":
            # Map category from UI to similar crime types in DB if necessary
            cursor.execute('''
                SELECT 
                    district,
                    COUNT(id) as total_crimes,
                    SUM(amount) as total_loss,
                    GROUP_CONCAT(crime_type) as crime_types,
                    GROUP_CONCAT(timestamp) as timestamps
                FROM crimes
                WHERE state = ? AND crime_type LIKE ?
                GROUP BY district
            ''', (state, f"%{category}%"))
        else:
            cursor.execute('''
                SELECT 
                    district,
                    COUNT(id) as total_crimes,
                    SUM(amount) as total_loss,
                    GROUP_CONCAT(crime_type) as crime_types,
                    GROUP_CONCAT(timestamp) as timestamps
                FROM crimes
                WHERE state = ?
                GROUP BY district
            ''', (state,))
        
        results = cursor.fetchall()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
        
    hotspots = []
    
    for row in results:
        district = row[0]
        total_crimes = row[1]
        total_loss = row[2] or 0
        crime_types_str = row[3]
        timestamps_str = row[4]
        
        # Calculate ML prediction score (heuristic based on volume and loss)
        # Assuming ~1500 crimes per district is max if evenly distributed (50k / 35 states / avg 10 districts = ~142)
        volume_score = min(50, (total_crimes / 300) * 50)
        loss_score = min(50, (total_loss / (total_crimes * 500000)) * 50) # Normalize loss
        
        score = volume_score + loss_score + random.uniform(-5, 10)
        score = min(99, max(10, int(score)))
        
        if score >= 85:
            level = "CRITICAL"
        elif score >= 70:
            level = "HIGH"
        elif score >= 50:
            level = "MEDIUM"
        else:
            level = "SAFE"
            
        types_list = crime_types_str.split(',') if crime_types_str else []
        dominant_category = max(set(types_list), key=types_list.count) if types_list else "Unknown"
        
        # Predict time window based on historical timestamps
        timestamps_list = timestamps_str.split(',') if timestamps_str else []
        if timestamps_list:
            # Extract hours (timestamp format: YYYY-MM-DDTHH:MM:SS)
            hours = []
            for ts in timestamps_list:
                try:
                    # ISO format T is at index 10, hour is 11:13
                    if 'T' in ts:
                        hour = int(ts.split('T')[1][:2])
                        hours.append(hour)
                except:
                    pass
            
            if hours:
                dominant_hour = max(set(hours), key=hours.count)
                # Create a 3-hour window
                end_hour = (dominant_hour + 3) % 24
                time_window = f"{dominant_hour:02d}:00 - {end_hour:02d}:00"
            else:
                time_window = "18:00 - 21:00"
        else:
            time_window = "18:00 - 21:00"
        
        # Resolve verified geographic coordinates — NEVER random
        lat, lng = get_district_coords(state, district)
        
        hotspots.append({
            "id": f"hotspot-{district}",
            "name": district,
            "state": state,
            "level": level,
            "score": score,
            "complaints": total_crimes,
            "category": dominant_category,
            "timeWindow": time_window,
            "withdrawals": random.randint(10, 150),
            "nearbyAtms": random.randint(5, 40),
            "cctvCoverage": f"{random.randint(40, 95)}%",
            "coordinates": [lat, lng],
            "radius": 1500,
            "highRiskAtms": [
                { "id": f"atm1_{district}", "name": f"SBI ATM {district} Main", "risk": "Vulnerable", "coords": [lat + 0.01, lng + 0.01] },
                { "id": f"atm2_{district}", "name": f"HDFC ATM {district} Hub", "risk": "Compromised", "coords": [lat - 0.01, lng - 0.01] }
            ] if score > 75 else []
        })
        
    # Sort by risk score descending
    hotspots.sort(key=lambda x: x['score'], reverse=True)
        
    return jsonify({"hotspots": hotspots})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
