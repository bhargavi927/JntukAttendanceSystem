
/**
 * Rule-Based Attendance Predictor
 * 
 * Computes risk based on 75% attendance threshold.
 */

export const calculateRuleBasedPrediction = ({
    subject,
    held,
    attended,
    weeklyClasses = 3,
    weeksRemaining = 4
}) => {
    const remainingClasses = weeklyClasses * weeksRemaining;
    const totalClasses = held + remainingClasses;

    // Target: 75%
    const needTotal = Math.ceil(0.75 * totalClasses);
    const needFuture = Math.max(0, needTotal - attended);

    let risk = 'Low';

    if (needFuture > remainingClasses) {
        risk = 'High';
    } else {
        const difficulty = remainingClasses > 0 ? (needFuture / remainingClasses) : 0;
        if (difficulty >= 0.85) {
            risk = 'Medium';
        }
    }

    const pct = held > 0 ? ((attended / held) * 100).toFixed(2) : 0;

    return {
        subject,
        held,
        attended,
        pct: parseFloat(pct),
        weeklyClasses,
        weeksRemaining,
        remainingClasses,
        rule: {
            risk,
            needFuture,
            remaining: remainingClasses,
            needTotal
        }
    };
};


export const calculateAdvancedPrediction = (data) => {
    const {
        subject,
        held,
        attended,
        weeklyClasses,
        weeksRemaining
    } = data;

    // Logic replicated from ml_service/train.py

    const remainingClasses = weeklyClasses * weeksRemaining;
    const totalProjected = held + remainingClasses;
    const maxPossibleAttendance = attended + remainingClasses;
    const maxPossiblePct = totalProjected > 0 ? (maxPossibleAttendance / totalProjected) * 100 : 0;

    // Current percentage
    const currentPct = held > 0 ? (attended / held) * 100 : 0;

    let riskLevel = 'Low';
    let probability = 0.1; // Low probability of being "At Risk"

    // Rule 1: Mathematical impossibility to reach 75%
    if (maxPossiblePct < 75) {
        riskLevel = 'High';
        probability = 0.95;
    }
    // Rule 2: Low attendance with little time to recover
    else if (currentPct < 70 && weeksRemaining < 4) {
        riskLevel = 'High';
        probability = 0.85;
    }
    // Rule 3: Borderline case (warning zone) - Optional enhancement
    else if (currentPct < 75) {
        riskLevel = 'Medium';
        probability = 0.6;
    }

    return {
        subject,
        riskLevel,
        probability,
        details: {
            currentPct: parseFloat(currentPct.toFixed(2)),
            maxPossiblePct: parseFloat(maxPossiblePct.toFixed(2)),
            weeklyClasses,
            weeksRemaining
        }
    };
};

export const aggregatePredictions = (predictions) => {
    let overallRisk = 'Low';
    // Handle both old rule structure and new advanced structure if mixed, 
    // but we are fully replacing, so we expect 'riskLevel' or 'rule.risk'

    // We will standardize on 'riskLevel' for the new objects
    const risks = predictions.map(p => p.riskLevel || p.rule?.risk || 'Low');

    if (risks.includes('High')) {
        overallRisk = 'High';
    } else if (risks.includes('Medium')) {
        overallRisk = 'Medium';
    }

    return overallRisk;
};
