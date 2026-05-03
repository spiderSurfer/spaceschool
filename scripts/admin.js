import { db, getAnalyticsData } from './auth.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const adminCode = 'Admin321';

// --- Helper: Check Admin Status ---
function checkAdminSession() {
  return localStorage.getItem('isAdmin') === 'true';
}

// Add a logout function for convenience
export function logoutAdmin() {
  localStorage.setItem('isAdmin', 'false');
  location.reload(); // Refresh to clear everything
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
      if (window.UI) window.UI.showToast('Add Content feature coming soon!', 'info');
    });
  }

  const editContentBtn = document.getElementById('editContentBtn');
  if (editContentBtn) {
    editContentBtn.addEventListener('click', () => {
      if (window.UI) window.UI.showToast('Edit Content feature coming soon!', 'info');
    });
  }

  const deleteContentBtn = document.getElementById('deleteContentBtn');
  if (deleteContentBtn) {
    deleteContentBtn.addEventListener('click', () => {
      if (window.UI) window.UI.showToast('Delete Content feature coming soon!', 'info');
    });
  }

  const manageUsersBtn = document.getElementById('manageUsersBtn');
  if (manageUsersBtn) {
    manageUsersBtn.addEventListener('click', () => {
      if (window.UI) window.UI.showToast('Manage Users feature coming soon!', 'info');
    });
  }

  const viewAnalyticsBtn = document.getElementById('viewAnalyticsBtn');
  if (viewAnalyticsBtn) {
    viewAnalyticsBtn.addEventListener('click', () => {
      if (window.UI) window.UI.showToast('View Analytics feature coming soon!', 'info');
    });
  }

  const siteSettingsBtn = document.getElementById('siteSettingsBtn');
  if (siteSettingsBtn) {
    siteSettingsBtn.addEventListener('click', () => {
      if (window.UI) window.UI.showToast('Site Settings feature coming soon!', 'info');
    });
  }
}
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
function showAddPostModal() {
  const modal = document.createElement('div');
  modal.className = 'admin-modal-overlay';

  modal.innerHTML = `
    <div class="admin-modal-content">
      <h3>Add New Post</h3>
      <form id="addPostForm">
        <div class="form-group">
          <label for="postTitle">Title:</label>
          <input type="text" id="postTitle" placeholder="Post Title" required>
        </div>
        <div class="form-group">
          <label for="postCategory">Category:</label>
          <select id="postCategory">
            <option value="astronomy">Astronomy</option>
            <option value="space">Space Exploration</option>
            <option value="science">Science</option>
            <option value="news">News</option>
          </select>
        </div>
        <div class="form-group">
          <label for="postContent">Content:</label>
          <textarea id="postContent" rows="6" placeholder="Write something amazing..." required></textarea>
        </div>
        <div class="form-actions">
          <button type="button" id="cancelPost" class="btn-ghost">Cancel</button>
          <button type="submit" class="btn-primary">Add Post</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle form submission
  const form = modal.querySelector('#addPostForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('postTitle').value;
    const category = document.getElementById('postCategory').value;
    const content = document.getElementById('postContent').value;

    try {
      await addDoc(collection(db, "posts"), {
        title,
        category,
        content,
        createdAt: serverTimestamp(),
        author: 'Admin'
      });

      // Save to localStorage too
      const localPosts = JSON.parse(localStorage.getItem('cachedPosts') || '[]');
      localPosts.unshift({
          title,
          category,
          content,
          author: 'Admin',
          id: 'temp-' + Date.now()
      });
      localStorage.setItem('cachedPosts', JSON.stringify(localPosts));

      alert('Post added successfully!');
      document.body.removeChild(modal);
      displayPosts(); // Refresh the feed
    } catch (error) {
      console.error("Error adding post: ", error);
      alert("Failed to save post to database.");
    }
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

// Attached to window so the HTML 'onclick' attribute can find it
window.deletePost = async function(id) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
        await deleteDoc(doc(db, "posts", id));
        
        // Remove from localStorage
        let localPosts = JSON.parse(localStorage.getItem('cachedPosts') || '[]');
        localPosts = localPosts.filter(p => p.id !== id);
        localStorage.setItem('cachedPosts', JSON.stringify(localPosts));

        displayPosts();
    } catch (error) {
        console.error("Error deleting post: ", error);
    }
}

function renderPostElements(posts, container) {
    container.innerHTML = '';
    posts.forEach((post) => {
        const postElement = document.createElement('div');
        postElement.classList.add('post-card');
        postElement.innerHTML = `
            <div class="post-category">${post.category || 'General'}</div>
            <h3>${post.title}</h3>
            <p>${post.content}</p>
            <div class="post-footer">
                <button class="btn-delete" onclick="deletePost('${post.id}')">Delete</button>
            </div>
        `;
        container.appendChild(postElement);
    });
}

export async function displayPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    // 1. Load from localStorage for instant display
    const cached = JSON.parse(localStorage.getItem('cachedPosts') || '[]');
    if (cached.length > 0) renderPostElements(cached, container);
    
    try {
        // 2. Fetch fresh data from Firebase
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const freshPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. Update localStorage and Re-render with latest data
        localStorage.setItem('cachedPosts', JSON.stringify(freshPosts));
        renderPostElements(freshPosts, container);
    } catch (error) {
        console.error("Error fetching posts: ", error);
    }
}

export function initAdmin() {
  const adminTools = document.getElementById('admintools');
  const checker = document.getElementById('AdminChecker');
  
  // 1. Auto-Check: If already logged in, render tools immediately
  if (checkAdminSession()) {
    renderAdminTools(adminTools);
    if (checker) checker.style.display = 'none'; // Hide input if already admin
  }

  // 2. Password Entry: Only run if checker exists
  if (!checker) return;

  checker.addEventListener('input', () => {
    if (checker.value === adminCode) {
      localStorage.setItem('isAdmin', 'true'); // Save session
      alert('Admin access granted!');
      renderAdminTools(adminTools);
      checker.style.display = 'none'; // Hide input after success
    }
  });
}
