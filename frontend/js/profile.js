
"use strict";

const API_URL = "http://localhost:3000";

// =========================
// API TIMEOUT
// =========================

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
        return await fetch(url, {
            credentials: "include",
            cache: "no-store",
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }
}

// =========================
// ERROR HANDLING
// =========================

function getProfileError(error, action) {
    if (error?.name === "AbortError") {
        return "The request took too long. Please try again.";
    }

    if (error instanceof TypeError) {
        return "Unable to connect to SkillSwap. Please check your connection and try again.";
    }

    return "Could not " + action + ". Please try again later.";
}

function showProfileMessage(element, message, isError = false) {
    if (!element) return;

    element.replaceChildren();
    element.textContent = message;
    element.hidden = false;
    element.style.color = isError ? "#991b1b" : "green";
    element.setAttribute("role", isError ? "alert" : "status");
}

async function readApiResponse(response, action) {
    if (response.status === 401) {
        window.location.replace("login.html");
        throw new Error("Please log in again.");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Could not " + action + ".");
    }

    return data;
}

// =========================
// NFR-5: RETRY BUTTON
// =========================

function showProfileRetryButton(container, message, retryAction) {
    if (!container) return;

    container.replaceChildren();
    container.hidden = false;
    container.setAttribute("role", "alert");

    const box = document.createElement("div");
    box.style.padding = "15px";
    box.style.backgroundColor = "#eff6ff";
    box.style.border = "1px solid #bfdbfe";
    box.style.borderRadius = "10px";
    box.style.margin = "10px 0";

    const text = document.createElement("p");
    text.textContent = message;
    text.style.color = "#b91c1c";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "swap-request-button";
    button.textContent = "🔄 Try Again";
    button.classList.add("retry-button");
    button.style.backgroundColor = "#006B3F";
    button.style.color = "#FFCC33";
    button.style.border = "none";
    button.style.borderRadius = "8px";
    button.style.padding = "10px 18px";
    button.style.cursor = "pointer";

    button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "Retrying...";

        try {
            await retryAction();
        } catch (error) {
            console.error("Retry error:", error);
            showProfileRetryButton(container, message, retryAction);
        }
    });

    box.append(text, button);
    container.appendChild(box);
}

// =========================
// NFR-5: EMPTY SKILL STATES
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

    const heading = document.createElement("h3");
    heading.textContent = title;
    heading.style.color = "#1e40af";

    const details = document.createElement("p");
    details.textContent = description;
    details.style.color = "#475569";

    box.append(icon, heading, details);
    item.appendChild(box);
    list.appendChild(item);
}

function showSkillLoadError(listId) {
    const list = document.getElementById(listId);
    if (!list) return;

    list.replaceChildren();

    const item = document.createElement("li");
    item.style.color = "#b91c1c";
    item.textContent = "Couldn't load skills. Please try again.";
    list.appendChild(item);
}

// =========================
// DISPLAY PROFILE SKILLS
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
        const teaching = listId === "teach-skills";

        showSkillEmptyState(
            list,
            teaching
                ? "Your teaching journey starts here!"
                : "Your learning journey starts here!",
            teaching
                ? "No teaching skills yet. Add a skill you can share!"
                : "No learning skills yet. Pick something you'd love to learn!"
        );
        return;
    }

    skills.forEach(skill => {
        const item = document.createElement("li");
        item.textContent =
            typeof skill === "string" ? skill : skill.name;
        list.appendChild(item);
    });
}

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

    const loading = document.createElement("li");
    loading.textContent = "Loading skills...";
    list.appendChild(loading);

    try {
        const skills = await getSkills(type);
        displaySkills(listId, skills);
    } catch (error) {
        console.error("Skills loading error:", error);

        list.replaceChildren();

        const item = document.createElement("li");
        item.style.listStyle = "none";

        showProfileRetryButton(
            item,
            getProfileError(error, "load skills"),
            () => loadProfileSkills(type, listId)
        );

        list.appendChild(item);
    }
}

// =========================
// PROFILE PAGE
// =========================

