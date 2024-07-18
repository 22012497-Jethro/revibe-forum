document.addEventListener('DOMContentLoaded', () => {
    // Fetch user profile data
    async function fetchAndDisplayUserData() {
        try {
            const response = await fetch('/users/user-profile');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            console.log('Fetched user data:', data); // Debugging line
            if (data) {
                document.getElementById('profile-username').textContent = data.username;
                document.getElementById('profile-pic').src = data.pfp || 'default-profile.png';
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    }

    // Theme switch functions
    function applyTheme(theme) {
        document.body.className = theme;
        const logo = document.getElementById('nav-logo');
        logo.src = theme === 'dark-mode' ? 'logo-light.png' : 'logo-dark.png';
        localStorage.setItem('theme', theme);
    }

    function setupThemeSwitch() {
        const themeSwitch = document.getElementById('theme-switch');
        const savedTheme = localStorage.getItem('theme') || 'light-mode';
        applyTheme(savedTheme);

        themeSwitch.addEventListener('click', () => {
            const newTheme = document.body.classList.contains('light-mode') ? 'dark-mode' : 'light-mode';
            applyTheme(newTheme);
        });
    }

    let currentPage = 1;
    const postsPerPage = 10;

    async function fetchAndDisplayPosts(page) {
        try {
            const response = await fetch(`/posts?page=${page}&limit=${postsPerPage}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const posts = await response.json();
            displayPosts(posts);
            setupPagination(page);
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    }

    function displayPosts(posts) {
        const postsContainer = document.getElementById('posts-container');
        postsContainer.innerHTML = '';
    
        posts.forEach(post => {
            console.log(post); // Log each post for debugging
            const postElement = document.createElement('div');
            postElement.classList.add('post');
            postElement.innerHTML = `
                <div class="post-header">
                    <img src="${post.profile_pic || 'default-profile.png'}" alt="Creator's Profile Picture" class="creator-pfp">
                    <span class="post-username">${post.username}</span>
                </div>
                <div class="post-details">
                    <h3 class="post-title"><strong>${post.title}</strong></h3>
                    ${post.image ? `<img src="${post.image}" alt="Post Image" class="post-image">` : ''}
                    <p>${post.caption}</p>
                </div>
            `;
            postsContainer.appendChild(postElement);
        });
    }

    function setupPagination(currentPage) {
        const paginationContainer = document.getElementById('pagination-container');
        paginationContainer.innerHTML = '';

        for (let i = 1; i <= 10; i++) { // Adjust the total number of pages as needed
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) {
                pageButton.disabled = true;
            }
            pageButton.onclick = () => fetchAndDisplayPosts(i);
            paginationContainer.appendChild(pageButton);
        }
    }

    fetchAndDisplayUserData();
    setupThemeSwitch();
    fetchAndDisplayPosts(currentPage);
});
