
// 1. Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


// 2. Firebase configuration
// Keep your actual values from your Firebase project.
const firebaseConfig = {
    apiKey:  "AIzaSyBj60A84QzRKiQSjrxO5bJUy3Tcgk0CMd4",
    authDomain: "smart-productivity-manag-34036.firebaseapp.com",
    projectId: "smart-productivity-manag-34036",
    storageBucket: "smart-productivity-manag-34036.firebasestorage.app",
    messagingSenderId: "206535376101",
    appId: "1:206535376101:web:94a8d3e240c53255c9a80c",
    measurementId: "G-TCDX2QVSS6"
};


// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// 4. Get HTML elements
const authSection = document.getElementById("authSection");
const dashboard = document.getElementById("dashboard");

const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authMessage = document.getElementById("authMessage");
const authSubmit = document.getElementById("authSubmit");
const authError = document.getElementById("authError");
const switchAuth = document.getElementById("switchAuth");
const switchLabel = document.getElementById("switchLabel");

const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");

const taskForm = document.getElementById("taskForm");
const taskFormTitle = document.getElementById("taskFormTitle");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const category = document.getElementById("category");
const priority = document.getElementById("priority");
const dueDate = document.getElementById("dueDate");
const saveTaskBtn = document.getElementById("saveTaskBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const taskMessage = document.getElementById("taskMessage");

const taskList = document.getElementById("taskList");
const emptyMessage = document.getElementById("emptyMessage");
const searchInput = document.getElementById("searchInput");

const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const completedCount = document.getElementById("completedCount");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

const themeBtn = document.getElementById("themeBtn");


// 5. App variables
let isLogin = false;
let currentUser = null;
let tasks = [];
let currentFilter = "All";
let editingTaskId = null;


// 6. Authentication: switch between signup and login
switchAuth.addEventListener("click", () => {
    isLogin = !isLogin;

    authTitle.textContent = isLogin ? "Login" : "Create Account";
    authMessage.textContent = isLogin
        ? "Welcome back!"
        : "Sign up to manage your tasks.";

    authSubmit.textContent = isLogin ? "Login" : "Sign Up";
    switchLabel.textContent = isLogin
        ? "Don't have an account?"
        : "Already have an account?";

    switchAuth.textContent = isLogin ? "Sign Up" : "Login";
    authError.textContent = "";
});


// 7. Signup and login
authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    authError.textContent = "";

    try {
        if (isLogin) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }

        authForm.reset();

    } catch (error) {
        authError.textContent = error.message;
    }
});


// 8. Logout
logoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
        resetTaskForm();
    } catch (error) {
        alert(error.message);
    }
});


// 9. Firebase authentication state
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (user) {
        authSection.hidden = true;
        dashboard.hidden = false;
        userEmail.textContent = user.email;

        await loadTasks();
    } else {
        authSection.hidden = false;
        dashboard.hidden = true;
        tasks = [];
        taskList.replaceChildren();
        updateDashboard();
    }
});


// 10. Get the current user's task collection
function getTasksCollection() {
    return collection(db, "users", currentUser.uid, "tasks");
}


// 11. Load tasks from Firestore
async function loadTasks() {
    if (!currentUser) return;

    try {
        const snapshot = await getDocs(getTasksCollection());

        tasks = snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data()
        }));

        renderTasks();
        updateDashboard();

    } catch (error) {
        taskMessage.textContent = "Could not load tasks: " + error.message;
    }
}


// 12. Add or update a task
taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) return;

    const taskData = {
        title: taskTitle.value.trim(),
        description: taskDescription.value.trim(),
        category: category.value,
        priority: priority.value,
        dueDate: dueDate.value,
        completed: false,
        updatedAt: new Date().toISOString()
    };

    if (!taskData.title) {
        taskMessage.textContent = "Please enter a task name.";
        return;
    }

    saveTaskBtn.disabled = true;
    taskMessage.textContent = "";

    try {
        if (editingTaskId) {
            const taskReference = doc(
                db, "users", currentUser.uid, "tasks", editingTaskId
            );

            // Keep the existing completion status when editing
            const existingTask = tasks.find(
                task => task.id === editingTaskId
            );

            taskData.completed = existingTask
                ? existingTask.completed
                : false;

            await updateDoc(taskReference, taskData);
            taskMessage.textContent = "Task updated successfully!";
        } else {
            taskData.createdAt = new Date().toISOString();

            await addDoc(getTasksCollection(), taskData);
            taskMessage.textContent = "Task added successfully!";
        }

        resetTaskForm();
        await loadTasks();

    } catch (error) {
        taskMessage.textContent = "Error: " + error.message;
    } finally {
        saveTaskBtn.disabled = false;
    }
});


