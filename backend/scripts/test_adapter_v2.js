
import { getMLPrediction } from './src/utils/mlAdapter.js';

async function test() {
    console.log("Testing ML Adapter...");
    const mockData = [
        {
            subject: "Test Subject",
            pct: 60,
            held: 20,
            missed: 8,
            weeklyClasses: 3,
            weeksRemaining: 5
        }
    ];

    const start = Date.now();
    const result = await getMLPrediction(mockData);
    const time = Date.now() - start;

    console.log("Time (ms):", time);
    console.log("Result:", JSON.stringify(result, null, 2));

    if (result && result.length > 0 && result[0].probability !== undefined) {
        console.log("SUCCESS: Adapter returned valid prediction.");
    } else {
        console.error("FAILURE: Adapter returned invalid result.");
        process.exit(1);
    }
}

test();
