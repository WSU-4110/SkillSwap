
"use strict";

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
            credentials: "include",
            cache: "no-store",
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeout);
    }
}

// =========================
// ERROR HANDLING
// =========================

function getProfileError(error, action) {
    if (error.name === "AbortError") {
        return "The request took too long. Please try again.";
    }

    if (error instanceof TypeError) {
        return (
            "Unable to connect to SkillSwap. " +
            "Please check your connection and try again."
        );
    }

    return (
        "Could not " + action +
        ". Please try again later."
    );
}

function showProfileMessage(element, text, isError = false) {
    if (!element) return;

    element.textContent = text;
    element.hidden = false;
    element.style.color = isError ? "#991b1b" : "green";
    element.setAttribute(
        "role",
        isError ? "alert" : "status"
    );
}

async function readApiResponse(response, action) {
    if (response.status === 401) {
        window.location.replace("login.html");
        throw new Error("Please log in again.");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message || "Could not " + action + "."
        );
    }

    return data;
}

// =========================
// NFR-5 TASK 4: RETRY BUTTON
// =========================

function showProfileRetryButton(container, message, retryAction) {
    if (!container) return;

    container.replaceChildren();
    container.hidden = false;
    container.setAttribute("role", "alert");

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
// NFR-5 TASK 3: EMPTY STATES
// =========================

function showSkillEmptyState(list, title, description) {
    const item = document.createElement("li");
    item.style.listStyle = "none";

    const box = document.createElement("div");
    box.className = "skills-box";
    box.style.textAlign = "center";
    box.style.padding = "25px 20px";
    box.style.border = "1px solid #bfdbfe";
    box.style.borderRadius = "12px";
    box.style.backgroundColor = "#eff6ff";

    const icon = document.createElement("div");
    icon.textContent = "🪜";
    icon.style.fontSize = "32px";
    icon.style.marginBottom = "10px";

    const heading = document.createElement("h3");
    heading.textContent = title;
    heading.style.color = "#1e40af";
    heading.style.marginBottom = "8px";

    const details = document.createElement("p");
    details.textContent = description;
    details.style.color = "#475569";
    details.style.margin = "0";

    box.append(icon, heading, details);
    item.appendChild(box);
    list.appendChild(item);
}

// =========================
// DISPLAY SKILLS
// =========================

function displaySkills(listId, skills) {
    const list = document.getElementById(listId);
    if (!list) return;

    list.replaceChildren();

    if (!Array.isArray(skills)) {
        showSkillLoadError(listId);
        return;
    }

    if (skills.length === 0) {
        const isTeaching = listId === "teach-skills";

        showSkillEmptyState(
            list,
            isTeaching
                ? "Your teaching journey starts here!"
                : "Your learning journey starts here!",
            isTeaching
                ? "No teaching skills yet. Add a skill you can share " +
                  "and start climbing toward your next SkillSwap!"
                : "No learning skills yet. Pick something you'd love " +
                  "to learn and take the first step!"
        );

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
// SKILL LOADING ERROR
// =========================

function showSkillLoadError(listId) {
    const list = document.getElementById(listId);
    if (!list) return;

    list.replaceChildren();

    const item = document.createElement("li");
    item.style.listStyle = "none";
    item.style.color = "#b91c1c";
    item.textContent =
        "Couldn't load skills right now. Please try again.";

    list.appendChild(item);
}

// =========================
// LOAD SKILLS WITH RETRY
// =========================

async function getSkills(type) {
    const response = await fetchWithTimeout(
        `${API_URL}/api/skills/${type}`
    );

    const data = await readApiResponse(
        response,
        "load " + type + " skills"
    );

    if (!Array.isArray(data.skills)) {
        throw new Error("Invalid skills response.");
    }

    return data.skills;
}

async function loadProfileSkills(type, listId) {
    const list = document.getElementById(listId);
    if (!list) return;

    list.replaceChildren();

    const loadingItem = document.createElement("li");
    loadingItem.textContent = "Loading skills...";
    list.appendChild(loadingItem);

    try {
        const skills = await getSkills(type);
        displaySkills(listId, skills);

    } catch (error) {
        console.error(type + " skills loading error:", error);

        list.replaceChildren();

        const item = document.createElement("li");
        item.style.listStyle = "none";

        showProfileRetryButton(
            item,
            getProfileError(error, "load skills"),
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

    if (loadingIndicator) {
        loadingIndicator.hidden = false;
    }

    if (profileContent) {
        profileContent.hidden = true;
    }

    if (loadingError) {
        loadingError.hidden = true;
        loadingError.replaceChildren();
    }

    try {
        const response = await fetchWithTimeout(
            `${API_URL}/api/profile`
        );

        const data = await readApiResponse(
            response,
            "load your profile"
        );

        const profile = data.profile;

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

        if (profileImage) {
            profileImage.hidden = true;

            if (profile.profile_image) {
                try {
                    const imageResponse = await fetchWithTimeout(
                        `${API_URL}/api/profile/image`
                    );

                    if (!imageResponse.ok) {
                        throw new Error(
                            "Profile image request failed."
                        );
                    }

                    const imageBlob =
                        await imageResponse.blob();

                    const imageUrl =
                        URL.createObjectURL(imageBlob);

                    profileImage.onload = function() {
                        URL.revokeObjectURL(imageUrl);
                    };

                    profileImage.onerror = function() {
                        URL.revokeObjectURL(imageUrl);
                        profileImage.hidden = true;

                        showProfileMessage(
                            loadingError,
                            "Your profile loaded, but your picture " +
                            "could not be displayed.",
                            true
                        );
                    };

                    profileImage.src = imageUrl;
                    profileImage.hidden = false;

                } catch (error) {
                    console.error(
                        "Profile image error:",
                        error
                    );

                    profileImage.hidden = true;

                    showProfileMessage(
                        loadingError,
                        getProfileError(
                            error,
                            "load your profile picture"
                        ),
                        true
                    );
                }
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
            getProfileError(error, "load your profile"),
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
    // DISPLAY EDITABLE SKILLS
    // =========================

    function updateSkills(listId, skills) {
        const list = document.getElementById(listId);
        if (!list) return;

        list.replaceChildren();

        if (!Array.isArray(skills)) {
            showSkillLoadError(listId);
            return;
        }

        if (skills.length === 0) {
            const isTeaching = listId === "teach-list";

            showSkillEmptyState(
                list,
                isTeaching
                    ? "Ready to share a skill?"
                    : "Ready to learn something new?",
                isTeaching
                    ? "Add your first teaching skill and start " +
                      "climbing the SkillSwap ladder!"
                    : "Add something you want to learn. " +
                      "Every new skill starts with one step!"
            );

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
            const skills = await getSkills(type);

            if (type === "teach") {
                teachSkills = skills;
                updateSkills("teach-list", teachSkills);
            } else {
                learnSkills = skills;
                updateSkills("learn-list", learnSkills);
            }

        } catch (error) {
            console.error(
                "Editable skills loading error:",
                error
            );

            list.replaceChildren();

            const item = document.createElement("li");
            item.style.listStyle = "none";

            showProfileRetryButton(
                item,
                getProfileError(error, "load skills"),
                function() {
                    return loadEditableSkills(type);
                }
            );

            list.appendChild(item);
        }
    }

    // =========================
    // LOAD EDIT PROFILE DATA
    // =========================

    async function loadEditProfileData() {
        if (editLoading) {
            editLoading.hidden = false;
        }

        if (editContent) {
            editContent.hidden = true;
        }

        if (editError) {
            editError.hidden = true;
            editError.replaceChildren();
        }

        try {
            const response = await fetchWithTimeout(
                `${API_URL}/api/profile`
            );

            const data = await readApiResponse(
                response,
                "load your profile"
            );

            const profile = data.profile;

            if (!profile) {
                throw new Error("Profile data is missing.");
            }

            nameInput.value = profile.name || "";
            majorInput.value = profile.major || "";
            bioInput.value = profile.bio || "";

            await Promise.all([
                loadEditableSkills("teach"),
                loadEditableSkills("learn")
            ]);

            if (editContent) {
                editContent.hidden = false;
            }

        } catch (error) {
            console.error(
                "Edit profile loading error:",
                error
            );

            showProfileRetryButton(
                editError,
                getProfileError(error, "load your profile"),
                loadEditProfileData
            );

        } finally {
            if (editLoading) {
                editLoading.hidden = true;
            }
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

                if (!skill) {
                    showProfileMessage(
                        message,
                        "Please enter a skill.",
                        true
                    );
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
                            body: JSON.stringify({
                                name: skill
                            })
                        }
                    );

                    const data = await readApiResponse(
                        response,
                        "add teaching skill"
                    );

                    if (!data.skill) {
                        throw new Error(
                            "Invalid skill response."
                        );
                    }

                    teachSkills.push(data.skill);
                    updateSkills("teach-list", teachSkills);

                    input.value = "";

                    showProfileMessage(
                        message,
                        "Teaching skill added successfully!"
                    );

                } catch (error) {
                    console.error(
                        "Add teaching skill error:",
                        error
                    );

                    showProfileMessage(
                        message,
                        getProfileError(
                            error,
                            "add teaching skill"
                        ),
                        true
                    );

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

                if (!skill) {
                    showProfileMessage(
                        message,
                        "Please enter a skill.",
                        true
                    );
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
                            body: JSON.stringify({
                                name: skill
                            })
                        }
                    );

                    const data = await readApiResponse(
                        response,
                        "add learning skill"
                    );

                    if (!data.skill) {
                        throw new Error(
                            "Invalid skill response."
                        );
                    }

                    learnSkills.push(data.skill);
                    updateSkills("learn-list", learnSkills);

                    input.value = "";

                    showProfileMessage(
                        message,
                        "Learning skill added successfully!"
                    );

                } catch (error) {
                    console.error(
                        "Add learning skill error:",
                        error
                    );

                    showProfileMessage(
                        message,
                        getProfileError(
                            error,
                            "add learning skill"
                        ),
                        true
                    );

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

            if (!name) {
                showProfileMessage(
                    message,
                    "Please enter your full name.",
                    true
                );
                return;
            }

            const saveButton =
                editForm.querySelector(
                    'button[type="submit"]'
                );

            if (saveButton) {
                saveButton.disabled = true;
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

                const response = await fetchWithTimeout(
                    `${API_URL}/api/profile`,
                    {
                        method: "PUT",
                        body: formData
                    }
                );

                await readApiResponse(
                    response,
                    "save your profile"
                );

                showProfileMessage(
                    message,
                    "Profile saved successfully!"
                );

                window.location.href = "profile.html";

            } catch (error) {
                console.error(
                    "Profile saving error:",
                    error
                );

                showProfileMessage(
                    message,
                    getProfileError(
                        error,
                        "save your profile"
                    ),
                    true
                );

            } finally {
                if (saveButton) {
                    saveButton.disabled = false;
                }
            }
        }
    );

    // =========================
    // INITIALIZE EDIT PAGE
    // =========================

    await loadEditProfileData();
}

// =========================
// START
// =========================

loadProfilePage();
setupEditProfilePage();
