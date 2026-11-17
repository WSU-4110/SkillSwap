
const API_URL = "http://localhost:3000";

const requestsContainer = document.getElementById("incoming-requests");
const statusMessage = document.getElementById("requests-status");
const loadMoreButton = document.getElementById("load-more-requests");

let nextOffset = null;
let isLoading = false;

// =========================
// NFR-5 TASK 4: RETRY BUTTON
// =========================

function showRequestsRetryButton(message, offset) {
    statusMessage.replaceChildren();

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

    retryButton.addEventListener("click", function() {
        if (isLoading) return;

        retryButton.disabled = true;
        retryButton.textContent = "Retrying...";

        loadRequests(offset);
    });

    statusMessage.append(text, retryButton);
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
            throw new Error("Unexpected response from server.");
        }

        // Clear existing cards only after a successful first-page load.
        if (offset === 0) {
            requestsContainer.replaceChildren();
        }

        for (const request of data.requests) {
            const card = document.createElement("div");
            card.className = "request-card";

            const name = document.createElement("h3");
            name.textContent = request.senderName;

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
                            throw new Error("Could not accept request.");
                        }

                        status.textContent = "Status: accepted";
                        acceptButton.textContent = "Accepted";
                        statusMessage.textContent = "Swap request accepted!";

                    } catch (error) {
                        console.error("Accept request error:", error);

                        statusMessage.textContent = error.message;
                        acceptButton.disabled = false;
                        acceptButton.textContent = "Accept Request";
                    }
                });

                card.appendChild(acceptButton);
            }

            requestsContainer.appendChild(card);
        }

        if (offset === 0 && data.requests.length === 0) {
            statusMessage.textContent = "You have no incoming requests.";
        } else {
            statusMessage.textContent = "";
        }

        nextOffset = data.nextOffset ?? null;
        loadMoreButton.hidden = nextOffset === null;

    } catch (error) {
        console.error("Requests loading error:", error);

        showRequestsRetryButton(
            "Could not load requests. Please try again.",
            offset
        );

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
// INITIAL LOAD
// =========================

loadRequests();
