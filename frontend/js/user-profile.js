"use strict";

// Temporary sample data for testing the frontend.
const sampleUsers = [
    {
        id: "1",
        name: "Student One",
        major: "Computer Science",
        bio: "I enjoy coding and helping others learn.",
        teachSkills: ["Python", "HTML"],
        learnSkills: ["Drawing"]
    },
    {
        id: "2",
        name: "Student Two",
        major: "Art",
        bio: "I enjoy drawing and want to learn programming.",
        teachSkills: ["Drawing"],
        learnSkills: ["Python"]
    }
];

function displayUserSkills(listId, skills) {
    const list = document.getElementById(listId);
    list.replaceChildren();

    const items = Array.isArray(skills) && skills.length > 0
        ? skills
        : ["No skills added yet."];

    items.forEach(function (skill) {
        const item = document.createElement("li");
        item.textContent = skill;
        list.appendChild(item);
    });
}

function loadUserProfile() {
    const status = document.getElementById("user-profile-status");
    const content = document.getElementById("user-profile-content");

    const params = new URLSearchParams(window.location.search);
    const userId = params.get("id");

    const user = sampleUsers.find(function (student) {
        return student.id === userId;
    });

    if (!user) {
        content.hidden = true;
        status.textContent = "This user's profile could not be found.";
        return;
    }

    document.getElementById("user-name").textContent = user.name;
    document.getElementById("user-major").textContent =
        user.major || "Major not provided.";
    document.getElementById("user-bio").textContent =
        user.bio || "No bio provided.";

    displayUserSkills("user-teach-skills", user.teachSkills);
    displayUserSkills("user-learn-skills", user.learnSkills);


    // Temporary accepted request for frontend testing only.
    const acceptedUserIds = ["1"];

    const messageButton = document.getElementById("message-user-button");

    if (acceptedUserIds.includes(user.id)) {
        messageButton.href = "messages.html?id=" + encodeURIComponent(user.id);
        messageButton.hidden = false;
    } else {
        messageButton.hidden = true;
    }

    document.title = user.name + " - SkillSwap";
    status.textContent = "";
    content.hidden = false;
    }

loadUserProfile();