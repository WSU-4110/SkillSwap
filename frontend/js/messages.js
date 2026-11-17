
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

// =========================
// NFR-5: ERROR HANDLING
// =========================

function showMessageError(element, message) {
    element.replaceChildren();
    element.textContent = message;
    element.setAttribute("role", "alert");
    element.style.color = "#991b1b";
}

function showMessageStatus(element, message) {
    element.replaceChildren();
    element.textContent = message;
    element.setAttribute("role", "status");
    element.style.color = "";
}

function getMessageError(error, action) {
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
// NFR-5 TASK 4: RETRY BUTTONS
// =========================

function showMessageRetry(element, message, retryAction) {
    element.replaceChildren();
    element.setAttribute("role", "alert");
    element.style.color = "";

    const text = document.createElement("p");
    text.textContent = message;
    text.style.color = "#b91c1c";
    text.style.marginBottom = "10px";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "swap-request-button";
    button.textContent = "🔄 Try Again";

    button.style.backgroundColor = "#2563eb";
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "8px";
    button.style.padding = "10px 18px";
    button.style.cursor = "pointer";

    button.addEventListener("click", function() {
        button.disabled = true;
        button.textContent = "Retrying...";

        Promise.resolve()
            .then(retryAction)
            .catch(function(error) {
                console.error("Retry failed:", error);
                showMessageRetry(
                    element,
                    getMessageError(error, "retry this action"),
                    retryAction
                );
            });
    });

    element.append(text, button);
}

// =========================
// API REQUESTS
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
        throw new Error(
            data.message || "Request failed: " + response.status
        );
    }

    return data;
}

// =========================
// FORMAT MESSAGE TIME
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

// =========================
// CREATE AVATAR
// =========================

function createAvatar(name, studentId) {
    const avatar = document.createElement("div");
    avatar.className = "chat-avatar";

    const initial =
        (name || "?").trim().charAt(0).toUpperCase();

    avatar.textContent = initial;

    if (!studentId) return avatar;

    const img = document.createElement("img");

    img.alt = name + "'s profile picture";
    img.src = API_URL + "/users/" +
        encodeURIComponent(studentId) + "/profile/image";

    img.onload = function() {
        avatar.replaceChildren(img);
    };

    img.onerror = function() {
        // Keep the initial if the image is unavailable.
    };

    return avatar;
}

// =========================
// UNREAD MESSAGE BADGE
// =========================

