import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testGitHubAI() {
    const token = process.env.GITHUB_TOKEN;
    const endpoint = "https://models.github.ai/inference";

    console.log("=== GitHub AI Connection Test ===");
    console.log("Token exists:", !!token);
    console.log("Token length:", token?.length || 0);
    console.log("Token prefix:", token?.substring(0, 15) + "...");
    console.log("Endpoint:", endpoint);
    console.log("");

    if (!token) {
        console.error("❌ GITHUB_TOKEN not found in .env");
        return;
    }

    try {
        const client = ModelClient(endpoint, new AzureKeyCredential(token));

        console.log("Sending test message to GitHub AI...");
        const response = await client.path("/chat/completions").post({
            body: {
                messages: [
                    { role: "system", content: "You are a helpful assistant. Reply briefly." },
                    { role: "user", content: "Say hello in 5 words or less." }
                ],
                temperature: 0.7,
                max_tokens: 50,
                model: "gpt-4o"
            }
        });

        if (isUnexpected(response)) {
            console.error("❌ API Error:", response.body);
            console.error("Status:", response.status);
            return;
        }

        console.log("✅ SUCCESS! AI Response:");
        console.log(response.body.choices[0].message.content);

    } catch (error) {
        console.error("❌ Connection Error:", error.message);
        console.error("Full error:", error);
    }
}

testGitHubAI();
