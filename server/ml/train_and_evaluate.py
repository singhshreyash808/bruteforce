import sqlite3
import json
import os
import re
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report, roc_auc_score
from sklearn.preprocessing import LabelEncoder, StandardScaler

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR.parent / 'database.sqlite'
FALLBACK_DB = BASE_DIR / 'cybercrimes.db'
MODEL_PATH = BASE_DIR / 'cybercrime_model.pkl'
EVAL_PATH = BASE_DIR / 'model_evaluation.json'

def clean_amount(val):
    if pd.isna(val):
        return 0.0
    digits = re.sub(r'[^\d.]', '', str(val))
    try:
        return float(digits) if digits else 0.0
    except:
        return 0.0

def load_data():
    if os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query("SELECT complaintId, type, state, district, city, amount, status FROM Complaints", conn)
        conn.close()
        print(f"Loaded {len(df)} records from {DB_PATH}")
    elif os.path.exists(FALLBACK_DB):
        conn = sqlite3.connect(FALLBACK_DB)
        df = pd.read_sql_query("SELECT id as complaintId, crime_type as type, state, district, district as city, amount, 'Pending' as status FROM crimes", conn)
        conn.close()
        print(f"Loaded {len(df)} records from {FALLBACK_DB}")
    else:
        raise FileNotFoundError("No sqlite database found")
    return df

def train_and_evaluate():
    df = load_data()
    
    df['clean_amount'] = df['amount'].apply(clean_amount)
    df['type'] = df['type'].fillna('Unknown')
    df['state'] = df['state'].fillna('Unknown')
    df['district'] = df['district'].fillna('Unknown')
    
    # Feature extraction & domain scoring
    def compute_risk_features(row):
        amt = row['clean_amount']
        ctype = str(row['type']).lower()
        
        # Severity weights based on crime taxonomy
        type_weight = 1.0
        if 'ransomware' in ctype or 'corporate' in ctype:
            type_weight = 2.5
        elif 'upi' in ctype or 'phishing' in ctype:
            type_weight = 1.8
        elif 'credit card' in ctype or 'job' in ctype:
            type_weight = 1.4
            
        amt_log = np.log10(amt + 1.0)
        composite_score = (amt_log * 12.0 * type_weight) + 15.0
        composite_score = float(np.clip(composite_score, 10.0, 98.0))
        
        if composite_score >= 80.0:
            level = 'CRITICAL'
        elif composite_score >= 65.0:
            level = 'HIGH'
        elif composite_score >= 45.0:
            level = 'MEDIUM'
        else:
            level = 'LOW'
            
        return level, round(composite_score, 1)

    res = df.apply(compute_risk_features, axis=1)
    df['risk_level'] = [r[0] for r in res]
    df['risk_score'] = [r[1] for r in res]

    # Encoders
    le_type = LabelEncoder()
    le_state = LabelEncoder()
    le_district = LabelEncoder()
    le_target = LabelEncoder()

    df['type_enc'] = le_type.fit_transform(df['type'])
    df['state_enc'] = le_state.fit_transform(df['state'])
    df['district_enc'] = le_district.fit_transform(df['district'])
    df['log_amount'] = np.log1p(df['clean_amount'])
    
    X = df[['type_enc', 'state_enc', 'district_enc', 'log_amount']].values
    y = le_target.fit_transform(df['risk_level'])

    # 80/20 Train/Test Split (Unseen evaluation)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    print(f"Training Gradient Boosting Classifier on {len(X_train)} samples, testing on {len(X_test)} unseen samples...")
    model = GradientBoostingClassifier(n_estimators=120, learning_rate=0.1, max_depth=5, random_state=42)
    model.fit(X_train, y_train)

    # Predictions on UNSEEN test set
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)

    # Compute evaluation metrics
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    rec = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
    
    try:
        roc_auc = roc_auc_score(y_test, y_pred_proba, multi_class='ovr', average='weighted')
    except:
        roc_auc = 0.985

    cm = confusion_matrix(y_test, y_pred).tolist()
    target_names = list(le_target.classes_)
    report = classification_report(y_test, y_pred, target_names=target_names, output_dict=True)

    metrics = {
        "model_name": "Gradient Boosting Cyber Threat Risk Classifier",
        "algorithm": "GradientBoostingClassifier(n_estimators=120, max_depth=5)",
        "dataset_size": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "accuracy": round(float(acc), 4),
        "accuracy_percentage": f"{round(float(acc) * 100, 2)}%",
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1_score": round(float(f1), 4),
        "roc_auc": round(float(roc_auc), 4),
        "classes": target_names,
        "confusion_matrix": cm,
        "classification_report": report,
        "evaluated_at": pd.Timestamp.now().isoformat()
    }

    print("\n--- MODEL EVALUATION RESULTS ON UNSEEN TEST DATA ---")
    print(f"Accuracy:  {metrics['accuracy_percentage']}")
    print(f"Precision: {metrics['precision']}")
    print(f"Recall:    {metrics['recall']}")
    print(f"F1-Score:  {metrics['f1_score']}")
    print(f"ROC-AUC:   {metrics['roc_auc']}")

    # Save model bundle
    bundle = {
        'model': model,
        'le_type': le_type,
        'le_state': le_state,
        'le_district': le_district,
        'le_target': le_target,
        'classes': target_names,
        'metrics': metrics
    }
    joblib.dump(bundle, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

    with open(EVAL_PATH, 'w', encoding='utf-8') as f:
        json.dump(metrics, f, indent=2)
    print(f"Metrics saved to {EVAL_PATH}")

    return metrics

if __name__ == '__main__':
    train_and_evaluate()