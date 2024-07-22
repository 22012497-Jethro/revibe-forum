const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const { deleteImage, uploadImage } = require('../helpers');

const router = express.Router();

// Supabase setup
const supabaseUrl = "https://fudsrzbhqpmryvmxgced.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1ZHNyemJocXBtcnl2bXhnY2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM5MjE3OTQsImV4cCI6MjAyOTQ5Nzc5NH0.6UMbzoD8J1BQl01h6NSyZAHVhrWerUcD5VVGuBwRcag";
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const authenticateUser = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
};

// Apply authentication middleware to the routes
router.use(authenticateUser);

// Create post endpoint
router.post("/create", upload.single('image'), async (req, res) => {
    const { title, caption, category, theme, rooms, room_category } = req.body;
    const userId = req.session.userId;
    let imageUrl = null;

    if (req.file) {
        console.log("Received file:", req.file);
        try {
            const uploadResponse = await supabase
                .storage
                .from('post-images')
                .upload(`${Date.now()}-${req.file.originalname}`, req.file.buffer, {
                    cacheControl: '3600',
                    upsert: false,
                });

            console.log("Upload response:", uploadResponse);

            if (uploadResponse.error) {
                console.error("Error uploading to Supabase storage:", uploadResponse.error.message);
                return res.status(500).send("Error uploading image: " + uploadResponse.error.message);
            }

            const uploadedPath = uploadResponse.data.path;

            console.log("Uploaded Path:", uploadedPath);

            const publicUrlResponse = supabase
                .storage
                .from('post-images')
                .getPublicUrl(uploadedPath);

            console.log("Public URL response:", publicUrlResponse);

            if (publicUrlResponse.error) {
                console.error("Error generating public URL:", publicUrlResponse.error.message);
                return res.status(500).send("Error generating public URL: " + publicUrlResponse.error.message);
            }

            imageUrl = publicUrlResponse.data.publicUrl;
            console.log("Generated image URL:", imageUrl);
        } catch (error) {
            console.error("Supabase storage error:", error.message);
            return res.status(500).send("Error uploading image: " + error.message);
        }
    } else {
        console.log("No file uploaded");
    }

    try {
        const createdAt = new Date().toISOString();
        console.log("Creating post with data:", { title, caption, image: imageUrl, category, theme, rooms, room_category, user_id: userId, created_at: createdAt });

        const { data, error } = await supabase
            .from('posts')
            .insert([{ title, caption, image: imageUrl, category, theme, rooms, room_category, user_id: userId, created_at: createdAt }]);

        if (error) {
            console.error("Error inserting post into database:", error.message);
            return res.status(500).send("Error creating post: " + error.message);
        }

        console.log("Post created successfully:", data);
        res.redirect("/main");
    } catch (err) {
        console.error("Error creating post:", err.message);
        res.status(500).send("Internal server error: " + err.message);
    }
});

// Delete post endpoint
router.delete('/:postId', authenticateUser, async (req, res) => {
    const { postId } = req.params;
    const { image_url } = req.body;

    try {
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);

        if (error) {
            return res.status(500).send('Error deleting post');
        }

        if (image_url) {
            const imagePath = image_url.split('/').pop();
            const { error: storageError } = await supabase
                .storage
                .from('post-images')
                .remove([imagePath]);

            if (storageError) {
                return res.status(500).send('Error deleting image');
            }
        }

        res.sendStatus(204);
    } catch (error) {
        res.status(500).send('Error deleting post');
    }
});

// Fetch post data
router.get('/:id', async (req, res) => {
    const postId = req.params.id;

    try {
        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (error) {
            return res.status(500).send('Error fetching post data');
        }

        res.json(post);
    } catch (error) {
        console.error('Error fetching post data:', error);
        res.status(500).send('Error fetching post data');
    }
});

// Update a post
router.post('/:id/edit', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { title, caption } = req.body;
    let image_url = req.body.image_url;

    if (req.file) {
        // Delete the old image if a new one is uploaded
        if (image_url) {
            await deleteImage(image_url);
        }
        // Upload new image
        const { path, error } = await uploadImage(req.file);
        if (error) {
            return res.status(500).json({ message: 'Error uploading image' });
        }
        image_url = path;
    }

    const { data, error } = await supabase
        .from('posts')
        .update({ title, caption, image: image_url })
        .eq('id', id);

    if (error) {
        return res.status(500).json({ message: 'Error updating post' });
    }

    res.json(data);
});

// Fetch posts endpoint
router.get('/', async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select('id, title, caption, user_id, created_at, category, theme, rooms, room_category, image')
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) {
            return res.status(500).send('Error fetching posts');
        }

        const userIds = posts.map(post => post.user_id);
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, username, pfp')
            .in('id', userIds);

        if (userError) {
            return res.status(500).send('Error fetching users');
        }

        const postsWithUsernames = posts.map(post => {
            const user = users.find(user => user.id === post.user_id);
            return { 
                ...post, 
                username: user ? user.username : 'Unknown', 
                profile_pic: user ? user.pfp : 'default-profile.png' 
            };
        });

        console.log(postsWithUsernames); // Log the fetched data for debugging

        res.json(postsWithUsernames);
    } catch (error) {
        res.status(500).send('Error fetching posts');
    }
});

router.get("/user-profile", async (req, res) => {
    const userId = req.query.id;

    try {
        const { data, error } = await supabase
            .from("users")
            .select("username, pfp")
            .eq("id", userId)
            .single();

        if (error) {
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).send("Error fetching user profile");
    }
});

module.exports = router;
