
"use strict";

// Product
class StudentCard {
    create(user) {
        const card = document.createElement("article");
        card.className = "skills-box";
        card.style.marginBottom = "20px";

        const heading = document.createElement("h3");
        heading.textContent = user.name;

        const major = document.createElement("p");
        major.textContent = user.major || "Major not provided.";

        card.append(heading, major);

        const link = document.createElement("a");
        link.href = "user-profile.html?id=" + encodeURIComponent(user.id);
        link.textContent = "View Profile";
        card.appendChild(link);

        return card;
    }
}

// Concrete Product
class SuggestedStudentCard extends StudentCard {
    create(user) {
        const card = super.create(user);

        if (Array.isArray(user.matchingSkills) && user.matchingSkills.length) {
            const skills = document.createElement("p");
            skills.textContent =
                "Matching skills: " + user.matchingSkills.join(", ");

            card.insertBefore(skills, card.lastElementChild);
        }

        return card;
    }
}

// Creator
class StudentCardFactory {
    createCard(user) {
        return new StudentCard().create(user);
    }
}

// Concrete Creator
class SuggestedStudentCardFactory extends StudentCardFactory {
    createCard(user) {
        return new SuggestedStudentCard().create(user);
    }
}

const studentCardFactory = new StudentCardFactory();
const suggestedCardFactory = new SuggestedStudentCardFactory();

function createStudentCard(user) {
    if (Array.isArray(user.matchingSkills) && user.matchingSkills.length) {
        return suggestedCardFactory.createCard(user);
    }

    return studentCardFactory.createCard(user);
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


