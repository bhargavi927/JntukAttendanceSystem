
import * as faceapi from 'face-api.js';
import canvas from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Monkey Patching for Node.js environment
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Go up two levels from src/services -> src -> backend
// Models are in backend/models
const MODELS_PATH = path.join(__dirname, '../../models');
const SHARD_PATH = path.join(__dirname, '../../models');

let modelsLoaded = false;

// Ensure canvas uses the monkey patch
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

/**
 * Load FaceAPI Models
 */
export const loadFaceModels = async () => {
    if (modelsLoaded) return;
    try {
        console.log('[FaceService] Loading FaceAPI models from:', MODELS_PATH);

        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);

        modelsLoaded = true;
        console.log('[FaceService] FaceAPI models loaded successfully.');
    } catch (error) {
        console.error('[FaceService] Failed to load models:', error);
        // Do not throw, allow server to start but feature will fail
    }
};

/**
 * Verify if the probe image matches the reference image
 * @param {string} referenceImageUrl - URL or Path to the user's profile picture
 * @param {Buffer} probeImageBuffer - Buffer of the live image
 * @returns {Promise<{match: boolean, score: number, distance: number}>}
 */
export const verifyFace = async (referenceImageUrl, probeImageBuffer) => {
    if (!modelsLoaded) await loadFaceModels();

    try {
        // 1. Load Reference Image
        // Canvas.loadImage supports URL or Buffer
        const referenceImage = await canvas.loadImage(referenceImageUrl);

        // 2. Load Probe Image
        const probeImage = await canvas.loadImage(probeImageBuffer);

        // 3. Detect Face & Compute Descriptor for Reference (Single Face, Highest Confidence)
        // Using SSD Mobilenet V1
        const refDetection = await faceapi
            .detectSingleFace(referenceImage)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!refDetection) {
            return { match: false, error: "No face detected in profile photo. Please upload a clear profile picture." };
        }

        // 4. Detect Face & Compute Descriptor for Probe
        const probeDetection = await faceapi
            .detectSingleFace(probeImage)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!probeDetection) {
            return { match: false, error: "No face detected in live image. Ensure good lighting." };
        }

        // 5. Compare Descriptors (Euclidean Distance)
        const distance = faceapi.euclideanDistance(refDetection.descriptor, probeDetection.descriptor);

        // Standard threshold is 0.6. Secure is 0.5. Open is 0.7.
        // We use 0.55 for a balance.
        const threshold = 0.55;
        const match = distance < threshold;

        // Convert distance to a similarity score (0-100)
        // Distance 0 = 100% match. Distance 1.0 = 0% match.
        const score = Math.max(0, (1 - distance) * 100).toFixed(1);

        console.log(`[FaceService] Verification Result: Match=${match}, Distance=${distance.toFixed(3)}, Score=${score}`);

        return { match, distance, score };

    } catch (error) {
        console.error('[FaceService] Verification error:', error);
        return { match: false, error: error.message };
    }
};
