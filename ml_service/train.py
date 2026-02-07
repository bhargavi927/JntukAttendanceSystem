
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
import pickle
import os

# Ensure clean directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def generate_synthetic_data(n=1000):
    np.random.seed(42)
    
    # Features:
    # pct: Percentage attended (0-100)
    # held: Total classes held so far
    # missed: Classes missed
    # weeklyClasses: Classes per week
    # weeksRemaining: Weeks left in semester
    
    data = []
    
    for _ in range(n):
        held = np.random.randint(10, 60)
        weekly = np.random.randint(2, 6)
        weeks_left = np.random.randint(1, 15)
        
        attended = np.random.randint(0, held + 1)
        missed = held - attended
        pct = (attended / held) * 100
        
        # Determine label based on a realistic rule + some noise
        # Rule of thumb: if (attended + remaining) / total < 75%, then At Risk
        remaining_classes = weekly * weeks_left
        total_projected = held + remaining_classes
        max_possible_attendance = attended + remaining_classes
        max_possible_pct = (max_possible_attendance / total_projected) * 100
        
        # Label: 1 = Safe, 0 = At Risk
        # We want "At Risk" to be the positive class for "probability of being at risk"? 
        # Usually "1" is the event we are looking for. Let's make 1 = At Risk.
        
        if max_possible_pct < 75:
            label = 1 # Definite Risk
        elif pct < 70 and weeks_left < 4:
            label = 1 # Low current attendance and little time to recover
        else:
            # Add some noise/uncertainty near the border
            if 70 <= pct <= 80:
                label = np.random.choice([0, 1], p=[0.7, 0.3])
            else:
                label = 0 # Safe
        
        data.append([pct, held, missed, weekly, weeks_left, label])
        
    columns = ['pct', 'held', 'missed', 'weeklyClasses', 'weeksRemaining', 'isAtRisk']
    return pd.DataFrame(data, columns=columns)

def train():
    print("Generating synthetic data...")
    df = generate_synthetic_data(2000)
    
    X = df[['pct', 'held', 'missed', 'weeklyClasses', 'weeksRemaining']]
    y = df['isAtRisk']
    
    print("Training Logistic Regression model...")
    model = LogisticRegression()
    model.fit(X, y)
    
    # Test on a few samples
    # High pct -> should be Safe (0)
    # Low pct -> should be Risk (1)
    
    test_good = [[90, 40, 4, 3, 10]] # 90% attendance, plenty of time
    test_bad = [[40, 40, 24, 3, 2]]  # 40% attendance, almost no time
    
    print(f"Prediction for 90% att: {model.predict(test_good)[0]} (Expected 0)")
    print(f"Prediction for 40% att: {model.predict(test_bad)[0]} (Expected 1)")
    
    with open('model.pkl', 'wb') as f:
        pickle.dump(model, f)
    
    print("Model saved to model.pkl")

if __name__ == "__main__":
    train()
