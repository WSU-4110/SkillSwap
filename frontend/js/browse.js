
"use strict";

// =========================
// CREATE STUDENT CARD
// =========================

function createStudentCard(user) {
    const card = document.createElement("article");
    card.className = "skills-box";
    card.style.marginBottom = "20px";

    const heading = document.createElement("h3");
    heading.textContent = user.name;

    const major = document.createElement("p");
    major.textContent = user.major || "Major not provided.";

    card.append(heading, major);

    if (Array.isArray(user.matchingSkills) && user.matchingSkills.length) {
        const skills = document.createElement("p");
        skills.textContent =
            "Matching skills: " + user.matchingSkills.join(", ");
        card.appendChild(skills);
    }

    const link = document.createElement("a");
    link.href = "user-profile.html?id=" + encodeURIComponent(user.id);
    link.textContent = "View Profile";
    card.appendChild(link);

    return card;
}

// =========================
// NFR-5 TASK 3: EMPTY STATES
// =========================

function showEmptyState(container, title, description) {
    container.replaceChildren();

    const emptyBox = document.createElement("div");
    emptyBox.className = "skills-box";
    emptyBox.style.textAlign = "center";
    emptyBox.style.padding = "30px 20px";
    emptyBox.style.marginTop = "15px";
    emptyBox.style.border = "1px solid #bfdbfe";
    emptyBox.style.borderRadius = "12px";
    emptyBox.style.backgroundColor = "#eff6ff";

    const icon = document.createElement("div");
    icon.textContent = "🔎";
    icon.style.fontSize = "32px";
    icon.style.marginBottom = "10px";

    const heading = document.createElement("h3");
    heading.textContent = title;
    heading.style.color = "#1e40af";
    heading.style.marginBottom = "8px";

    const paragraph = document.createElement("p");
    paragraph.textContent = description;
    paragraph.style.color = "#475569";
    paragraph.style.margin = "0";

    emptyBox.append(icon, heading, paragraph);
    container.appendChild(emptyBox);
}

// =========================
// NFR-5: LOAD STUDENTS
// =========================

async function loadStudents(endpoint, listId, statusId, emptyMessage) {
    const list = document.getElementById(listId);
    const status = document.getElementById(statusId);

    const loadingId =
        listId === "suggested-users"
            ? "suggestions-loading"
            : "browse-loading";

    const loadingIndicator = document.getElementById(loadingId);

    list.replaceChildren();
    status.textContent = "";

    if (loadingIndicator) {
        loadingIndicator.hidden = false;
    }

    try {
        const response = await fetch(
            "http://localhost:3000" + endpoint,
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Could not load students.");
        }

        const data = await response.json();

        if (!Array.isArray(data.users)) {
            throw new Error("Unexpected response.");
        }

        if (data.users.length === 0) {
            if (listId === "suggested-users") {
                showEmptyState(
                    list,
                    "No matches yet!",
                    "Add more teaching and learning skills " +
                    "to your profile to discover students " +
                    "with similar interests."
                );
            } else {
                showEmptyState(
                    list,
                    "No students available yet",
                    "There are currently no other students " +
                    "to browse. Check back later!"
                );
            }

            status.textContent = "";
            return;
        }

        data.users.forEach(function(user) {
            list.appendChild(createStudentCard(user));
        });

        status.textContent = "";

    } catch (error) {
        console.error("Student loading error:", error);

        status.textContent =
            "Could not load students. Please try refreshing.";

    } finally {
        // Always remove spinner when loading finishes.
        if (loadingIndicator) {
            loadingIndicator.hidden = true;
        }
    }
}

// =========================
// INITIAL STUDENT LOADING
// =========================

loadStudents(
    "/api/matches",
    "suggested-users",
    "suggestions-status",
    "No matching students yet."
);

loadStudents(
    "/api/users",
    "all-users",
    "browse-status",
    "No other students are available yet."
);

// =========================
// FR-17: SEARCH STUDENTS
// =========================

const searchForm = document.getElementById("search-form");
const skillSearch = document.getElementById("skill-search");
const searchResults = document.getElementById("search-results");
const searchStatus = document.getElementById("search-status");

searchForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const skill = skillSearch.value.trim();

    if (!skill) {
        searchStatus.textContent = "Please enter a skill.";
        return;
    }

    searchResults.replaceChildren();
    searchStatus.textContent = "Searching students...";

    try {
        const response = await fetch(
            "http://localhost:3000/api/users/search?skill=" +
                encodeURIComponent(skill),
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Search failed.");
        }

        const data = await response.json();

        if (!Array.isArray(data.users)) {
            throw new Error("Unexpected response.");
        }

        if (data.users.length === 0) {
            showEmptyState(
                searchResults,
                "No students found",
                "We couldn't find anyone matching \"" +
                skill +
                "\". Try searching for a different skill!"
            );

            searchStatus.textContent = "";
            return;
        }

        data.users.forEach(function(user) {
            searchResults.appendChild(createStudentCard(user));
        });

        searchStatus.textContent =
            data.users.length + " student(s) found.";

    } catch (error) {
        console.error("Student search error:", error);

        searchStatus.textContent =
            "Could not search students. Please try again.";
    }
});

/* FR-17 Search Students */
