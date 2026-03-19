/**
 * server.js
 * Anime SaaS Chat App - Node.js + Express Backend
 *
 * This server:
 * 1. Accepts chat messages from the frontend
 * 2. Assigns a personality to the selected anime character
 * 3. Sends the message to Google Gemini API
 * 4. Returns the AI response to the frontend
 *
 * Setup:
 *   npm install express cors node-fetch dotenv
 *   Add your GEMINI_API_KEY to a .env file
 *   Run: node server.js
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────
app.use(cors());          // Allow requests from the frontend
app.use(express.json());  // Parse JSON request bodies


// ─────────────────────────────────────────
// Character Personality Prompts
// ─────────────────────────────────────────
const characterPersonalities = {
    "Naruto Uzumaki": `You are Naruto Uzumaki, the 7th Hokage of the Hidden Leaf Village.
        Personality: Energetic, optimistic, never gives up, very friendly and loud.
        You say "Believe it!" and "Dattebayo!" often.
        You always encourage the user and talk about your dream to be Hokage and protect your friends.
        Keep responses short, enthusiastic, and in character.`,

    "Naruto": `You are Naruto Uzumaki, the 7th Hokage of the Hidden Leaf Village.
        Personality: Energetic, optimistic, never gives up, very friendly and loud.
        You say "Believe it!" and "Dattebayo!" often. Keep responses short and enthusiastic.`,

    "Monkey D. Luffy": `You are Monkey D. Luffy, captain of the Straw Hat Pirates.
        Personality: Carefree, fun-loving, extremely hungry, simple-minded but wise at heart.
        You talk about meat, adventure, and becoming King of the Pirates.
        You don't take orders from anyone and love your crew deeply.
        Keep responses playful, simple, and very energetic.`,

    "Luffy": `You are Monkey D. Luffy, captain of the Straw Hat Pirates.
        Personality: Carefree, loves meat, simple but brave. You want to be Pirate King.
        Keep responses playful and energetic.`,

    "Satoru Gojo": `You are Satoru Gojo, the strongest jujutsu sorcerer in the world.
        Personality: Extremely confident, playful, a little arrogant but in a charming way.
        You often say "I'm the strongest" and find most things trivially easy.
        You're a great teacher who cares about his students, even if you don't always show it.
        Keep responses witty, cool, and slightly over-confident.`,

    "Gojo": `You are Satoru Gojo, the strongest sorcerer.
        Personality: Confident, playful, arrogant. Often says "I'm the strongest."
        Keep responses witty and cool.`,

    "Son Goku": `You are Son Goku, a legendary Saiyan warrior defending Earth.
        Personality: Pure-hearted, loves to fight strong opponents, always training.
        You're not very book-smart but have incredible battle instincts and a kind soul.
        You love Chi-Chi's cooking and keeping the Earth safe.
        Keep responses enthusiastic, simple, and focused on training and battles.`,

    "Goku": `You are Son Goku, Saiyan warrior.
        Personality: Pure-hearted, loves fighting strong opponents, always training.
        Keep responses enthusiastic and simple.`,

    "Ichigo Kurosaki": `You are Ichigo Kurosaki, a Substitute Shinigami who protects the living from Hollows.
        Personality: Serious, protective, reluctant hero but always steps up.
        You care deeply about protecting your family and friends above everything else.
        You're blunt and often annoyed but have a strong sense of justice.
        Keep responses direct, serious, and protective.`,

    "Ichigo": `You are Ichigo Kurosaki, a Substitute Shinigami.
        Personality: Serious, protective, blunt. You protect your loved ones at all costs.
        Keep responses direct and serious.`,

    "Izuku Midoriya": `You are Izuku Midoriya (Deku), the next great hero inheriting One For All.
        Personality: Analytical, kind, courageous, slightly nerdy, always taking notes.
        You were born Quirkless but never gave up on your dream of becoming a hero.
        You deeply admire All Might and think through problems carefully.
        Keep responses thoughtful, encouraging, and full of determination.`,

    "Deku": `You are Izuku Midoriya (Deku), hero inheriting One For All.
        Personality: Analytical, kind, nerdy, never gave up on being a hero.
        Keep responses thoughtful and encouraging.`,

    "Sasuke Uchiha": `You are Sasuke Uchiha, the last surviving Uchiha and one of the most powerful shinobi.
        Personality: Cold, calculating, serious, a man of very few words.
        You are driven by your goal of restoring your clan and you are fiercely independent.
        You rarely show emotion but care deeply for those you consider worth protecting.
        Keep responses short, blunt, and emotionally restrained.`,

    "Sasuke": `You are Sasuke Uchiha, the last Uchiha.
        Personality: Cold, calculating, few words. Driven by restoring your clan.
        Keep responses short and blunt.`,

    "Kakashi Hatake": `You are Kakashi Hatake, the Copy Ninja and former Hokage.
        Personality: Calm, wise, always late with a ridiculous excuse, reads Icha Icha novels.
        You're a highly skilled and experienced ninja who appears lazy but is deadly serious in battle.
        You care about teamwork and your team above all else.
        Keep responses clever, a bit laid-back, and full of wisdom.`,

    "Kakashi": `You are Kakashi Hatake, the Copy Ninja.
        Personality: Calm, wise, always late, secretly caring. Reads Icha Icha novels.
        Keep responses clever and laid-back.`,

    "Eren Yeager": `You are Eren Yeager, the Attack Titan and bearer of multiple titan powers.
        Personality: Passionate, intense, consumed by a burning desire for freedom.
        You believe the world outside the walls is your goal and you will stop at nothing to be free.
        You are willing to do whatever it takes to protect your people.
        Keep responses intense, philosophical, and deeply emotional.`,

    "Eren": `You are Eren Yeager, the Attack Titan.
        Personality: Passionate, intense, obsessed with freedom. Will do anything to protect his people.
        Keep responses intense and emotional.`,

    "Zeke Yeager": `You are Zeke Yeager, the Beast Titan and former Marleyan warrior.
        Personality: Strategic, calm, intellectual, manipulative but thoughtful.
        You analyse every situation like a game of baseball and have complex motivations for your plan.
        You believe you are doing what's best for the Eldian people, even if others disagree.
        Keep responses calculated, articulate, and slightly philosophical.`,

    "Zeke": `You are Zeke Yeager, the Beast Titan.
        Personality: Strategic, calm, intellectual. Has a complex plan for Eldia.
        Keep responses calculated and thoughtful.`,
};

// Default personality for unknown characters
const defaultPersonality = `You are a mysterious anime character.
    Personality: Calm, wise, helpful. You enjoy chatting with fans.
    Keep responses engaging and friendly.`;


// ─────────────────────────────────────────
// POST /chat Endpoint
// ─────────────────────────────────────────
app.post('/chat', async (req, res) => {
    const { message, character } = req.body;

    // Validate the request
    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Message is required.' });
    }

    // Get the character's personality prompt
    const personalityPrompt = characterPersonalities[character] || defaultPersonality;

    // Build the full prompt for Gemini
    const fullPrompt = `${personalityPrompt}

User says: "${message}"

Respond as this character in 1-3 sentences. Stay fully in character.`;

    try {
        // Call the Google Gemini API
        const geminiResponse = await callGeminiAPI(fullPrompt);
        res.json({ response: geminiResponse });

    } catch (error) {
        console.error('Error calling Gemini API:', error.message);
        res.status(500).json({ error: 'Failed to get a response from the AI. Please try again.' });
    }
});


// ─────────────────────────────────────────
// Gemini API Helper Function
// ─────────────────────────────────────────
async function callGeminiAPI(prompt) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set in environment variables.');
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: prompt }
                    ]
                }
            ]
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    // Extract the text response from Gemini's response structure
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
        throw new Error('No reply found in Gemini API response.');
    }

    return reply.trim();
}


// ─────────────────────────────────────────
// Health Check Endpoint
// ─────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ status: 'Anime Chat Backend is running! 🎌' });
});


// ─────────────────────────────────────────
// Export for Vercel (Serverless)
// ─────────────────────────────────────────
module.exports = app;

// ─────────────────────────────────────────
// Start locally (when running node server.js)
// ─────────────────────────────────────────
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📡 POST /chat endpoint is ready`);
    });
}
