// Get saved profile
function getProfile() {
    const savedProfile = localStorage.getItem("skillswapProfile");

    if (savedProfile) {
        return JSON.parse(savedProfile);
    }

    return null;
}

// Display profile information
const profileName = document.getElementById("profile-name");

if (profileName) {
    const profile = getProfile();

    if (profile) {
        document.getElementById("profile-name").textContent = profile.name;
        document.getElementById("profile-major").textContent = profile.major;
        document.getElementById("profile-bio").textContent = profile.bio;

        displaySkills("teach-skills", profile.teachSkills);
        displaySkills("learn-skills", profile.learnSkills);
    }
}

// Display skills
function displaySkills(listId, skills) {
    const list = document.getElementById(listId);

    if (!list) {
        return;
    }

    list.innerHTML = "";

    if (!skills || skills.length === 0) {
        const item = document.createElement("li");
        item.textContent = "No skills added yet.";
        list.appendChild(item);
        return;
    }

    skills.forEach(function(skill) {
        const item = document.createElement("li");
        item.textContent = skill;
        list.appendChild(item);
    });
}

// Edit profile
const editForm = document.getElementById("edit-profile-form");

if (editForm) {
    const nameInput = document.getElementById("name");
    const majorInput = document.getElementById("major");
    const bioInput = document.getElementById("bio");
    const message = document.getElementById("profile-message");

    let teachSkills = [];
    let learnSkills = [];

    const savedProfile = getProfile();

    // Load existing information
    if (savedProfile) {
        nameInput.value = savedProfile.name || "";
        majorInput.value = savedProfile.major || "";
        bioInput.value = savedProfile.bio || "";

        teachSkills = [...(savedProfile.teachSkills || [])];
        learnSkills = [...(savedProfile.learnSkills || [])];
    }

    // Show skills on edit page
    function updateSkills(listId, skills) {
        const list = document.getElementById(listId);
        list.innerHTML = "";

        skills.forEach(function(skill, index) {
            const item = document.createElement("li");
            item.textContent = skill + " ";

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.textContent = "Remove";

            removeButton.addEventListener("click", function() {
                skills.splice(index, 1);
                updateSkills(listId, skills);
            });

            item.appendChild(removeButton);
            list.appendChild(item);
        });
    }

    updateSkills("teach-list", teachSkills);
    updateSkills("learn-list", learnSkills);

   // Add a teaching skill
document.getElementById("add-teach").addEventListener("click", function() {

    const input = document.getElementById("teach-input");
    const skill = input.value.trim();

    // Check if skill is empty
    if (skill === "") {
        message.textContent = "Please enter a skill.";
        message.style.color = "red";
        return;
    }

    // Check if skill already exists
    const skillExists = teachSkills.some(function(existingSkill) {
        return existingSkill.toLowerCase() === skill.toLowerCase();
    });

    if (skillExists) {
        message.textContent = "This skill is already in your teaching list.";
        message.style.color = "red";
        return;
    }

    // Add skill
    teachSkills.push(skill);

    input.value = "";

    updateSkills("teach-list", teachSkills);

    message.textContent = "Skill added successfully!";
    message.style.color = "green";

});

 // Add a learning skill
document.getElementById("add-learn").addEventListener("click", function() {

    const input = document.getElementById("learn-input");
    const skill = input.value.trim();

    // Check if skill is empty
    if (skill === "") {
        message.textContent = "Please enter a skill you want to learn.";
        message.style.color = "red";
        return;
    }

    // Check if skill already exists
    const skillExists = learnSkills.some(function(existingSkill) {
        return existingSkill.toLowerCase() === skill.toLowerCase();
    });

    if (skillExists) {
        message.textContent = "This skill is already in your learning list.";
        message.style.color = "red";
        return;
    }

    // Add skill
    learnSkills.push(skill);

    input.value = "";

    updateSkills("learn-list", learnSkills);

    message.textContent = "Learning skill added successfully!";
    message.style.color = "green";

});
    // Save changes
    editForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const name = nameInput.value.trim();
        const major = majorInput.value.trim();
        const bio = bioInput.value.trim();

        // Name is required
        if (name === "") {
            message.textContent = "Please enter your full name.";
            message.style.color = "red";
            return;
        }

        const profile = {
            name: name,
            major: major,
            bio: bio,
            teachSkills: teachSkills,
            learnSkills: learnSkills
        };

        try {
            localStorage.setItem("skillswapProfile", JSON.stringify(profile));

            message.textContent = "Profile saved successfully!";
            message.style.color = "green";

            window.location.href = "profile.html";
        } catch (error) {
            message.textContent = "Profile could not be saved.";
            message.style.color = "red";
        }
    });
}