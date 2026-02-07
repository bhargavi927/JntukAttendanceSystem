
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Go up from src/utils -> src -> backend -> root -> ml_service
const ML_SERVICE_PATH = path.join(__dirname, '../../../ml_service/predict.py');

export const getMLPrediction = async (subjectsData) => {
    return new Promise((resolve) => {
        try {
            const pythonProcess = spawn('python', [ML_SERVICE_PATH]);

            let dataString = '';
            let errorString = '';

            // Send data to stdin
            pythonProcess.stdin.write(JSON.stringify(subjectsData));
            pythonProcess.stdin.end();

            pythonProcess.stdout.on('data', (data) => {
                dataString += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorString += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.warn('[ML Service] Python script exited with code', code, errorString);
                    return resolve(null); // Fallback
                }
                try {
                    const result = JSON.parse(dataString);
                    if (result.error) {
                        console.warn('[ML Service] Script returned error:', result.error);
                        return resolve(null);
                    }
                    resolve(result);
                } catch (e) {
                    console.error('[ML Service] JSON parse error:', e);
                    resolve(null);
                }
            });

            pythonProcess.on('error', (err) => {
                console.error('[ML Service] Spawn error:', err);
                resolve(null);
            });

        } catch (e) {
            console.error('[ML Service] Wrapper error:', e);
            resolve(null);
        }
    });
};
