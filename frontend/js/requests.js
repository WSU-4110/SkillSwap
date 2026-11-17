
"use strict";

const API_URL = "http://localhost:3000";

const requestsContainer = document.getElementById("incoming-requests");
const statusMessage = document.getElementById("requests-status");
const loadMoreButton = document.getElementById("load-more-requests");

let nextOffset = null;
let isLoading = false;

// =========================
// NFR-5: ERROR HANDLING
// =========================

function showRequestError(message) {
    statusMessage.textContent = message;
    statusMessage.setAttribute("role", "alert");
    statusMessage.style.color = "#991b1b";
}

function showRequestStatus(message) {
    statusMessage.textContent = message;
    statusMessage.setAttribute("role", "status");
    statusMessage.style.color = "";
}

function getRequestErrorMessage(error, action) {
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

// =========================
// LOAD INCOMING REQUESTS
// =========================

async function loadRequests(offset = 0) {
    if (isLoading) return;

    isLoading = true;
    loadMoreButton.hidden = true;

    showRequestStatus("Loading requests...");

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
            throw new Error(
                "Request loading failed: " + response.status
            );
        }

        const data = await response.json();

        if (!Array.isArray(data.requests)) {
            throw new Error("Invalid requests response.");
        }

        if (offset === 0) {
            requestsContainer.replaceChildren();
        }

        for (const request of data.requests) {
            const card = document.createElement("div");
            card.className = "request-card";

            const name = document.createElement("h3");
            name.textContent = request.senderName || "Unknown student";

            const status = document.createElement("p");
            status.className = "request-status";
            status.textContent = `Status: ${request.status}`;

            card.append(name, status);

            if (request.status === "pending") {
                const acceptButton = document.createElement("button");
                acceptButton.type = "button";
                acceptButton.className = "swap-request-button";
                acceptButton.textContent = "Accept Request";

                acceptButton.addEventListener("click", async () => {
                    acceptButton.disabled = true;
                    acceptButton.textContent = "Accepting...";

                    showRequestStatus("");

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
                                "Accept request failed: " + result.status
                            );
                        }

                        status.textContent = "Status: accepted";
                        acceptButton.textContent = "Accepted";

                        showRequestStatus(
                            "Swap request accepted successfully!"
                        );

                    } catch (error) {
                        console.error("Accept request error:", error);

                        showRequestError(
                            getRequestErrorMessage(
                                error,
                                "accept this request"
                            )
                        );

                        acceptButton.disabled = false;
                        acceptButton.textContent = "Accept Request";
                    }
                });

                card.appendChild(acceptButton);
            }

            requestsContainer.appendChild(card);
        }

        if (offset === 0 && data.requests.length === 0) {
            showRequestStatus(
                "You have no incoming requests."
            );
        } else {
            showRequestStatus("");
        }

        nextOffset = data.nextOffset ?? null;
        loadMoreButton.hidden = nextOffset === null;

    } catch (error) {
        console.error("Request loading error:", error);

        showRequestError(
            getRequestErrorMessage(error, "load your requests")
        );

        // Keep previously loaded requests and allow
        // another attempt to load the same page.
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
// INITIALIZE REQUESTS
// =========================

loadRequests();
