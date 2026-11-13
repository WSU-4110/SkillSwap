"use strict";

(function () {
    const API = "http://localhost:3000/api";
    const badgeId = "global-message-badge";

    async function updateUnreadBadge() {
        const badge = document.getElementById(badgeId);
        if (!badge) return;

        try {
            const response = await fetch(API + "/conversations", {
                credentials: "include",
                cache: "no-store"
            });

            if (!response.ok) {
                badge.hidden = true;
                return;
            }

            const data = await response.json();
            const conversations = Array.isArray(data.conversations)
                ? data.conversations
                : [];

            const unread = conversations.reduce((total, chat) => {
                return total + (Number(
                    chat.unreadCount ?? chat.unread_count ?? 0
                ) || 0);
            }, 0);

            badge.hidden = unread === 0;
            badge.textContent = unread > 99 ? "99+" : String(unread);

        } catch (error) {
            console.error("Unread notification error:", error);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        updateUnreadBadge();
        setInterval(updateUnreadBadge, 8000);
    });
})();
