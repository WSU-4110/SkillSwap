
"use strict";

(function () {
    const API = "http://localhost:3000/api";
    const badgeId = "global-request-badge";

    async function updateRequestBadge() {
        const badge = document.getElementById(badgeId);
        if (!badge) return;

        try {
            let offset = 0;
            let pendingCount = 0;
            const visitedOffsets = new Set();

            // Count pending incoming requests across pages.
            while (offset !== null && !visitedOffsets.has(offset)) {
                visitedOffsets.add(offset);

                const response = await fetch(
                    `${API}/requests?direction=incoming&offset=${offset}`,
                    {
                        credentials: "include",
                        cache: "no-store"
                    }
                );

                if (!response.ok) {
                    badge.hidden = true;
                    return;
                }

                const data = await response.json();
                const requests = Array.isArray(data.requests)
                    ? data.requests
                    : [];

                pendingCount += requests.filter(request =>
                    String(request.status).toLowerCase() === "pending"
                ).length;

                offset = data.nextOffset ?? null;
            }

            badge.hidden = pendingCount === 0;
            badge.textContent = pendingCount > 99
                ? "99+"
                : String(pendingCount);

            badge.setAttribute(
                "aria-label",
                `${pendingCount} pending incoming requests`
            );

        } catch (error) {
            console.error("Request notification error:", error);
            badge.hidden = true;
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        updateRequestBadge();
        setInterval(updateRequestBadge, 8000);
    });
})();
