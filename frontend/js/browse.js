"use strict";

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

async function loadStudents(endpoint, listId, statusId, emptyMessage) {
    const list = document.getElementById(listId);
    const status = document.getElementById(statusId);

    list.replaceChildren();
    status.textContent = "Loading students...";

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

        data.users.forEach(function (user) {
            list.appendChild(createStudentCard(user));
        });

        status.textContent = data.users.length === 0
            ? data.message || emptyMessage
            : "";
    } catch (error) {
        status.textContent =
            "Could not load students. Please try refreshing.";
    }
}

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

// FR-17: Search students by skill
const searchForm = document.getElementById("search-form");
const skillSearch = document.getElementById("skill-search");
const searchResults = document.getElementById("search-results");
const searchStatus = document.getElementById("search-status");

searchForm.addEventListener("submit", async function (event) {
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
            { credentials: "include", cache: "no-store" }
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

        data.users.forEach(function (user) {
            searchResults.appendChild(createStudentCard(user));
        });

        searchStatus.textContent = data.users.length === 0
            ? data.message || "No students found."
            : data.users.length + " student(s) found.";

    } catch (error) {
        searchStatus.textContent =
            "Could not search students. Please try again.";
    }
});

/* FR-17 Search Students */

#search-form {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 20px;
    margin-bottom: 20px;
    max-width: 650px;
}

#skill-search {
    flex: 1;
    min-width: 0;
    padding: 14px 18px;
    font-size: 16px;
    border: 2px solid #d9e5e1;
    border-radius: 10px;
    background-color: #ffffff;
    outline: none;
}

#skill-search:focus {
    border-color: #0c5449;
    box-shadow: 0 0 0 3px rgba(12, 84, 73, 0.12);
}

#search-form button {
    padding: 14px 28px;
    font-size: 16px;
    font-weight: 600;
    background-color: #ffcc33;
    color: #0c5449;
    border: none;
    border-radius: 10px;
    cursor: pointer;
}

#search-form button:hover {
    background-color: #f0bd20;
}

#search-status {
    color: #0c5449;
    font-size: 15px;
    margin-top: 12px;
}

@media (max-width: 500px) {
    #search-form {
        flex-direction: column;
        align-items: stretch;
    }

    #search-form button {
        width: 100%;
    }
}