import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const clearAuthCookie = (res) => res.clearCookie("token", {
    path: "/",
    sameSite: "strict",
    secure: false,
});

export const getCurrentUser = async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.status(200).json(null);

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            clearAuthCookie(res);
            return res.status(200).json(null);
        }

        const user = await User.findById(payload.userId);
        if (!user) {
            clearAuthCookie(res);
            return res.status(200).json(null);
        }

        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: `Failed to get current user: ${error.message}` });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const fields = ["name", "desiredRole", "linkedinUrl", "phone", "location", "portfolioUrl", "bio"];
        const updates = Object.fromEntries(fields.filter((field) => typeof req.body[field] === "string")
            .map((field) => [field, req.body[field].trim()]));
        if (updates.name !== undefined && !updates.name) {
            return res.status(400).json({ message: "Name is required." });
        }
        const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true, runValidators: true });
        if (!user) return res.status(404).json({ message: "User not found." });
        return res.json(user);
    } catch (error) {
        return res.status(500).json({ message: "Could not save your profile." });
    }
};