async function loadProfilePage() {
    const profileName = document.getElementById("profile-name");
    if (!profileName) return;

    const loading = document.getElementById("profile-loading");
    const content = document.getElementById("profile-content");
    const errorBox = document.getElementById("profile-loading-error");

    if (loading) loading.hidden = false;
    if (content) content.hidden = true;

    if (errorBox) {
        errorBox.hidden = true;
        errorBox.replaceChildren();
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

        profileName.textContent = profile.name || "";

        const major = document.getElementById("profile-major");
        const bio = document.getElementById("profile-bio");

        if (major) major.textContent = profile.major || "";
        if (bio) bio.textContent = profile.bio || "";

        // =========================
        // PROFILE PICTURE
        // =========================

        const image = document.getElementById("profile-image");

        if (image) {
            image.hidden = true;

            if (profile.profile_image) {
                try {
                    const imageResponse = await fetchWithTimeout(
                        `${API_URL}/api/profile/image`
                    );

                    if (!imageResponse.ok) {
                        throw new Error("Profile image failed.");
                    }

                    const blob = await imageResponse.blob();
                    const imageUrl = URL.createObjectURL(blob);

                    image.onload = () => {
                        URL.revokeObjectURL(imageUrl);
                    };

                    image.onerror = () => {
                        URL.revokeObjectURL(imageUrl);
                        image.hidden = true;

                        showProfileMessage(
                            errorBox,
                            "Your profile loaded, but your picture could not be displayed.",
                            true
                        );
                    };

                    image.src = imageUrl;
                    image.hidden = false;
                } catch (error) {
                    console.error("Profile image error:", error);
                    image.hidden = true;

                    showProfileMessage(
                        errorBox,
                        getProfileError(error, "load your profile picture"),
                        true
                    );
                }
            }
        }

        await Promise.all([
            loadProfileSkills("teach", "teach-skills"),
            loadProfileSkills("learn", "learn-skills")
        ]);

        if (content) content.hidden = false;

    } catch (error) {
        console.error("Profile loading error:", error);

        showProfileRetryButton(
            errorBox,
            getProfileError(error, "load your profile"),
            loadProfilePage
        );
    } finally {
        if (loading) loading.hidden = true;
    }
}

// =========================
// EDIT PROFILE + FR19 ONBOARDING
// =========================

