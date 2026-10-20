const API_URL = "http://localhost:3000";

// =========================
// DISPLAY SKILLS
// =========================

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

        item.textContent =
            typeof skill === "string" ? skill : skill.name;

        list.appendChild(item);
    });
}


// =========================
// PROFILE PAGE
// =========================

async function loadProfilePage() {
    const profileName = document.getElementById("profile-name");

    if (!profileName) {
        return;
    }

    try {
        // Load logged-in user's profile
        const profileResponse = await fetch(
            `${API_URL}/api/profile`,
            {
                credentials: "include"
            }
        );

        if (profileResponse.status === 401) {
            window.location.href = "login.html";
            return;
        }

        const profileData = await profileResponse.json();

        if (!profileResponse.ok) {
            throw new Error(
                profileData.message || "Could not load profile."
            );
        }

        const profile = profileData.profile;

        document.getElementById("profile-name").textContent =
            profile.name || "";

        document.getElementById("profile-major").textContent =
            profile.major || "";

        document.getElementById("profile-bio").textContent =
            profile.bio || "";


        // =========================
        // LOAD TEACHING SKILLS
        // =========================

        const teachResponse = await fetch(
            `${API_URL}/api/skills/teach`,
            {
                credentials: "include"
            }
        );

        if (teachResponse.ok) {
            const teachData = await teachResponse.json();

            displaySkills(
                "teach-skills",
                teachData.skills || []
            );
        } else {
            displaySkills("teach-skills", []);
        }


        // =========================
        // LOAD LEARNING SKILLS
        // =========================

        const learnResponse = await fetch(
            `${API_URL}/api/skills/learn`,
            {
                credentials: "include"
            }
        );

        if (learnResponse.ok) {
            const learnData = await learnResponse.json();

            displaySkills(
                "learn-skills",
                learnData.skills || []
            );
        } else {
            displaySkills("learn-skills", []);
        }

    } catch (error) {
        console.error(error);

        document.getElementById("profile-name").textContent =
            "Could not load profile.";
    }
}


// =========================
// EDIT PROFILE PAGE
// =========================

