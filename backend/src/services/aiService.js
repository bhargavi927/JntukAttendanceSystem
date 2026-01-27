import * as faceapi from 'face-api.js';
import { Canvas, Image, ImageData, createCanvas, loadImage } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURE FACE-API FOR NODE.JS ---
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to models (we downloaded them to backend/models)
const MODELS_PATH = path.join(__dirname, '../../models');

let modelsLoaded = false;

async function loadModels() {
    if (modelsLoaded) return;
    try {
        console.log('[AI Service] Loading models from:', MODELS_PATH);
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
        modelsLoaded = true;
        console.log('[AI Service] Models loaded successfully');
    } catch (error) {
        console.error('[AI Service] Failed to load models:', error);
        throw error;
    }
}

/**
 * Verifies if the face in queryImageUrl matches the face in referenceImageUrl.
 * @param {string} referenceImageUrl - URL of the ground truth (Profile Pic)
 * @param {string} queryImageUrl - URL of the new photo (Selfie)
 * @returns {Promise<{ match: boolean, distance: number, score: number, error?: string }>}
 */
export async function verifyFace(referenceImageUrl, queryImageUrl) {
    try {
        await loadModels();

        // 1. Fetch Images
        const [refImg, queryImg] = await Promise.all([
            loadImage(referenceImageUrl),
            loadImage(queryImageUrl)
        ]);

        // 2. Detect Faces (Single Face)
        // Using SSD Mobilenet V1 for better accuracy than TinyFace
        const refDetection = await faceapi.detectSingleFace(refImg).withFaceLandmarks().withFaceDescriptor();
        const queryDetection = await faceapi.detectSingleFace(queryImg).withFaceLandmarks().withFaceDescriptor();

        if (!refDetection) {
            return { match: false, distance: 1, score: 0, error: "No face detected in profile picture" };
        }
        if (!queryDetection) {
            return { match: false, distance: 1, score: 0, error: "No face detected in attendance selfie" };
        }

        // 3. Compare Descriptors (Euclidean Distance)
        const distance = faceapi.euclideanDistance(refDetection.descriptor, queryDetection.descriptor);

        // Threshold: typically 0.6 is a good match. Lower is better.
        // We convert distance to a "Score" (0 to 100)
        // If dist = 0, score = 100. If dist = 0.6, score ~ 40 (Match). If dist > 0.6, score < 40 (No Match).
        // Let's invert it: Score = max(0, (1 - distance) * 100) ? No, that's linear.
        // Common formula: 
        const match = distance < 0.6;

        // Custom Score Calculation mapped to 0-100%
        // distance 0.0 -> 100%
        // distance 0.4 -> 80%
        // distance 0.6 -> 60% (Threshold)
        // distance 1.0 -> 0%
        let score = Math.max(0, 100 - (distance * 100)); // Simple linear for UI display

        // Refine score for display "Accuracy"
        // If match, boost it slightly to look confident, if mismatch dump it.
        // Actually, let's just return the raw calculation for transparency.

        return {
            match,
            distance: distance,
            score: Math.round(score),
            details: {
                refBox: refDetection.detection.box,
                queryBox: queryDetection.detection.box
            }
        };

    } catch (error) {
        console.error('[AI Service] precise error:', error);
        return { match: false, distance: 0, score: 0, error: "AI Processing Failed: " + error.message };
    }
}
