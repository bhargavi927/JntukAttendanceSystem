import path from 'path';
import { fileURLToPath } from 'url';
import * as faceapi from 'face-api.js';
import canvas from 'canvas';

// Monkey patch
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFaceAPI() {
    console.log("1. Starting FaceAPI Test...");
    // Correct path: models are in backend/models, and this script is in backend/
    const modelPath = path.join(__dirname, 'models');

    try {
        console.log("2. Loading models from:", modelPath);
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
        console.log("✅ simple-face-detection model loaded!");

        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
        console.log("✅ face-landmark-68 model loaded!");

        console.log("3. Success! Your system CAN run Real AI.");
    } catch (error) {
        console.error("❌ FAILURE: Your system cannot run Real AI.");
        console.error("Reason:", error.message);
        if (error.message.includes("version")) {
            console.error("Hint: This is often a mismatch between 'canvas' node version and your system.");
        }
    }
}

testFaceAPI();
