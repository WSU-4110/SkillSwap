
"use strict";

const API_URL = "http://localhost:3000";

const requestsContainer =
    document.getElementById("incoming-requests");

const statusMessage =
    document.getElementById("requests-status");

const loadMoreButton =
    document.getElementById("load-more-requests");

let nextOffset = null;
let isLoading = false;

// =========================
// NFR-5 TASK 3: EMPTY STATE
// =========================

function showRequestsEmptyState() {
    requestsContainer.replaceChildren();

    const emptyBox = document.createElement("div");
    emptyBox.className = "skills-box";

    emptyBox.style.textAlign = "center";
    emptyBox.style.padding = "30px 20px";
    emptyBox.style.marginTop = "15px";
    emptyBox.style.border = "1px solid #bfdbfe";
    emptyBox.style.borderRadius = "12px";
    emptyBox.style.backgroundColor = "#eff6ff";

    const icon = document.createElement("div");
    icon.textContent = "🎲";    
    icon.style.fontSize = "32px";
    icon.style.marginBottom = "10px";

    const heading = document.createElement("h3");
    heading.textContent = "No swap requests yet!";
    heading.style.color = "#1e40af";
    heading.style.marginBottom = "8px";

    const description = document.createElement("p");
    description.textContent =
        "You don't have any incoming swap requests right now. " +
        "When another student wants to exchange skills with you, " +
        "their request will appear here.";

    description.style.color = "#475569";
    description.style.margin = "0";

    emptyBox.append(icon, heading, description);
    requestsContainer.appendChild(emptyBox);
}

// =========================
// LOAD INCOMING REQUESTS
// =========================

async function loadRequests(offset = 0) {
    if (isLoading) return;

    isLoading = true;
    loadMoreButton.hidden = true;
    statusMessage.textContent = "Loading requests...";

    try {
        const response = await fetch(
            `${API_URL}/api/requests?direction=incoming&offset=${offset}`,
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        if (response.status === 401) {
            window.location.replace("login.html");
            return;
        }

        if (!response.ok) {
            throw new Error("Could not load requests.");
        }

        const data = await response.json();

        if (!Array.isArray(data.requests)) {
            throw new Error("Invalid requests response.");
        }

        if (offset === 0) {
            requestsContainer.replaceChildren();
        }

        // =========================
        // DISPLAY EMPTY STATE
        // =========================

        if (offset === 0 && data.requests.length === 0) {
            showRequestsEmptyState();
            statusMessage.textContent = "";
        } else {
            // =========================
            // DISPLAY REQUEST CARDS
            // =========================

            for (const request of data.requests) {
                const card = document.createElement("div");
                card.className = "request-card";

                const name = document.createElement("h3");
                name.textContent =
                    request.senderName || "Unknown student";

                const status = document.createElement("p");
                status.className = "request-status";
                status.textContent = `Status: ${request.status}`;

                card.append(name, status);

                if (request.status === "pending") {
                    const acceptButton =
                        document.createElement("button");

                    acceptButton.type = "button";
                    acceptButton.className = "swap-request-button";
                    acceptButton.textContent = "Accept Request";

                    acceptButton.addEventListener(
                        "click",
                        async () => {
                            acceptButton.disabled = true;
                            acceptButton.textContent = "Accepting...";

                            try {
                                const result = await fetch(
                                    `${API_URL}/api/requests/${request.id}/accept`,
                                    {
                                        method: "PATCH",
                                        credentials: "include"
                                    }
                                );

                                if (result.status === 401) {
                                    window.location.replace("login.html");
                                    return;
                                }

                                if (!result.ok) {
                                    throw new Error(
                                        "Could not accept request."
                                    );
                                }

                                status.textContent = "Status: accepted";
                                acceptButton.textContent = "Accepted";

                                statusMessage.textContent =
                                    "Swap request accepted!";

                            } catch (error) {
                                console.error(
                                    "Accept request error:",
                                    error
                                );

                                statusMessage.textContent =
                                    "Could not accept request. " +
                                    "Please try again.";

                                acceptButton.disabled = false;
                                acceptButton.textContent =
                                    "Accept Request";
                            }
                        }
                    );

                    card.appendChild(acceptButton);
                }

                requestsContainer.appendChild(card);
            }

            statusMessage.textContent = "";
        }

        nextOffset = data.nextOffset ?? null;
        loadMoreButton.hidden = nextOffset === null;

    } catch (error) {
        console.error("Request loading error:", error);

        statusMessage.textContent =
            "Could not load requests. Please try again.";

        // Preserve pagination when loading more fails.
        if (offset > 0) {
            nextOffset = offset;
            loadMoreButton.hidden = false;
        }

    } finally {
        isLoading = false;
    }
}

// =========================
// LOAD MORE REQUESTS
// =========================

loadMoreButton.addEventListener("click", () => {
    if (nextOffset !== null) {
        loadRequests(nextOffset);
    }
});

// =========================
// INITIALIZE
// =========================

loadRequests();
