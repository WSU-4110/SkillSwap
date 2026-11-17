
"use strict";

const API_URL = "http://localhost:3000";

// =========================
// NFR-5: ERROR HANDLING
// =========================

function showBrowseError(status, message) {
    status.textContent = message;
    status.setAttribute("role", "alert");
    status.style.color = "#991b1b";
}

function showBrowseStatus(status, message) {
    status.textContent = message;
    status.setAttribute("role", "status");
    status.style.color = "";
}

function getBrowseErrorMessage(error, action) {
    if (error instanceof TypeError) {
        return (
            "Unable to connect to SkillSwap. " +
            "Please check your connection and try again."
        );
    }

    return (
        "Could not " + action +
        ". Please try again later."
    );
}

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

    if (
        Array.isArray(user.matchingSkills) &&
        user.matchingSkills.length
    ) {
        const skills = document.createElement("p");
        skills.textContent =
            "Matching skills: " + user.matchingSkills.join(", ");

        card.appendChild(skills);
    }

    const link = document.createElement("a");
    link.href =
        "user-profile.html?id=" + encodeURIComponent(user.id);

    link.textContent = "View Profile";
    card.appendChild(link);

    return card;
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

    const loadingIndicator =
        document.getElementById(loadingId);

    list.replaceChildren();
    showBrowseStatus(status, "");

    if (loadingIndicator) {
        loadingIndicator.hidden = false;
    }

    try {
        const response = await fetch(
            API_URL + endpoint,
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        if (response.status === 401) {
            window.location.replace("login.html");
            return;
        }

        if (!response.ok) {
            throw new Error(
                "Student request failed: " + response.status
            );
        }

        const data = await response.json();

        if (!Array.isArray(data.users)) {
            throw new Error("Unexpected student response.");
        }

        data.users.forEach(function(user) {
            list.appendChild(createStudentCard(user));
        });

        if (data.users.length === 0) {
            showBrowseStatus(
                status,
                data.message || emptyMessage
            );
        } else {
            showBrowseStatus(status, "");
        }

    } catch (error) {
        console.error("Student loading error:", error);

        list.replaceChildren();

        showBrowseError(
            status,
            getBrowseErrorMessage(error, "load students")
        );

    } finally {
        // NFR-5: Always hide the loading indicator.
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

const searchForm =
    document.getElementById("search-form");

const skillSearch =
    document.getElementById("skill-search");

const searchResults =
    document.getElementById("search-results");

const searchStatus =
    document.getElementById("search-status");

searchForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const skill = skillSearch.value.trim();

    if (!skill) {
        showBrowseError(
            searchStatus,
            "Please enter a skill before searching."
        );
        return;
    }

    searchResults.replaceChildren();

    showBrowseStatus(
        searchStatus,
        "Searching students..."
    );

    try {
        const response = await fetch(
            API_URL + "/api/users/search?skill=" +
                encodeURIComponent(skill),
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        if (response.status === 401) {
            window.location.replace("login.html");
            return;
        }

        if (!response.ok) {
            throw new Error(
                "Search request failed: " + response.status
            );
        }

        const data = await response.json();

        if (!Array.isArray(data.users)) {
            throw new Error("Unexpected search response.");
        }

        data.users.forEach(function(user) {
            searchResults.appendChild(
                createStudentCard(user)
            );
        });

        if (data.users.length === 0) {
            showBrowseStatus(
                searchStatus,
                data.message || "No students found."
            );
        } else {
            showBrowseStatus(
                searchStatus,
                data.users.length + " student(s) found."
            );
        }

    } catch (error) {
        console.error("Student search error:", error);

        searchResults.replaceChildren();

        showBrowseError(
            searchStatus,
            getBrowseErrorMessage(error, "search students")
        );
    }
});

/* FR-17 Search Students */
