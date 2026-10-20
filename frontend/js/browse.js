"use strict";

// Temporary sample students for frontend testing.
const browseUsers = [
    {
        id: "1",
        name: "Student One",
        major: "Computer Science",
        teachSkills: ["Python", "HTML"],
        learnSkills: ["Drawing"]
    },
    {
        id: "2",
        name: "Student Two",
        major: "Art",
        teachSkills: ["Drawing"],
        learnSkills: ["Python"]
    }
];

function getCurrentProfile() {
    try {
        const saved = localStorage.getItem("skillswapProfile");
        return saved ? JSON.parse(saved) : null;
    } catch (error) {
        return null;
    }
}

function normalizeSkill(skill) {
    return skill.trim().toLowerCase();
}

function getMatchingSkills(user, learningSkills) {
    const wantedSkills = new Set(
        learningSkills
            .filter(function (skill) {
                return typeof skill === "string" && skill.trim() !== "";
            })
            .map(normalizeSkill)
    );

    return user.teachSkills.filter(function (skill) {
        return wantedSkills.has(normalizeSkill(skill));
    });
}

function createStudentCard(user, matchingSkills) {
    const card = document.createElement("article");
    card.className = "skills-box";
    card.style.marginBottom = "20px";

    const heading = document.createElement("h3");
    heading.textContent = user.name;

    const major = document.createElement("p");
    major.textContent = user.major || "Major not provided.";

    const teaching = document.createElement("p");
    teaching.textContent = "Can teach: " + user.teachSkills.join(", ");

    card.append(heading, major, teaching);

    if (matchingSkills.length > 0) {
        const match = document.createElement("p");
        match.textContent = "Matching skills: " + matchingSkills.join(", ");
        card.appendChild(match);
    }

    const link = document.createElement("a");
    link.href = "user-profile.html?id=" + encodeURIComponent(user.id);
    link.textContent = "View Profile";

    card.appendChild(link);

    return card;
}

function loadBrowsePage() {
    const allUsers = document.getElementById("all-users");
    const suggestedUsers = document.getElementById("suggested-users");
    const browseStatus = document.getElementById("browse-status");
    const suggestionsStatus = document.getElementById("suggestions-status");

    allUsers.replaceChildren();
    suggestedUsers.replaceChildren();

    const profile = getCurrentProfile();

    // Exclude the current user when profile IDs are available.
    const otherUsers = browseUsers.filter(function (user) {
        return !profile ||
            profile.id == null ||
            String(user.id) !== String(profile.id);
    });

    otherUsers.forEach(function (user) {
        allUsers.appendChild(createStudentCard(user, []));
    });

    browseStatus.textContent = otherUsers.length === 0
        ? "No students are available yet."
        : "";

    if (!profile) {
        suggestionsStatus.textContent =
            "Save your profile and add skills you want to learn to see suggestions.";
        return;
    }

    const learningSkills = Array.isArray(profile.learnSkills)
        ? profile.learnSkills
        : [];

    const hasLearningSkills = learningSkills.some(function (skill) {
        return typeof skill === "string" && skill.trim() !== "";
    });

    if (!hasLearningSkills) {
        suggestionsStatus.textContent =
            "Add skills you want to learn in My Profile to see suggestions.";
        return;
    }

    let suggestionCount = 0;

    otherUsers.forEach(function (user) {
        const matchingSkills = getMatchingSkills(user, learningSkills);

        if (matchingSkills.length > 0) {
            suggestedUsers.appendChild(
                createStudentCard(user, matchingSkills)
            );
            suggestionCount++;
        }
    });

    suggestionsStatus.textContent = suggestionCount === 0
        ? "No suggested students match your learning skills yet."
        : "";
}

loadBrowsePage();