document.addEventListener('DOMContentLoaded', (event) => {
    loadUserProfile();
    loadPosts();
});

function loadUserProfile() {
    fetch('/users/user-profile')
        .then(response => response.json())
        .then(user => {
            document.getElementById('profile-username').innerText = user.username;
            document.getElementById('profile-pic').src = user.pfp;
        })
        .catch(error => console.error('Error loading user profile:', error));
}

function loadPosts() {
    fetch('/posts')
        .then(response => response.json())
        .then(posts => {
            const postsContainer = document.getElementById('posts-container');
            postsContainer.innerHTML = ''; // Clear existing posts
            posts.forEach(post => {
                const postElement = document.createElement('div');
                postElement.classList.add('post');
                postElement.setAttribute('data-post-id', post.id);
                postElement.innerHTML = `
                    <h4 class="post-title"><a href="/post.html?post_id=${post.id}">${post.title}</a></h4>
                    <p class="post-content">${post.content}</p>
                `;
                postsContainer.appendChild(postElement);
            });
        })
        .catch(error => console.error('Error loading posts:', error));
}
