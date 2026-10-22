"use strict";

async function loadUserProfile() {
    const status = document.getElementById("user-profile-status");
    const content = document.getElementById("user-profile-content");
    const messageButton = document.getElementById("message-user-button");

    const params = new URLSearchParams(window.location.search);
    const userId = params.get("id");

    content.hidden = true;
    messageButton.hidden = true;

    if (!userId || !/^[1-9]\d*$/.test(userId)) {
        status.textContent = "Invalid student profile.";
        return;
    }

    status.textContent = "Loading profile...";

    try {
        const response = await fetch(
            "http://localhost:3000/api/users/" +
                encodeURIComponent(userId) +
                "/profile",
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (response.status === 404) {
            status.textContent = "This user's profile could not be found.";
            return;
        }

        if (!response.ok) {
            throw new Error("Could not load profile.");
        }

        const data = await response.json();
        const user = data.profile;

        if (!user || typeof user.name !== "string") {
            throw new Error("Unexpected profile response.");
        }

        document.getElementById("user-name").textContent = user.name;
        document.getElementById("user-bio").textContent =
            user.bio || "No bio provided.";

       const major = document.getElementById("user-major");
major.textContent = user.major || "Major not provided.";
major.hidden = false;

function displaySkills(listId, skills) {
    const list = document.getElementById(listId);
    list.replaceChildren();

    const names = Array.isArray(skills) && skills.length > 0
        ? skills
        : ["No skills added yet."];

    names.forEach(function (name) {
        const item = document.createElement("li");
        item.textContent = name;
        list.appendChild(item);
    });
}

displaySkills("user-teach-skills", user.teachSkills);
displaySkills("user-learn-skills", user.learnSkills);
document.querySelector(".profile-skills").hidden = false;

        document.title = user.name + " - SkillSwap";
        status.textContent = "";
        content.hidden = false;
    } catch (error) {
        status.textContent =
            "Could not load this profile. Please try refreshing.";
    }
}

loadUserProfile();