async function setupEditProfilePage() {
    const editForm =
        document.getElementById("edit-profile-form");

    if (!editForm) {
        return;
    }

    const nameInput = document.getElementById("name");
    const majorInput = document.getElementById("major");
    const bioInput = document.getElementById("bio");
    const message = document.getElementById("profile-message");

    let teachSkills = [];
    let learnSkills = [];


    // =========================
    // LOAD CURRENT USER
    // =========================

    try {
        const response = await fetch(
            `${API_URL}/api/profile`,
            {
                credentials: "include"
            }
        );

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Could not load profile."
            );
        }

        const profile = data.profile;

        nameInput.value = profile.name || "";
        majorInput.value = profile.major || "";
        bioInput.value = profile.bio || "";

    } catch (error) {
        console.error(error);

        message.textContent =
            "Could not load your profile.";

        message.style.color = "red";
    }


    // =========================
    // SHOW EDITABLE SKILLS
    // =========================

    function updateSkills(listId, skills) {
        const list = document.getElementById(listId);

        if (!list) {
            return;
        }

        list.innerHTML = "";

        if (!skills || skills.length === 0) {
            return;
        }

        skills.forEach(function(skill) {
            const item = document.createElement("li");

            const skillName =
                typeof skill === "string"
                    ? skill
                    : skill.name;

            item.textContent = skillName;

            list.appendChild(item);
        });
    }


    // =========================
    // LOAD TEACHING SKILLS
    // =========================

    try {
        const response = await fetch(
            `${API_URL}/api/skills/teach`,
            {
                credentials: "include"
            }
        );

        if (response.ok) {
            const data = await response.json();

            teachSkills = data.skills || [];

            updateSkills(
                "teach-list",
                teachSkills
            );
        }

    } catch (error) {
        console.error(
            "Could not load teaching skills:",
            error
        );
    }


    // =========================
    // LOAD LEARNING SKILLS
    // =========================

    try {
        const response = await fetch(
            `${API_URL}/api/skills/learn`,
            {
                credentials: "include"
            }
        );

        if (response.ok) {
            const data = await response.json();

            learnSkills = data.skills || [];

            updateSkills(
                "learn-list",
                learnSkills
            );
        }

    } catch (error) {
        console.error(
            "Could not load learning skills:",
            error
        );
    }


    // =========================
    // ADD TEACHING SKILL
    // =========================

    const addTeachButton =
        document.getElementById("add-teach");

    if (addTeachButton) {
        addTeachButton.addEventListener(
            "click",
            async function() {
                const input =
                    document.getElementById("teach-input");

                const skill = input.value.trim();

                if (skill === "") {
                    message.textContent =
                        "Please enter a skill.";

                    message.style.color = "red";
                    return;
                }

                try {
                    const response = await fetch(
                        `${API_URL}/api/skills/teach`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            credentials: "include",
                            body: JSON.stringify({
                                name: skill
                            })
                        }
                    );

                    const data = await response.json();

                    if (!response.ok) {
                        message.textContent =
                            data.message ||
                            "Could not add skill.";

                        message.style.color = "red";
                        return;
                    }

                    teachSkills.push(data.skill);

                    updateSkills(
                        "teach-list",
                        teachSkills
                    );

                    input.value = "";

                    message.textContent =
                        "Teaching skill added successfully!";

                    message.style.color = "green";

                } catch (error) {
                    console.error(error);

                    message.textContent =
                        "Could not connect to the server.";

                    message.style.color = "red";
                }
            }
        );
    }


    // =========================
    // ADD LEARNING SKILL
    // =========================

    const addLearnButton =
        document.getElementById("add-learn");

    if (addLearnButton) {
        addLearnButton.addEventListener(
            "click",
            async function() {
                const input =
                    document.getElementById("learn-input");

                const skill = input.value.trim();

                if (skill === "") {
                    message.textContent =
                        "Please enter a skill.";

                    message.style.color = "red";
                    return;
                }

                try {
                    const response = await fetch(
                        `${API_URL}/api/skills/learn`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            credentials: "include",
                            body: JSON.stringify({
                                name: skill
                            })
                        }
                    );

                    const data = await response.json();

                    if (!response.ok) {
                        message.textContent =
                            data.message ||
                            "Could not add skill.";

                        message.style.color = "red";
                        return;
                    }

                    learnSkills.push(data.skill);

                    updateSkills(
                        "learn-list",
                        learnSkills
                    );

                    input.value = "";

                    message.textContent =
                        "Learning skill added successfully!";

                    message.style.color = "green";

                } catch (error) {
                    console.error(error);

                    message.textContent =
                        "Could not connect to the server.";

                    message.style.color = "red";
                }
            }
        );
    }


    // =========================
    // SAVE PROFILE
    // =========================

    editForm.addEventListener(
        "submit",
        async function(event) {
            event.preventDefault();

            const name = nameInput.value.trim();
            const major = majorInput.value.trim();
            const bio = bioInput.value.trim();

            if (name === "") {
                message.textContent =
                    "Please enter your full name.";

                message.style.color = "red";
                return;
            }

            try {
                const formData = new FormData();

                formData.append("name", name);
                formData.append("major", major);
                formData.append("bio", bio);

                const imageInput =
                    document.querySelector(
                        'input[type="file"]'
                    );

                if (
                    imageInput &&
                    imageInput.files &&
                    imageInput.files[0]
                ) {
                    formData.append(
                        "image",
                        imageInput.files[0]
                    );
                }

                const response = await fetch(
                    `${API_URL}/api/profile`,
                    {
                        method: "PUT",
                        credentials: "include",
                        body: formData
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    message.textContent =
                        data.message ||
                        "Profile could not be saved.";

                    message.style.color = "red";
                    return;
                }

                message.textContent =
                    "Profile saved successfully!";

                message.style.color = "green";

                window.location.href =
                    "profile.html";

            } catch (error) {
                console.error(error);

                message.textContent =
                    "Could not connect to the server.";

                message.style.color = "red";
            }
        }
    );
}


// =========================
// START
// =========================

loadProfilePage();
setupEditProfilePage();