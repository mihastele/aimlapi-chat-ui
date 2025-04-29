// pages/api/config.js

let appConfig = {
    searxng_enabled: false,
    searxng_domain: "",
    deep_thinking: false
};

export default function handler(req, res) {
    if (req.method === "GET") {
        res.status(200).json(appConfig);
    } else if (req.method === "POST") {
        appConfig = { ...req.body };
        res.status(200).json(appConfig);
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}