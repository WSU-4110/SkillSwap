
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
// NFR-5: ERROR HANDLING
// =========================

function showRequestError(message) {
    statusMessage.replaceChildren();
    statusMessage.textContent = message;
    statusMessage.setAttribute("role", "alert");
    statusMessage.style.color = "#991b1b";
}

function showRequestStatus(message) {
    statusMessage.replaceChildren();
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
    icon.textContent = "📭";
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
// NFR-5 TASK 4: RETRY BUTTON
// =========================

function showRequestsRetryButton(message, offset) {
    statusMessage.replaceChildren();
    statusMessage.setAttribute("role", "alert");
    statusMessage.style.color = "";

    const text = document.createElement("p");
    text.textContent = message;
    text.style.color = "#b91c1c";
    text.style.marginBottom = "10px";

    const retryButton = document.createElement("button");
    retryButton.type = "button";
    retryButton.className = "swap-request-button";
    retryButton.textContent = "🔄 Try Again";

    retryButton.style.backgroundColor = "#2563eb";
    retryButton.style.color = "white";
    retryButton.style.border = "none";
    retryButton.style.borderRadius = "8px";
    retryButton.style.padding = "10px 18px";
    retryButton.style.cursor = "pointer";

    retryButton.addEventListener("click", function () {
        if (isLoading) return;

        retryButton.disabled = true;
        retryButton.textContent = "Retrying...";

        loadRequests(offset);
    });

    statusMessage.append(text, retryButton);
}

// =========================
// FR12: REQUEST STATUS STYLING
// =========================

function updateRequestStatus(statusElement, newStatus) {
    statusElement.className =
        "request-status status-" + newStatus;

    statusElement.textContent =
        "Status: " + newStatus;
}

// =========================
// LOAD INCOMING REQUESTS
// =========================

async function loadRequests(offset = 0) {
    if (isLoading) return;

    isLoading = true;
    loadMoreButton.disabled = true;
    loadMoreButton.textContent = "Loading...";
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

        // Clear previous cards after successful first-page load.
        if (offset === 0) {
            requestsContainer.replaceChildren();
        }

        // =========================
        // EMPTY STATE
        // =========================

        if (offset === 0 && data.requests.length === 0) {
            showRequestsEmptyState();
            showRequestStatus("");

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

                // FR12: Apply status-specific styling.
                updateRequestStatus(status, request.status);

                const requestDate = document.createElement("p");
                requestDate.className = "request-date";

                const createdAt = new Date(request.createdAt);

                requestDate.textContent = Number.isNaN(createdAt.getTime())
                    ? "Date unavailable"
                    : "Received: " + createdAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                    });

                card.append(name, requestDate, status);

                if (request.status === "pending") {

                    // =========================
                    // ACCEPT BUTTON
                    // =========================

                    const acceptButton =
                        document.createElement("button");

                    acceptButton.type = "button";
                    acceptButton.className = "swap-request-button";
                    acceptButton.textContent = "Accept Request";

                    // =========================
                    // REJECT BUTTON
                    // =========================

                    const rejectButton =
                        document.createElement("button");

                    rejectButton.type = "button";
                    rejectButton.className = "reject-request-button";
                    rejectButton.textContent = "Reject Request";

                    // =========================
                    // ACCEPT REQUEST API
                    // =========================

                    acceptButton.addEventListener(
                        "click",
                        async () => {
                            acceptButton.disabled = true;
                            rejectButton.disabled = true;
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
                                        "Accept request failed: " +
                                        result.status
                                    );
                                }

                                // FR12: Update status and color.
                                updateRequestStatus(status, "accepted");

                                acceptButton.textContent = "Accepted";
                                acceptButton.disabled = true;
                                rejectButton.disabled = true;

                                showRequestStatus(
                                    "Swap request accepted successfully!"
                                );

                            } catch (error) {
                                console.error(
                                    "Accept request error:",
                                    error
                                );

                                showRequestError(
                                    getRequestErrorMessage(
                                        error,
                                        "accept this request"
                                    )
                                );

                                acceptButton.disabled = false;
                                rejectButton.disabled = false;
                                acceptButton.textContent =
                                    "Accept Request";
                            }
                        }
                    );

                    // =========================
                    // REJECT REQUEST API
                    // =========================

                    rejectButton.addEventListener(
                        "click",
                        async () => {
                            rejectButton.disabled = true;
                            acceptButton.disabled = true;
                            rejectButton.textContent = "Rejecting...";

                            showRequestStatus("");

                            try {
                                const response = await fetch(
                                    `${API_URL}/api/requests/${request.id}/reject`,
                                    {
                                        method: "PATCH",
                                        credentials: "include"
                                    }
                                );

                                if (response.status === 401) {
                                    window.location.replace("login.html");
                                    return;
                                }

                                if (!response.ok) {
                                    const errorData =
                                        await response.json()
                                            .catch(() => ({}));

                                    throw new Error(
                                        errorData.message ||
                                        "Could not reject request."
                                    );
                                }

                                // FR12: Update status and color.
                                updateRequestStatus(status, "rejected");

                                rejectButton.textContent = "Rejected";
                                rejectButton.disabled = true;
                                acceptButton.disabled = true;

                                showRequestStatus(
                                    "Swap request rejected successfully!"
                                );

                            } catch (error) {
                                console.error(
                                    "Reject request error:",
                                    error
                                );

                                showRequestError(
                                    getRequestErrorMessage(
                                        error,
                                        "reject this request"
                                    )
                                );

                                rejectButton.disabled = false;
                                acceptButton.disabled = false;
                                rejectButton.textContent =
                                    "Reject Request";
                            }
                        }
                    );

                    // =========================
                    // DISPLAY BOTH BUTTONS
                    // =========================

                    const requestActions =
                        document.createElement("div");

                    requestActions.className = "request-actions";

                    requestActions.append(
                        acceptButton,
                        rejectButton
                    );

                    card.appendChild(requestActions);
                }

                requestsContainer.appendChild(card);
            }

            showRequestStatus("");
        }

        nextOffset = data.nextOffset ?? null;
        loadMoreButton.hidden = nextOffset === null;

    } catch (error) {
        console.error("Request loading error:", error);

        // Preserve pagination for retry.
        if (offset > 0) {
            nextOffset = offset;
        }

        showRequestsRetryButton(
            getRequestErrorMessage(error, "load your requests"),
            offset
        );

    } finally {
    isLoading = false;
    loadMoreButton.disabled = false;
    loadMoreButton.textContent = "Load More";
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
