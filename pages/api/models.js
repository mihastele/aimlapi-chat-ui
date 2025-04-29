// pages/api/models.js

let MODELS = ["gpt-3.5", "gpt-4", "custom-model"];

export default function handler(req, res) {
    if (req.method === "GET") {
        // TODO fetch from api endpoint /models
        res.status(200).json({ models: MODELS });
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}