import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testAI() {
    console.log("=== Testing AI Service ===");
    const token = process.env["GITHUB_TOKEN"];
    if (!token) {
        console.error("❌ GITHUB_TOKEN is missing in .env");
        return;
    }
    console.log(`Token found: ${token.substring(0, 5)}...`);

    const endpoint = "https://models.github.ai/inference";
    const client = ModelClient(endpoint, new AzureKeyCredential(token));

    console.log("Sending request to GitHub Models...");
    const start = Date.now();

    try {
        const response = await client.path("/chat/completions").post({
            body: {
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: "Hello, are you online?" }
                ],
                max_tokens: 50,
                model: "gpt-4o"
            }
        });

        if (isUnexpected(response)) {
            console.error("❌ AI API Error:", response.body.error);
        } else {
            console.log("✅ AI Response:", response.body.choices[0].message.content);
            console.log(`⏱️ Duration: ${Date.now() - start}ms`);
        }

    } catch (error) {
        console.error("❌ Exception:", error);
    }
}

testAI();
