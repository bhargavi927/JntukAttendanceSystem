import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testFetch() {
    console.log("=== Testing Raw Fetch Connectivity ===");
    const token = process.env["GITHUB_TOKEN"];
    const endpoint = "https://models.github.ai/inference/chat/completions";

    if (!token) {
        console.error("❌ Token missing");
        return;
    }

    console.log(`Connecting to: ${endpoint}`);
    console.log("Waiting for response...");

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: "Ping." }
                ],
                model: "gpt-4o-mini",
                max_tokens: 10
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error("Body:", text);
        } else {
            const data = await response.json();
            console.log("✅ Success! Response:", data.choices[0].message.content);
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error("❌ Request timed out (10s limit reached). Network is slow or blocked.");
        } else {
            console.error("❌ Fetch Error:", error.message, error.cause);
        }
    }
}

testFetch();
