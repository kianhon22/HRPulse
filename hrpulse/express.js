const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

app.post("/process-and-save", async (req, res) => {
    try {
        const { name, comment } = req.body;
        const processedComment = comment.trim().toLowerCase();

        // Save to Supabase
        const { data, error } = await supabase
            .from("comments")
            .insert([{ name, comment: processedComment }]);

        if (error) throw error;
        res.json({ message: "Data processed and saved", data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));