
document.body.innerHTML = `
    <div id="incoming-requests"></div>
    <div id="requests-status"></div>
    <button id="load-more-requests"></button>
`;

const {
    showRequestError,
    showRequestStatus,
    getRequestErrorMessage,
    showRequestsEmptyState,
    showRequestsRetryButton,
    loadRequests
} = require("../js/requests.js");

test("showRequestError displays an error message", () => {
    showRequestError("Unable to load requests");

    const status = document.getElementById("requests-status");

    expect(status.textContent).toBe("Unable to load requests");
    expect(status.getAttribute("role")).toBe("alert");
    expect(status.style.color).toBe("rgb(153, 27, 27)");
});


test("showRequestStatus displays a status message", () => {
    showRequestStatus("Loading requests...");

    const status = document.getElementById("requests-status");

    expect(status.textContent).toBe("Loading requests...");
    expect(status.getAttribute("role")).toBe("status");
    expect(status.style.color).toBe("");
});


test("getRequestErrorMessage returns the correct error message", () => {
    const error = new TypeError("Failed to fetch");

    const message = getRequestErrorMessage(
        error,
        "load your requests"
    );

    expect(message).toBe(
        "Unable to connect to SkillSwap. " +
        "Please check your connection and try again."
    );
});


test("showRequestsEmptyState displays a message when there are no requests", () => {
    showRequestsEmptyState();

    const container = document.getElementById("incoming-requests");

    expect(container.textContent).toContain("No swap requests yet!");
    expect(container.textContent).toContain("It's a ghost town in here!");
    expect(container.querySelector(".skills-box")).not.toBeNull();
});


test("showRequestsRetryButton displays a retry button", () => {
    showRequestsRetryButton("Unable to load requests", 0);

    const status = document.getElementById("requests-status");
    const retryButton = status.querySelector("button");

    expect(status.textContent).toContain("Unable to load requests");
    expect(retryButton).not.toBeNull();
    expect(retryButton.textContent).toBe("🔄 Try Again");
    expect(retryButton.disabled).toBe(false);
    expect(status.getAttribute("role")).toBe("alert");
});


test("loadRequests displays an empty state when the API returns no requests", async () => {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
            requests: [],
            nextOffset: null
        })
    });

    await loadRequests();

    const container = document.getElementById("incoming-requests");
    const loadMoreButton = document.getElementById("load-more-requests");

    expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/requests?direction=incoming&offset=0",
        {
            credentials: "include",
            cache: "no-store"
        }
    );

    expect(container.textContent).toContain("No swap requests yet!");
    expect(loadMoreButton.hidden).toBe(true);
    expect(loadMoreButton.disabled).toBe(false);

    delete global.fetch;
});
