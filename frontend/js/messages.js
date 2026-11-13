
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
const selectedAvatar =
    document.getElementById("selected-avatar");
const chatPlaceholder =
    document.getElementById("chat-placeholder");

let currentUser = null;
let otherUser = null;
let messages = [];

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

async function loadConversations() {
    const data = await apiRequest("/conversations");

    const conversations = Array.isArray(data.conversations)
        ? data.conversations
        : [];

    conversationList.replaceChildren();

    conversationCount.textContent =
        conversations.length + (
            conversations.length === 1
                ? " conversation"
                : " conversations"
        );

    const totalUnread = conversations.reduce(
        (total, conversation) =>
            total + (Number(conversation.unreadCount) || 0),
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

async function loadMessages() {
    const data = await apiRequest(
        "/messages/" + encodeURIComponent(userId)
    );

    messages = Array.isArray(data.messages)
        ? data.messages
        : [];

    displayMessages();
}

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

    const avatar = createAvatar(otherUser.name, userId);
    selectedAvatar.replaceWith(avatar);
    avatar.id = "selected-avatar";

    await loadMessages();

    chatPlaceholder.hidden = true;
    conversationContent.hidden = false;
    conversationContent.style.display = "flex";

    await loadConversations();
}

async function initializeMessages() {
    messagesLoading.hidden = false;
    conversationContent.hidden = true;
    chatPlaceholder.hidden = false;
    conversationStatus.textContent = "";

    try {
        const currentData = await apiRequest("/profile");
        currentUser = currentData.profile;

        if (!currentUser || !currentUser.id) {
            throw new Error("Could not identify your account.");
        }

        await loadConversations();

        if (userId) {
            await loadSelectedConversation();
        }

    } catch (error) {
        console.error("Messages loading error:", error);
        conversationStatus.textContent = error.message;

    } finally {
        messagesLoading.hidden = true;
    }
}

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

        await loadMessages();
        await loadConversations();

    } catch (error) {
        console.error("Message sending error:", error);
        messageStatus.textContent = error.message;

    } finally {
        sendButton.disabled = false;
    }
});

// Refresh conversation previews and unread counts every 8 seconds.
setInterval(async function () {
    if (!currentUser) return;

    try {
        await loadConversations();

        if (userId && otherUser && !document.hidden) {
            await loadMessages();
            await loadConversations();
        }
    } catch (error) {
        console.error("Message refresh failed:", error);
    }
}, 8000);

initializeMessages();