async function setupEditProfilePage() {
    const editForm = document.getElementById("edit-profile-form");
    if (!editForm) return;

    const params = new URLSearchParams(window.location.search);
    const isOnboarding = params.get("onboarding") === "1";

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

    const addTeachButton = document.getElementById("add-teach");
    const addLearnButton = document.getElementById("add-learn");

    const saveButton =
        editForm.querySelector(".save-button") ||
        editForm.querySelector('button[type="submit"]');

    let teachSkills = [];
    let learnSkills = [];
    let skillsLoaded = false;

    // =========================
    // FR19: ONBOARDING DISPLAY
    // =========================

    if (isOnboarding) {
        const heading = document.querySelector(
            ".edit-page-heading h1"
        );

        const subtitle = document.querySelector(
            ".edit-page-heading p"
        );

        const cancelButton = editForm.querySelector(
            ".cancel-button"
        );

        if (heading) {
            heading.textContent = "Complete Your Profile";
        }

        if (subtitle) {
            subtitle.textContent =
                "Welcome to SkillSwap! Tell us about yourself " +
                "and add at least one skill you can teach " +
                "and one skill you want to learn.";
        }

        if (saveButton) {
            saveButton.textContent = "Save & Continue";
        }

        if (cancelButton) {
            cancelButton.hidden = true;
            cancelButton.style.display = "none";
        }
    }

    // =========================
    // EDITABLE SKILL LISTS
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
            const teaching = listId === "teach-list";

            showSkillEmptyState(
                list,
                teaching
                    ? "Ready to share a skill?"
                    : "Ready to learn something new?",
                teaching
                    ? "Add your first teaching skill!"
                    : "Add something you want to learn!"
            );
            return;
        }

        skills.forEach(skill => {
            const item = document.createElement("li");
            item.textContent =
                typeof skill === "string" ? skill : skill.name;
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

        if (list) {
            list.replaceChildren();

            const loading = document.createElement("li");
            loading.textContent = "Loading skills...";
            list.appendChild(loading);
        }

        try {
            const skills = await getSkills(type);

            if (type === "teach") {
                teachSkills = skills;
                updateSkills("teach-list", teachSkills);
            } else {
                learnSkills = skills;
                updateSkills("learn-list", learnSkills);
            }

            return true;
        } catch (error) {
            console.error("Editable skills error:", error);

            if (list) {
                list.replaceChildren();

                const item = document.createElement("li");
                item.style.listStyle = "none";

                showProfileRetryButton(
                    item,
                    getProfileError(error, "load skills"),
                    async () => {
                        const success = await loadEditableSkills(type);
                        if (success) {
                            skillsLoaded = true;
                        }
                    }
                );

                list.appendChild(item);
            }

            return false;
        }
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

        skillsLoaded = false;

        try {
            const response = await fetchWithTimeout(
                `${API_URL}/api/profile`
            );

            const data = await readApiResponse(
                response,
                "load your profile"
            );

            if (!data.profile) {
                throw new Error("Profile data is missing.");
            }

            nameInput.value = data.profile.name || "";
            majorInput.value = data.profile.major || "";
            bioInput.value = data.profile.bio || "";

            const results = await Promise.all([
                loadEditableSkills("teach"),
                loadEditableSkills("learn")
            ]);

            skillsLoaded = results.every(Boolean);

            if (editContent) editContent.hidden = false;

            if (!skillsLoaded && isOnboarding) {
                showProfileMessage(
                    message,
                    "Some skills could not load. Please retry before saving.",
                    true
                );
            }
        } catch (error) {
            console.error("Edit profile loading error:", error);

            showProfileRetryButton(
                editError,
                getProfileError(error, "load your profile"),
                loadEditProfileData
            );
        } finally {
            if (editLoading) editLoading.hidden = true;
        }
    }

    // =========================
    // ADD TEACHING SKILL
    // =========================

    if (addTeachButton) {
        addTeachButton.addEventListener("click", async () => {
            const input = document.getElementById("teach-input");
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
                        body: JSON.stringify({ name: skill })
                    }
                );

                const data = await readApiResponse(
                    response,
                    "add teaching skill"
                );

                if (!data.skill) {
                    throw new Error("Invalid skill response.");
                }

                teachSkills.push(data.skill);
                updateSkills("teach-list", teachSkills);
                input.value = "";

                showProfileMessage(
                    message,
                    "Teaching skill added successfully!"
                );
            } catch (error) {
                console.error("Add teaching skill error:", error);

                showProfileMessage(
                    message,
                    getProfileError(error, "add teaching skill"),
                    true
                );
            } finally {
                addTeachButton.disabled = false;
            }
        });
    }

    // =========================
    // ADD LEARNING SKILL
    // =========================

    if (addLearnButton) {
        addLearnButton.addEventListener("click", async () => {
            const input = document.getElementById("learn-input");
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
                        body: JSON.stringify({ name: skill })
                    }
                );

                const data = await readApiResponse(
                    response,
                    "add learning skill"
                );

                if (!data.skill) {
                    throw new Error("Invalid skill response.");
                }

                learnSkills.push(data.skill);
                updateSkills("learn-list", learnSkills);
                input.value = "";

                showProfileMessage(
                    message,
                    "Learning skill added successfully!"
                );
            } catch (error) {
                console.error("Add learning skill error:", error);

                showProfileMessage(
                    message,
                    getProfileError(error, "add learning skill"),
                    true
                );
            } finally {
                addLearnButton.disabled = false;
            }
        });
    }

    // =========================
    // SAVE PROFILE
    // =========================

    editForm.addEventListener("submit", async event => {
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

        // FR19: Require both skill types during onboarding.
        if (isOnboarding) {
            if (!skillsLoaded) {
                showProfileMessage(
                    message,
                    "Please wait for your skills to load or retry.",
                    true
                );
                return;
            }

            if (teachSkills.length < 1) {
                showProfileMessage(
                    message,
                    "Please add at least one skill you can teach.",
                    true
                );
                return;
            }

            if (learnSkills.length < 1) {
                showProfileMessage(
                    message,
                    "Please add at least one skill you want to learn.",
                    true
                );
                return;
            }
        }

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        try {
            const formData = new FormData();

            formData.append("name", name);
            formData.append("major", major);
            formData.append("bio", bio);

            const imageInput =
                editForm.querySelector('input[type="file"]');

            if (imageInput?.files?.[0]) {
                formData.append("image", imageInput.files[0]);
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

            // FR19: New users go Home.
            // Existing users return to their profile.
            window.location.href = isOnboarding
                ? "home.html"
                : "profile.html";

        } catch (error) {
            console.error("Profile saving error:", error);

            showProfileMessage(
                message,
                getProfileError(error, "save your profile"),
                true
            );
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = isOnboarding
                    ? "Save & Continue"
                    : "Save Changes";
            }
        }
    });

    await loadEditProfileData();
}

// =========================
// INITIALIZE
// =========================

loadProfilePage();
setupEditProfilePage();
