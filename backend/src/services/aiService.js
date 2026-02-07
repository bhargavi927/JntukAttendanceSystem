import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { NEUROSTACK_ASSISTANT_PROMPT } from "../config/assistantPrompt.js";

const modelName = "gpt-4o-mini";

export const generateAIResponse = async (userMessage, role, contextData = {}) => {
    try {
        const token = process.env["GITHUB_TOKEN"];
        const endpoint = "https://models.github.ai/inference";

        if (!token) {
            console.error("GITHUB_TOKEN is missing.");
            return {
                text: "My neural link is broken (Missing Token). Please ask admin to check configuration.",
                options: []
            };
        }

        const client = ModelClient(endpoint, new AzureKeyCredential(token));

        // Construct System Prompt with Context
        let systemPrompt = `${NEUROSTACK_ASSISTANT_PROMPT}\nUser Role: ${role}\n`;

        if (contextData && Object.keys(contextData).length > 0) {
            systemPrompt += `\n[Current Context Data]\n`;
            if (contextData.name) systemPrompt += `Name: ${contextData.name}\n`;

            // Student Context
            if (contextData.attendance) systemPrompt += `Attendance: ${contextData.attendance}\n`;
            if (contextData.today) systemPrompt += `Today is: ${contextData.today}\n`;
            if (contextData.timetable) systemPrompt += `Timetable: ${JSON.stringify(contextData.timetable)}\n`;
            if (contextData.subjects) systemPrompt += `Subjects: ${JSON.stringify(contextData.subjects)}\n`;

            // Professor Context
            if (contextData.active_classes) systemPrompt += `Active Classes: ${JSON.stringify(contextData.active_classes)}\n`;
            if (contextData.pending_approvals) systemPrompt += `Pending Approvals: ${contextData.pending_approvals}\n`;
            if (contextData.analytics) systemPrompt += `Class Analytics: ${contextData.analytics}\n`;
            if (contextData.role === 'Professor' && contextData.timetable) systemPrompt += `Today's Schedule: ${JSON.stringify(contextData.timetable)}\n`;

            // Generic Profile
            if (contextData.profile) systemPrompt += `Profile: ${JSON.stringify(contextData.profile)}\n`;

            systemPrompt += `[End Context]\n`;
        }

        // Timeout Promise
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out")), 10000)
        );

        const responsePromise = client.path("/chat/completions").post({
            body: {
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.7,
                top_p: 1.0,
                max_tokens: 1000,
                model: modelName
            }
        });

        // Race between response and timeout
        const response = await Promise.race([responsePromise, timeout]);

        if (isUnexpected(response)) {
            console.error("AI API Error:", response.body.error);
            throw new Error(response.body.error.message || "Unknown API Error");
        }

        const text = response.body.choices[0].message.content;

        // Generate Options (Simplistic Logic)
        let options = [];
        const lowerText = text.toLowerCase();

        // Student Options
        if (role === 'Student') {
            if (lowerText.includes("attendance")) options.push({ label: "Check Attendance", value: "How is my attendance?" });
            if (lowerText.includes("lms") || lowerText.includes("notes")) options.push({ label: "LMS Materials", value: "Where are my LMS notes?" });
        }

        // Professor Options
        if (role === 'Professor') {
            if (lowerText.includes("report")) options.push({ label: "Full Report", value: "Give me a full class report" });
            if (lowerText.includes("pending")) options.push({ label: "Review Pending", value: "Review pending approvals" });
        }

        return { text, options };

    } catch (error) {
        console.error("AI Generation Critical Failure:", error);

        // Fallback Options based on Role
        let fallbackOptions = [];
        if (role === 'Professor') {
            fallbackOptions = [
                { label: "Review Pending", value: "Review pending approvals" },
                { label: "Full Report", value: "Give me a full class report" }
            ];
        } else {
            fallbackOptions = [
                { label: "Check Attendance", value: "How is my attendance?" },
                { label: "LMS Materials", value: "Where are my LMS notes?" }
            ];
        }

        return {
            text: "I'm having trouble connecting to the AI brain right now (Network Timeout). But I can still help you with these actions:",
            options: fallbackOptions
        };
    }
};

/**
 * [DEPRECATED] Verifies if the face in the probe buffer matches the reference buffer.
 * Kept as stub for backward compatibility if imported elsewhere, but logic is disabled.
 */
export const verifyFace = async (referenceBuffer, probeBuffer) => {
    // Logic removed as per user request
    return { match: true, score: 0, details: "AI Verification Disabled" };
};
