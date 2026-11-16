
"use strict";

const API_URL = "http://localhost:3000/api";

const params = new URLSearchParams(window.location.search);
const userId = params.get("userId") || params.get("id");

const conversationName =
    document.getElementById("conversation-name");
const conversationStatus =
    document.getElementById("conversation-status");
const conversationContent =
    document.getElementById("conversation-content");
const messagesLoading =
    document.getElementById("messages-loading");
const messageList =
    document.getElementById("message-list");
const messageForm =
    document.getElementById("message-form");
const messageInput =
    document.getElementById("message-input");
const messageStatus =
    document.getElementById("message-status");

const conversationList =
    document.getElementById("conversation-list");
const conversationCount =
    document.getElementById("conversation-count");
const chatPlaceholder =
    document.getElementById("chat-placeholder");

let currentUser = null;
let otherUser = null;
let messages = [];
let isInitializing = false;
let isRefreshing = false;

// =========================
// NFR-5 TASK 4: RETRY BUTTON
// =========================

function showMessagesRetryButton(container, message, retryAction) {
    container.replaceChildren();

    const wrapper = document.createElement("div");
    wrapper.style.padding = "20px";
    wrapper.style.textAlign = "center";
    wrapper.style.backgroundColor = "#eff6ff";
    wrapper.style.border = "1px solid #bfdbfe";
    wrapper.style.borderRadius = "12px";
    wrapper.style.margin = "12px 0";

    const text = document.createElement("p");
    text.textContent = message;
    text.style.color = "#b91c1c";
    text.style.marginBottom = "12px";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "swap-request-button";
    button.textContent = "🔄 Try Again";
    button.style.backgroundColor = "#2563eb";
    button.style.color = "#ffffff";
    button.style.border = "none";
    button.style.borderRadius = "8px";
    button.style.padding = "10px 18px";
    button.style.cursor = "pointer";

    button.addEventListener("click", async function () {
        button.disabled = true;
        button.textContent = "Retrying...";

        try {
            await retryAction();
        } catch (error) {
            if (error.message === "Please log in again.") {
                return;
            }

            console.error("Message retry failed:", error);

            showMessagesRetryButton(
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
// API REQUEST
// =========================

async function apiRequest(url, options = {}) {
    const response = await fetch(API_URL + url, {
        credentials: "include",
        cache: "no-store",
        ...options
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        window.location.replace("login.html");
        throw new Error("Please log in again.");
    }

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

// =========================
// FORMATTING
// =========================

function formatTime(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString([], {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function createAvatar(name, studentId) {
    const avatar = document.createElement("div");
    avatar.className = "chat-avatar";

    const initial = (name || "?").trim().charAt(0).toUpperCase();
    avatar.textContent = initial;

    if (!studentId) return avatar;

    const img = document.createElement("img");

    img.alt = name + "'s profile picture";
    img.src = API_URL + "/users/" +
        encodeURIComponent(studentId) + "/profile/image";

    img.onload = function () {
        avatar.replaceChildren(img);
    };

    img.onerror = function () {
        // Keep the initial if no profile image exists.
    };

    return avatar;
}

function updateNavigationBadge(totalUnread) {
    const badge = document.getElementById("nav-message-count");

    if (!badge) return;

    if (totalUnread > 0) {
        badge.hidden = false;
        badge.textContent = totalUnread > 99 ? "99+" : totalUnread;
        badge.setAttribute(
            "aria-label",
            totalUnread + " unread messages"
        );
    } else {
        badge.hidden = true;
        badge.textContent = "";
    }
}

// =========================
// LOAD CONVERSATIONS
// =========================

async function loadConversations() {
    const data = await apiRequest("/conversations");

    if (!Array.isArray(data.conversations)) {
        throw new Error("Could not read conversations.");
    }

    const conversations = data.conversations;

    conversationList.replaceChildren();

    conversationCount.textContent =
        conversations.length + (
            conversations.length === 1
                ? " conversation"
                : " conversations"
        );

    const totalUnread = conversations.reduce(
        (total, conversation) =>
            total + Number(
                conversation.unreadCount ??
                conversation.unread_count ??
                0
            ),
        0
    );

    updateNavigationBadge(totalUnread);

    if (conversations.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No conversations yet.";
        empty.style.padding = "15px";
        conversationList.appendChild(empty);
        return;
    }

    conversations.forEach(conversation => {
        const studentId = conversation.studentId ??
            conversation.student_id;

        const studentName = conversation.studentName ??
            conversation.student_name ??
            "Student";

        const lastMessage = conversation.lastMessage ??
            conversation.last_message ??
            "";

        const lastSenderId = conversation.lastSenderId ??
            conversation.last_sender_id;

        const lastMessageTime = conversation.lastMessageTime ??
            conversation.last_message_time;

        const unreadCount = Number(
            conversation.unreadCount ??
            conversation.unread_count ??
            0
        );

        const link = document.createElement("a");
        link.className = "conversation-item";
        link.href = "messages.html?userId=" +
            encodeURIComponent(studentId);

        if (String(studentId) === String(userId)) {
            link.classList.add("active-conversation");
        }

        const avatar = createAvatar(studentName, studentId);

        const details = document.createElement("div");
        details.className = "conversation-details";

        const topline = document.createElement("div");
        topline.className = "conversation-topline";

        const name = document.createElement("strong");
        name.textContent = studentName;

        const time = document.createElement("small");
        time.textContent = formatTime(lastMessageTime);

        topline.append(name, time);

        const preview = document.createElement("p");
        preview.className = "conversation-preview";

        const isMine =
            Number(lastSenderId) === Number(currentUser.id);

        preview.textContent =
            (isMine ? "You: " : "") + lastMessage;

        details.append(topline, preview);
        link.append(avatar, details);

        if (unreadCount > 0) {
            const badge = document.createElement("span");
            badge.className = "chat-unread-badge";
            badge.textContent =
                unreadCount > 99 ? "99+" : unreadCount;

            badge.setAttribute(
                "aria-label",
                unreadCount + " unread messages"
            );

            link.appendChild(badge);
        }

        conversationList.appendChild(link);
    });
}

// =========================
// DISPLAY MESSAGES
// =========================

function displayMessages() {
    messageList.replaceChildren();

    if (messages.length === 0) {
        const empty = document.createElement("p");
        empty.textContent =
            "No messages yet. Start the conversation!";
        messageList.appendChild(empty);
        return;
    }

    messages.forEach(message => {
        const isMine =
            Number(message.sender_id) === Number(currentUser.id);

        const row = document.createElement("div");
        row.className = "message-row " +
            (isMine ? "mine" : "theirs");

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";

        const content = document.createElement("p");
        content.textContent = message.content;

        const timestamp = document.createElement("small");
        timestamp.textContent = formatTime(message.created_at);

        bubble.append(content, timestamp);
        row.appendChild(bubble);
        messageList.appendChild(row);
    });

    messageList.scrollTop = messageList.scrollHeight;
}

// =========================
// LOAD MESSAGES
// =========================

async function loadMessages() {
    const data = await apiRequest(
        "/messages/" + encodeURIComponent(userId)
    );

    if (!Array.isArray(data.messages)) {
        throw new Error("Could not read messages.");
    }

    messages = data.messages;
    displayMessages();
}

// =========================
// LOAD SELECTED CONVERSATION
// =========================

async function loadSelectedConversation() {
    if (!/^[1-9]\d*$/.test(userId)) {
        throw new Error("Invalid student ID.");
    }

    if (Number(currentUser.id) === Number(userId)) {
        throw new Error("You cannot message yourself.");
    }

    const profileData = await apiRequest(
        "/users/" + encodeURIComponent(userId) + "/profile"
    );

    otherUser = profileData.profile;

    if (!otherUser || !otherUser.name) {
        throw new Error("Student profile could not be found.");
    }

    conversationName.textContent = otherUser.name;

    const previousAvatar =
        document.getElementById("selected-avatar");

    if (previousAvatar) {
        const avatar = createAvatar(otherUser.name, userId);
        previousAvatar.replaceWith(avatar);
        avatar.id = "selected-avatar";
    }

    chatPlaceholder.hidden = true;
    conversationContent.hidden = false;
    conversationContent.style.display = "flex";

    try {
        await loadMessages();
    } catch (error) {
        if (error.message === "Please log in again.") {
            throw error;
        }

        console.error("Message loading error:", error);

        showMessagesRetryButton(
            messageList,
            "Could not load this conversation.",
            loadMessages
        );
    }
}

// =========================
// INITIALIZE MESSAGES
// =========================

async function initializeMessages() {
    if (isInitializing) return;

    isInitializing = true;

    messagesLoading.hidden = false;
    conversationStatus.replaceChildren();

    try {
        const currentData = await apiRequest("/profile");
        currentUser = currentData.profile;

        if (!currentUser || !currentUser.id) {
            throw new Error("Could not identify your account.");
        }

        try {
            await loadConversations();
        } catch (error) {
            if (error.message === "Please log in again.") {
                throw error;
            }

            console.error("Conversations loading error:", error);

            showMessagesRetryButton(
                conversationList,
                "Could not load your conversations.",
                loadConversations
            );
        }

        if (userId) {
            await loadSelectedConversation();
        }

    } catch (error) {
        console.error("Messages loading error:", error);

        if (error.message !== "Please log in again.") {
            showMessagesRetryButton(
                conversationStatus,
                "Could not load your messages. Please try again.",
                initializeMessages
            );
        }

    } finally {
        messagesLoading.hidden = true;
        isInitializing = false;
    }
}

// =========================
// SEND MESSAGE
// =========================

messageForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const content = messageInput.value.trim();

    if (!content) {
        messageStatus.textContent = "Please enter a message.";
        return;
    }

    if (!otherUser || !currentUser || !userId) {
        messageStatus.textContent = "No conversation selected.";
        return;
    }

    if (content.length > 2000) {
        messageStatus.textContent =
            "Messages cannot exceed 2000 characters.";
        return;
    }

    const sendButton =
        messageForm.querySelector('button[type="submit"]');

    sendButton.disabled = true;
    messageStatus.textContent = "Sending...";

    try {
        await apiRequest("/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                receiverId: Number(userId),
                content: content
            })
        });

        messageInput.value = "";
        messageStatus.textContent = "Message sent!";

        try {
            await loadMessages();
        } catch (error) {
            if (error.message !== "Please log in again.") {
                showMessagesRetryButton(
                    messageList,
                    "Message sent, but the conversation could not refresh.",
                    loadMessages
                );
            }
        }

        try {
            await loadConversations();
        } catch (error) {
            if (error.message !== "Please log in again.") {
                showMessagesRetryButton(
                    conversationList,
                    "Could not refresh your conversations.",
                    loadConversations
                );
            }
        }

    } catch (error) {
        console.error("Message sending error:", error);

        messageStatus.textContent = error.message;

        // Do not automatically resend a POST request.
        // The server may have received the message already.

    } finally {
        sendButton.disabled = false;
    }
});

// =========================
// AUTO-REFRESH MESSAGES
// =========================

setInterval(async function () {
    if (!currentUser || isInitializing || isRefreshing) return;

    isRefreshing = true;

    try {
        await loadConversations();

        if (userId && otherUser && !document.hidden) {
            await loadMessages();
        }

    } catch (error) {
        console.error("Message refresh failed:", error);

        if (error.message === "Please log in again.") {
            return;
        }

        if (userId && otherUser) {
            showMessagesRetryButton(
                conversationStatus,
                "Could not refresh messages.",
                async function () {
                    await loadConversations();
                    await loadMessages();
                    conversationStatus.replaceChildren();
                }
            );
        } else {
            showMessagesRetryButton(
                conversationStatus,
                "Could not refresh conversations.",
                async function () {
                    await loadConversations();
                    conversationStatus.replaceChildren();
                }
            );
        }

    } finally {
        isRefreshing = false;
    }
}, 8000);

// =========================
// INITIAL LOAD
// =========================

initializeMessages();
