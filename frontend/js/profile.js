
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
// NFR-5 TASK 4: RETRY BUTTON
// =========================

function showProfileRetryButton(container, message, retryAction) {
    if (!container) return;

    container.replaceChildren();
    container.hidden = false;

    const wrapper = document.createElement("div");
    wrapper.style.padding = "15px";
    wrapper.style.backgroundColor = "#eff6ff";
    wrapper.style.border = "1px solid #bfdbfe";
    wrapper.style.borderRadius = "10px";
    wrapper.style.margin = "10px 0";

    const text = document.createElement("p");
    text.textContent = message;
    text.style.color = "#b91c1c";
    text.style.marginBottom = "10px";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "swap-request-button";
    button.textContent = "🔄 Try Again";

    button.style.backgroundColor = "#2563eb";
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "8px";
    button.style.padding = "10px 18px";
    button.style.cursor = "pointer";

    button.addEventListener("click", async function() {
        button.disabled = true;
        button.textContent = "Retrying...";

        try {
            await retryAction();
        } catch (error) {
            console.error("Profile retry error:", error);

            showProfileRetryButton(
                container,
                message,
                retryAction
            );
        }
    });

    wrapper.append(text, button);
    container.appendChild(wrapper);
}

// =========================
// DISPLAY SKILLS
// =========================

function displaySkills(listId, skills) {
    const list = document.getElementById(listId);

    if (!list) return;

    list.replaceChildren();

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
// LOAD SKILLS WITH RETRY
// =========================

async function loadProfileSkills(type, listId) {
    const list = document.getElementById(listId);

    if (!list) return;

    list.replaceChildren();

    const loadingItem = document.createElement("li");
    loadingItem.textContent = "Loading skills...";
    list.appendChild(loadingItem);

    try {
        const response = await fetchWithTimeout(
            `${API_URL}/api/skills/${type}`,
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
            throw new Error("Could not load skills.");
        }

        const data = await response.json();

        if (!Array.isArray(data.skills)) {
            throw new Error("Unexpected skills response.");
        }

        displaySkills(listId, data.skills);

    } catch (error) {
        console.error(type + " skills loading error:", error);

        list.replaceChildren();

        const item = document.createElement("li");
        item.style.listStyle = "none";

        showProfileRetryButton(
            item,
            "Could not load skills.",
            function() {
                return loadProfileSkills(type, listId);
            }
        );

        list.appendChild(item);
    }
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

    if (loadingError) {
        loadingError.hidden = true;
        loadingError.replaceChildren();
    }

    try {
        const profileResponse = await fetchWithTimeout(
            `${API_URL}/api/profile`,
            {
                credentials: "include",
                cache: "no-store"
            }
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

        // =========================
        // PROFILE PICTURE
        // =========================

        const profileImage =
            document.getElementById("profile-image");

        if (profileImage && profile.profile_image) {
            try {
                const imageResponse = await fetchWithTimeout(
                    `${API_URL}/api/profile/image`,
                    { credentials: "include" }
                );

                if (imageResponse.ok) {
                    const imageBlob = await imageResponse.blob();
                    const imageUrl = URL.createObjectURL(imageBlob);

                    profileImage.onload = function() {
                        URL.revokeObjectURL(imageUrl);
                    };

                    profileImage.src = imageUrl;
                    profileImage.hidden = false;
                } else {
                    profileImage.hidden = true;
                }

            } catch (error) {
                console.error("Profile picture error:", error);
                profileImage.hidden = true;
            }
        }

        // =========================
        // TEACHING AND LEARNING SKILLS
        // =========================

        await Promise.all([
            loadProfileSkills("teach", "teach-skills"),
            loadProfileSkills("learn", "learn-skills")
        ]);

        if (profileContent) {
            profileContent.hidden = false;
        }

    } catch (error) {
        console.error("Profile loading error:", error);

        showProfileRetryButton(
            loadingError,
            "Could not load your profile. Please try again.",
            loadProfilePage
        );

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

    const addTeachButton =
        document.getElementById("add-teach");

    const addLearnButton =
        document.getElementById("add-learn");

    let teachSkills = [];
    let learnSkills = [];

    // =========================
    // SHOW EDITABLE SKILLS
    // =========================

    function updateSkills(listId, skills) {
        const list = document.getElementById(listId);

        if (!list) return;

        list.replaceChildren();

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

    async function loadEditProfileData() {
        if (editLoading) editLoading.hidden = false;
        if (editContent) editContent.hidden = true;

        if (editError) {
            editError.hidden = true;
            editError.replaceChildren();
        }

        try {
            const response = await fetchWithTimeout(
                `${API_URL}/api/profile`,
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

            // Load both skill lists independently.
            await Promise.all([
                loadEditableSkills("teach"),
                loadEditableSkills("learn")
            ]);

            if (editContent) {
                editContent.hidden = false;
            }

        } catch (error) {
            console.error("Edit profile loading error:", error);

            showProfileRetryButton(
                editError,
                "Could not load your profile. Please try again.",
                loadEditProfileData
            );

        } finally {
            if (editLoading) {
                editLoading.hidden = true;
            }
        }
    }

    // =========================
    // LOAD EDITABLE SKILLS
    // =========================

    async function loadEditableSkills(type) {
        const listId =
            type === "teach" ? "teach-list" : "learn-list";

        const list = document.getElementById(listId);

        if (!list) return;

        list.replaceChildren();

        const loadingItem = document.createElement("li");
        loadingItem.textContent = "Loading skills...";
        list.appendChild(loadingItem);

        try {
            const response = await fetchWithTimeout(
                `${API_URL}/api/skills/${type}`,
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
                throw new Error("Could not load skills.");
            }

            const data = await response.json();

            if (!Array.isArray(data.skills)) {
                throw new Error("Unexpected skills response.");
            }

            if (type === "teach") {
                teachSkills = data.skills;
                updateSkills("teach-list", teachSkills);
            } else {
                learnSkills = data.skills;
                updateSkills("learn-list", learnSkills);
            }

        } catch (error) {
            console.error("Editable skills loading error:", error);

            list.replaceChildren();

            const item = document.createElement("li");
            item.style.listStyle = "none";

            showProfileRetryButton(
                item,
                "Could not load skills.",
                function() {
                    return loadEditableSkills(type);
                }
            );

            list.appendChild(item);
        }
    }

    // =========================
    // ADD TEACHING SKILL
    // =========================

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

                addTeachButton.disabled = true;

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

                } finally {
                    addTeachButton.disabled = false;
                }
            }
        );
    }

    // =========================
    // ADD LEARNING SKILL
    // =========================

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

                addLearnButton.disabled = true;

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

                } finally {
                    addLearnButton.disabled = false;
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

            const saveButton =
                editForm.querySelector('button[type="submit"]');

            if (saveButton) {
                saveButton.disabled = true;
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

            } finally {
                if (saveButton) {
                    saveButton.disabled = false;
                }
            }
        }
    );

    // Load initial edit-profile data after listeners are registered.
    await loadEditProfileData();
}

// =========================
// START
// =========================

loadProfilePage();
setupEditProfilePage();