function updateNavigationBadge(totalUnread) {
    const badge =
        document.getElementById("nav-message-count");

    if (!badge) return;

    if (totalUnread > 0) {
        badge.hidden = false;
        badge.textContent =
            totalUnread > 99 ? "99+" : totalUnread;

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
// NFR-5 TASK 3: EMPTY STATES
// =========================

function showChatEmptyState(container, emoji, title, description) {
    container.replaceChildren();

    const box = document.createElement("div");
    box.className = "skills-box";
    box.style.textAlign = "center";
    box.style.padding = "30px 20px";
    box.style.margin = "15px";
    box.style.border = "1px solid #bfdbfe";
    box.style.borderRadius = "12px";
    box.style.backgroundColor = "#eff6ff";

    const symbol = document.createElement("div");
    symbol.textContent = emoji;
    symbol.style.fontSize = "32px";
    symbol.style.marginBottom = "10px";

    const heading = document.createElement("h3");
    heading.textContent = title;
    heading.style.color = "#1e40af";
    heading.style.marginBottom = "8px";

    const details = document.createElement("p");
    details.textContent = description;
    details.style.color = "#475569";
    details.style.margin = "0";

    box.append(symbol, heading, details);
    container.appendChild(box);
}

// =========================
// LOAD CONVERSATIONS
// =========================

async function loadConversations() {
    const data = await apiRequest("/conversations");

    if (!Array.isArray(data.conversations)) {
        throw new Error("Invalid conversation response.");
    }

    const conversations = data.conversations;

    conversationList.replaceChildren();

    conversationCount.textContent =
        conversations.length +
        (conversations.length === 1
            ? " conversation"
            : " conversations");

    const totalUnread = conversations.reduce(
        (total, conversation) =>
            total + (Number(
                conversation.unreadCount ??
                conversation.unread_count ??
                0
            ) || 0),
        0
    );

    updateNavigationBadge(totalUnread);

    if (conversations.length === 0) {
        showChatEmptyState(
            conversationList,
            "💬",
            "No conversations yet!",
            "Your SkillSwap chats will appear here. Browse students " +
                "and connect with someone to start swapping skills!"
        );
        return;
    }

    conversations.forEach(conversation => {
        const studentId =
            conversation.studentId ??
            conversation.student_id;

        const studentName =
            conversation.studentName ??
            conversation.student_name ??
            "Student";

        const lastMessage =
            conversation.lastMessage ??
            conversation.last_message ??
            "";

        const lastSenderId =
            conversation.lastSenderId ??
            conversation.last_sender_id;

        const lastMessageTime =
            conversation.lastMessageTime ??
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

        const avatar =
            createAvatar(studentName, studentId);

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
        showChatEmptyState(
            messageList,
            "👋",
            "Say hello!",
            "No messages in this chat yet. Break the ice and " +
                "start a conversation about swapping skills!"
        );
        return;
    }

    messages.forEach(message => {
        const isMine =
            Number(message.sender_id) === Number(currentUser.id);

        const row = document.createElement("div");
        row.className =
            "message-row " + (isMine ? "mine" : "theirs");

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
        throw new Error("Invalid messages response.");
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
        throw new Error(
            "Student profile could not be found."
        );
    }

    conversationName.textContent = otherUser.name;

    const avatar = createAvatar(otherUser.name, userId);
    const currentAvatar =
        document.getElementById("selected-avatar");

    if (currentAvatar) {
        currentAvatar.replaceWith(avatar);
        avatar.id = "selected-avatar";
    }

    await loadMessages();

    chatPlaceholder.hidden = true;
    conversationContent.hidden = false;
    conversationContent.style.display = "flex";

    await loadConversations();
}

// =========================
// INITIALIZE MESSAGES
// =========================

async function initializeMessages() {
    messagesLoading.hidden = false;
    conversationContent.hidden = true;
    chatPlaceholder.hidden = false;

    showMessageStatus(conversationStatus, "");

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

        showMessageRetry(
            conversationStatus,
            getMessageError(error, "load your messages"),
            initializeMessages
        );

    } finally {
        messagesLoading.hidden = true;
    }
}

// =========================
// SEND MESSAGE
// =========================

messageForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const content = messageInput.value.trim();

    if (!content) {
        showMessageError(
            messageStatus,
            "Please enter a message."
        );
        return;
    }

    if (!otherUser || !currentUser || !userId) {
        showMessageError(
            messageStatus,
            "No conversation selected."
        );
        return;
    }

    if (content.length > 2000) {
        showMessageError(
            messageStatus,
            "Messages cannot exceed 2000 characters."
        );
        return;
    }

    const sendButton =
        messageForm.querySelector('button[type="submit"]');

    sendButton.disabled = true;

    showMessageStatus(messageStatus, "Sending...");

    let sent = false;

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

        sent = true;
        messageInput.value = "";

        showMessageStatus(
            messageStatus,
            "Message sent!"
        );

        await loadMessages();
        await loadConversations();

    } catch (error) {
        console.error("Message sending error:", error);

        if (sent) {
            showMessageRetry(
                messageStatus,
                "Your message was sent, but the " +
                "conversation could not refresh.",
                async function() {
                    try {
                        await loadMessages();
                        await loadConversations();

                        showMessageStatus(
                            messageStatus,
                            "Conversation refreshed!"
                        );
                    } catch (retryError) {
                        showMessageRetry(
                            messageStatus,
                            getMessageError(
                                retryError,
                                "refresh the conversation"
                            ),
                            async function() {
                                await loadMessages();
                                await loadConversations();
                                showMessageStatus(
                                    messageStatus,
                                    "Conversation refreshed!"
                                );
                            }
                        );
                    }
                }
            );
        } else {
            // Do not automatically resend a message:
            // the server may have received the original request.
            showMessageError(
                messageStatus,
                getMessageError(error, "send your message") +
                " Check the conversation before sending again."
            );
        }

    } finally {
        sendButton.disabled = false;
    }
});

// =========================
// AUTOMATIC REFRESH
// =========================

// Refresh conversation previews and unread counts every 8 seconds.
setInterval(async function() {
    if (!currentUser || document.hidden) return;

    try {
        await loadConversations();

        if (userId && otherUser) {
            await loadMessages();
            await loadConversations();
        }

    } catch (error) {
        console.error("Message refresh failed:", error);

        showMessageRetry(
            conversationStatus,
            getMessageError(error, "refresh messages"),
            async function() {
                await loadConversations();

                if (userId && otherUser) {
                    await loadMessages();
                    await loadConversations();
                }

                showMessageStatus(conversationStatus, "");
            }
        );
    }
}, 8000);

// =========================
// INITIALIZE
// =========================

initializeMessages();
