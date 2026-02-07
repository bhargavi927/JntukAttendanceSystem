
import sys
import json
import pickle
import numpy as np
import os

# Ensure we can find the model in the same directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def load_model():
    try:
        with open('model.pkl', 'rb') as f:
            return pickle.load(f)
    except FileNotFoundError:
        return None

def predict(input_data):
    model = load_model()
    if not model:
        return {"error": "Model not found"}

    # Expecting input_data to be a list of subjects or a single subject
    # input_json structure: 
    # [ { "pct": 75, "held": 20, "missed": 5, "weeklyClasses": 3, "weeksRemaining": 10, "subject": "DBMS" }, ... ]
    
    results = []
    
    inputs = []
    subjects = []
    
    if isinstance(input_data, dict):
        input_data = [input_data]
        
    for item in input_data:
        inputs.append([
            item.get('pct', 0),
            item.get('held', 0),
            item.get('missed', 0),
            item.get('weeklyClasses', 3),
            item.get('weeksRemaining', 1)
        ])
        subjects.append(item.get('subject', 'Unknown'))
        
    if not inputs:
        return []

    # Predict
    # Returns 1 for Risk, 0 for Safe
    predictions = model.predict(inputs)
    probs = model.predict_proba(inputs) 
    
    for i, pred in enumerate(predictions):
        prob_risk = probs[i][1] # Probability of class 1 (Risk)
        
        risk_label = "High" if prob_risk > 0.7 else ("Medium" if prob_risk > 0.4 else "Low")
        
        results.append({
            "subject": subjects[i],
            "isAtRisk": int(pred),
            "riskLevel": risk_label,
            "probability": round(prob_risk, 4)
        })
        
    return results

if __name__ == "__main__":
    try:
        # Read from stdin
        input_str = sys.stdin.read()
        if not input_str.strip():
            # Fallback or empty
            print(json.dumps([]))
            sys.exit(0)
            
        data = json.loads(input_str)
        result = predict(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
