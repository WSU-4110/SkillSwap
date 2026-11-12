
const API_URL = "http://localhost:3000";

const requestsContainer = document.getElementById("incoming-requests");
const statusMessage = document.getElementById("requests-status");
const loadMoreButton = document.getElementById("load-more-requests");

let nextOffset = null;
let isLoading = false;

// Load incoming swap requests.
async function loadRequests(offset = 0) {
    if (isLoading) return;

    isLoading = true;
    loadMoreButton.hidden = true;
    statusMessage.textContent = "Loading requests...";

    try {
        const response = await fetch(
            `${API_URL}/api/requests?direction=incoming&offset=${offset}`,
            { credentials: "include" }
        );

        if (response.status === 401) {
            window.location.replace("login.html");
            return;
        }

        if (!response.ok) {
            throw new Error("Could not load requests.");
        }

        const data = await response.json();

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

                        if (!result.ok) {
                            throw new Error("Could not accept request.");
                        }

                        status.textContent = "Status: accepted";
                        acceptButton.textContent = "Accepted";
                        statusMessage.textContent = "Swap request accepted!";

                    } catch (error) {
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

        nextOffset = data.nextOffset;
        loadMoreButton.hidden = nextOffset === null;

    } catch (error) {
        statusMessage.textContent = error.message;
    } finally {
        isLoading = false;
    }
}

loadMoreButton.addEventListener("click", () => {
    if (nextOffset !== null) {
        loadRequests(nextOffset);
    }
});

loadRequests();
