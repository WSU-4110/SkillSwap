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

