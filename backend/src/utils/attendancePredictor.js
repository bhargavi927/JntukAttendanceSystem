
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

export const aggregatePredictions = (predictions) => {
    let overallRisk = 'Low';
    const risks = predictions.map(p => p.rule.risk);

    if (risks.includes('High')) {
        overallRisk = 'High';
    } else if (risks.includes('Medium')) {
        overallRisk = 'Medium';
    }

    return overallRisk;
};
