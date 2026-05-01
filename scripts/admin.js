const adminCode = 'Admin321';

function renderAdminTools(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="admin-tools">
      <h2>Admin Tools</h2>
      <button id="addContentBtn">Add Content</button>
      <button id="editContentBtn">Edit Content</button>
      <button id="deleteContentBtn">Delete Content</button>
      <button id="manageUsersBtn">Manage Users</button>
      <button id="viewAnalyticsBtn">View Analytics</button>
      <button id="siteSettingsBtn">Site Settings</button>
      <button id="lPostAdminBtn">Add Post</button>
    </div>
  `;

  // Add event listeners for admin tools
  setTimeout(() => {
    initAdminTools();
  }, 100);
}

function initAdminTools() {
  const addPostBtn = document.getElementById('lPostAdminBtn');
  if (addPostBtn) {
    addPostBtn.addEventListener('click', () => {
      showAddPostModal();
    });
  }

  // Add other button handlers as needed
  const addContentBtn = document.getElementById('addContentBtn');
  if (addContentBtn) {
    addContentBtn.addEventListener('click', () => {
      alert('Add Content feature coming soon!');
    });
  }

  const editContentBtn = document.getElementById('editContentBtn');
  if (editContentBtn) {
    editContentBtn.addEventListener('click', () => {
      alert('Edit Content feature coming soon!');
    });
  }

  const deleteContentBtn = document.getElementById('deleteContentBtn');
  if (deleteContentBtn) {
    deleteContentBtn.addEventListener('click', () => {
      alert('Delete Content feature coming soon!');
    });
  }

  const manageUsersBtn = document.getElementById('manageUsersBtn');
  if (manageUsersBtn) {
    manageUsersBtn.addEventListener('click', () => {
      alert('Manage Users feature coming soon!');
    });
  }

  const viewAnalyticsBtn = document.getElementById('viewAnalyticsBtn');
  if (viewAnalyticsBtn) {
    viewAnalyticsBtn.addEventListener('click', () => {
      alert('View Analytics feature coming soon!');
    });
  }

  const siteSettingsBtn = document.getElementById('siteSettingsBtn');
  if (siteSettingsBtn) {
    siteSettingsBtn.addEventListener('click', () => {
      alert('Site Settings feature coming soon!');
    });
  }
}

function showAddPostModal() {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="
      background: var(--card);
      padding: 20px;
      border-radius: var(--radius);
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    ">
      <h3>Add New Post</h3>
      <form id="addPostForm">
        <div style="margin-bottom: 15px;">
          <label for="postTitle" style="display: block; margin-bottom: 5px; color: var(--text);">Title:</label>
          <input type="text" id="postTitle" required style="
            width: 100%;
            padding: 8px;
            border: 1px solid var(--muted);
            border-radius: var(--radius);
            background: var(--bg);
            color: var(--text);
          ">
        </div>
        <div style="margin-bottom: 15px;">
          <label for="postCategory" style="display: block; margin-bottom: 5px; color: var(--text);">Category:</label>
          <select id="postCategory" style="
            width: 100%;
            padding: 8px;
            border: 1px solid var(--muted);
            border-radius: var(--radius);
            background: var(--bg);
            color: var(--text);
          ">
            <option value="astronomy">Astronomy</option>
            <option value="space">Space Exploration</option>
            <option value="science">Science</option>
            <option value="news">News</option>
          </select>
        </div>
        <div style="margin-bottom: 15px;">
          <label for="postContent" style="display: block; margin-bottom: 5px; color: var(--text);">Content:</label>
          <textarea id="postContent" rows="8" required style="
            width: 100%;
            padding: 8px;
            border: 1px solid var(--muted);
            border-radius: var(--radius);
            background: var(--bg);
            color: var(--text);
            resize: vertical;
          "></textarea>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" id="cancelPost" style="
            padding: 8px 16px;
            border: 1px solid var(--muted);
            border-radius: var(--radius);
            background: transparent;
            color: var(--text);
            cursor: pointer;
          ">Cancel</button>
          <button type="submit" style="
            padding: 8px 16px;
            border: none;
            border-radius: var(--radius);
            background: var(--accent);
            color: white;
            cursor: pointer;
          ">Add Post</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle form submission
  const form = modal.querySelector('#addPostForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('postTitle').value;
    const category = document.getElementById('postCategory').value;
    const content = document.getElementById('postContent').value;

    // Here you would typically send this data to a backend
    // For now, we'll just store it locally and show a success message
    const post = {
      id: Date.now(),
      title,
      category,
      content,
      date: new Date().toISOString(),
      author: 'Admin'
    };

    // Store in localStorage for demo purposes
    const posts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    posts.push(post);
    localStorage.setItem('adminPosts', JSON.stringify(posts));

    alert('Post added successfully!');
    document.body.removeChild(modal);
  });

  // Handle cancel
  const cancelBtn = modal.querySelector('#cancelPost');
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

//display posts function 
export function deletePost(index) {
    let posts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    posts.splice(index, 1); // Remove 1 item at the specific index
    localStorage.setItem('adminPosts', JSON.stringify(posts));
    displayPosts(); // Refresh the list
}

export function displayPosts() {
    // 1. Find the container
    const container = document.getElementById('posts-container');
    
    // 2. SAFETY CHECK: If container is null, just stop here
    if (!container) {
        return; 
    }
    
    // 3. Now you can safely set innerHTML
    const posts = JSON.parse(localStorage.getItem('adminPosts') || '[]');
    container.innerHTML = '';
    
    posts.forEach((post, index) => {
        const postElement = document.createElement('div');
        postElement.classList.add('post-card');
        
        postElement.innerHTML = `
            <h3>${post.title}</h3>
            <p>${post.content}</p>
            <button onclick="deletePost(${index})" style="background:red; color:white; border:none; padding:5px;">Delete</button>
        `;
        container.appendChild(postElement);
    });
}
export function initAdmin() {
  const checker = document.getElementById('AdminChecker');
  if (!checker) return;

  const adminTools = document.getElementById('admintools');
  let isAdmin = false;

  checker.addEventListener('input', () => {
    if (checker.value === adminCode && !isAdmin) {
      isAdmin = true;
      alert('Admin access granted!');
      renderAdminTools(adminTools);
    }
  });
}
