
const API_URL = "http://localhost:3000";

// =========================
// API REQUEST WITH TIMEOUT
// =========================

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 10000);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeout);
    }
}

// =========================
// DISPLAY SKILLS
// =========================

function displaySkills(listId, skills) {
    const list = document.getElementById(listId);

    if (!list) return;

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
    const profileName =
        document.getElementById("profile-name");

    if (!profileName) return;

    const loadingIndicator =
        document.getElementById("profile-loading");

    const profileContent =
        document.getElementById("profile-content");

    const loadingError =
        document.getElementById("profile-loading-error");

    if (loadingIndicator) loadingIndicator.hidden = false;
    if (profileContent) profileContent.hidden = true;
    if (loadingError) loadingError.hidden = true;

    try {
        const profileResponse = await fetchWithTimeout(
            `${API_URL}/api/profile`,
            { credentials: "include" }
        );

        if (profileResponse.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!profileResponse.ok) {
            throw new Error("Could not load profile.");
        }

        const profileData = await profileResponse.json();
        const profile = profileData.profile;

        if (!profile) {
            throw new Error("Profile data is missing.");
        }

        document.getElementById("profile-name").textContent =
            profile.name || "";

        document.getElementById("profile-major").textContent =
            profile.major || "";

        document.getElementById("profile-bio").textContent =
            profile.bio || "";

        // Profile picture
        const profileImage =
            document.getElementById("profile-image");

        if (profileImage && profile.profile_image) {
            try {
                const imageResponse = await fetchWithTimeout(
                    `${API_URL}/api/profile/image`,
                    { credentials: "include" }
                );

                if (!imageResponse.ok) {
                    throw new Error("Could not load picture.");
                }

                const imageBlob = await imageResponse.blob();
                const imageUrl = URL.createObjectURL(imageBlob);

                profileImage.onload = () => {
                    URL.revokeObjectURL(imageUrl);
                };

                profileImage.src = imageUrl;
                profileImage.hidden = false;

            } catch (error) {
                console.error(error);
                profileImage.hidden = true;
            }
        }

        // Teaching skills
        try {
            const teachResponse = await fetchWithTimeout(
                `${API_URL}/api/skills/teach`,
                { credentials: "include" }
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

        } catch (error) {
            console.error(error);
            displaySkills("teach-skills", []);
        }

        // Learning skills
        try {
            const learnResponse = await fetchWithTimeout(
                `${API_URL}/api/skills/learn`,
                { credentials: "include" }
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
            displaySkills("learn-skills", []);
        }

        if (profileContent) {
            profileContent.hidden = false;
        }

    } catch (error) {
        console.error(error);

        if (loadingError) {
            loadingError.hidden = false;
            loadingError.textContent =
                "Could not load your profile. Please try again.";
        }

    } finally {
        if (loadingIndicator) {
            loadingIndicator.hidden = true;
        }
    }
}

// =========================
// EDIT PROFILE PAGE
// =========================

async function setupEditProfilePage() {
    const editForm =
        document.getElementById("edit-profile-form");

    if (!editForm) return;

    const editLoading =
        document.getElementById("edit-profile-loading");

    const editContent =
        document.getElementById("edit-profile-content");

    const editError =
        document.getElementById("edit-profile-loading-error");

    const nameInput = document.getElementById("name");
    const majorInput = document.getElementById("major");
    const bioInput = document.getElementById("bio");
    const message = document.getElementById("profile-message");

    let teachSkills = [];
    let learnSkills = [];

    if (editLoading) editLoading.hidden = false;
    if (editContent) editContent.hidden = true;
    if (editError) editError.hidden = true;

    // =========================
    // SHOW EDITABLE SKILLS
    // =========================

    function updateSkills(listId, skills) {
        const list = document.getElementById(listId);

        if (!list) return;

        list.innerHTML = "";

        if (!skills || skills.length === 0) {
            return;
        }

        skills.forEach(function(skill) {
            const item = document.createElement("li");

            item.textContent =
                typeof skill === "string"
                    ? skill
                    : skill.name;

            list.appendChild(item);
        });
    }

    // =========================
    // LOAD EDIT PROFILE DATA
    // =========================

    try {
        const response = await fetchWithTimeout(
            `${API_URL}/api/profile`,
            { credentials: "include" }
        );

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Could not load profile.");
        }

        const data = await response.json();
        const profile = data.profile;

        if (!profile) {
            throw new Error("Profile data is missing.");
        }

        nameInput.value = profile.name || "";
        majorInput.value = profile.major || "";
        bioInput.value = profile.bio || "";

        // Load teaching skills
        try {
            const teachResponse = await fetchWithTimeout(
                `${API_URL}/api/skills/teach`,
                { credentials: "include" }
            );

            if (teachResponse.ok) {
                const teachData = await teachResponse.json();

                teachSkills = teachData.skills || [];

                updateSkills("teach-list", teachSkills);
            }
        } catch (error) {
            console.error("Teaching skills error:", error);
        }

        // Load learning skills
        try {
            const learnResponse = await fetchWithTimeout(
                `${API_URL}/api/skills/learn`,
                { credentials: "include" }
            );

            if (learnResponse.ok) {
                const learnData = await learnResponse.json();

                learnSkills = learnData.skills || [];

                updateSkills("learn-list", learnSkills);
            }
        } catch (error) {
            console.error("Learning skills error:", error);
        }

        if (editContent) {
            editContent.hidden = false;
        }

    } catch (error) {
        console.error(error);

        if (editError) {
            editError.hidden = false;
            editError.textContent =
                "Could not load your profile. Please try again.";
        }

    } finally {
        if (editLoading) {
            editLoading.hidden = true;
        }
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
                    const response = await fetchWithTimeout(
                        `${API_URL}/api/skills/teach`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
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
                            data.message || "Could not add skill.";
                        message.style.color = "red";
                        return;
                    }

                    teachSkills.push(data.skill);
                    updateSkills("teach-list", teachSkills);

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
                    const response = await fetchWithTimeout(
                        `${API_URL}/api/skills/learn`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
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
                            data.message || "Could not add skill.";
                        message.style.color = "red";
                        return;
                    }

                    learnSkills.push(data.skill);
                    updateSkills("learn-list", learnSkills);

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
                    document.querySelector('input[type="file"]');

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

                const response = await fetchWithTimeout(
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

                window.location.href = "profile.html";

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