// 13. Clear task form
function resetTaskForm() {
    taskForm.reset();
    editingTaskId = null;

    taskFormTitle.textContent = "Add New Task";
    saveTaskBtn.textContent = "Add Task";
    cancelEditBtn.hidden = true;
}


// 14. Cancel editing
cancelEditBtn.addEventListener("click", () => {
    resetTaskForm();
    taskMessage.textContent = "";
});


// 15. Edit task
function editTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    editingTaskId = id;

    taskTitle.value = task.title;
    taskDescription.value = task.description || "";
    category.value = task.category || "Study";
    priority.value = task.priority || "Medium";
    dueDate.value = task.dueDate || "";

    taskFormTitle.textContent = "Edit Task";
    saveTaskBtn.textContent = "Update Task";
    cancelEditBtn.hidden = false;

    taskFormTitle.scrollIntoView({ behavior: "smooth" });
}


// 16. Mark task as completed or pending
async function toggleTask(id) {
    if (!currentUser) return;

    const task = tasks.find(item => item.id === id);
    if (!task) return;

    try {
        const taskReference = doc(
            db, "users", currentUser.uid, "tasks", id
        );

        await updateDoc(taskReference, {
            completed: !task.completed,
            updatedAt: new Date().toISOString()
        });

        await loadTasks();

    } catch (error) {
        alert("Could not update task: " + error.message);
    }
}


// 17. Delete task
async function removeTask(id) {
    if (!currentUser) return;

    const confirmDelete = confirm("Are you sure you want to delete this task?");

    if (!confirmDelete) return;

    try {
        const taskReference = doc(
            db, "users", currentUser.uid, "tasks", id
        );

        await deleteDoc(taskReference);

        if (editingTaskId === id) {
            resetTaskForm();
        }

        await loadTasks();

    } catch (error) {
        alert("Could not delete task: " + error.message);
    }
}


// 18. Display tasks
function renderTasks() {
    taskList.replaceChildren();

    const searchText = searchInput.value.toLowerCase().trim();

    const filteredTasks = tasks.filter((task) => {
        const matchesSearch =
            (task.title || "").toLowerCase().includes(searchText) ||
            (task.description || "").toLowerCase().includes(searchText);

        const matchesFilter =
            currentFilter === "All" ||
            (currentFilter === "Pending" && !task.completed) ||
            (currentFilter === "Completed" && task.completed);

        return matchesSearch && matchesFilter;
    });

    emptyMessage.hidden = filteredTasks.length !== 0;

    filteredTasks.forEach((task) => {
        const card = document.createElement("div");
        card.className = "task-card";

        if (task.completed) {
            card.classList.add("completed");
        }

        const title = document.createElement("h3");
        title.className = "task-title";
        title.textContent = task.title;

        const description = document.createElement("p");
        description.className = "task-description";
        description.textContent = task.description || "No description";

        const meta = document.createElement("div");
        meta.className = "task-meta";

        [task.category, task.priority,
            task.dueDate ? "Due: " + task.dueDate : "No due date"
        ].forEach((value) => {
            const tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = value;
            meta.appendChild(tag);
        });

        const status = document.createElement("p");
        status.textContent = task.completed ? "Completed" : "Pending";

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const completeButton = document.createElement("button");
        completeButton.type = "button";
        completeButton.textContent = task.completed
            ? "Mark Pending"
            : "Complete";
        completeButton.addEventListener("click", () => toggleTask(task.id));

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "edit-btn";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editTask(task.id));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => removeTask(task.id));

        actions.append(completeButton, editButton, deleteButton);
        card.append(title, description, meta, status, actions);
        taskList.appendChild(card);
    });

    updateDashboard();
}


// 19. Search tasks
searchInput.addEventListener("input", renderTasks);


// 20. Filter tasks
document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        document.querySelectorAll(".filter-btn").forEach((item) => {
            item.classList.remove("active");
        });

        button.classList.add("active");
        renderTasks();
    });
});


// 21. Update dashboard statistics
function updateDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    totalCount.textContent = total;
    pendingCount.textContent = pending;
    completedCount.textContent = completed;

    progressBar.style.width = percentage + "%";
    progressText.textContent = percentage + "% completed";
}


// 22. Dark mode
themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");

    themeBtn.textContent = isDark
        ? "☀️ Light Mode"
        : "🌙 Dark Mode";

    localStorage.setItem("theme", isDark ? "dark" : "light");
});


// 23. Remember theme preference
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    themeBtn.textContent = "☀️ Light Mode";
}
