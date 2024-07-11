const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const postsRouter = require('./routes/posts');
const usersRouter = require('./routes/users'); // Import the users router
const fetchUserData = require('./middleware/fetchUserData'); // Import the middleware

const app = express();
const port = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(fetchUserData); // Use the middleware

// Serve static files for the frontend
app.get("/", (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get("/signup", (req, res) => res.sendFile(path.join(__dirname, 'public/signup.html')));
app.get("/main", (req, res) => res.sendFile(path.join(__dirname, 'public/main.html')));
app.get("/post", (req, res) => res.sendFile(path.join(__dirname, 'public/post.html')));

// Use the posts and users routers
app.use('/posts', postsRouter);
app.use('/users', usersRouter); // Register the users router

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
