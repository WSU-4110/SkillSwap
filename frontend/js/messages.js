
"use strict";

// Temporary sample students for frontend testing.
const messageUsers = [
    { id: "1", name: "Student One" },
    { id: "2", name: "Student Two" }
];

// Temporary accepted request for testing only.
const acceptedUserIds = ["1"];

const params = new URLSearchParams(window.location.search);
const userId = params.get("id");

const user = messageUsers.find(function(student) {
    return student.id === userId;
});

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

let messages = [];

// =========================
// DISPLAY MESSAGES
// =========================

function displayMessages() {
    messageList.replaceChildren();

    if (messages.length === 0) {
        const emptyMessage = document.createElement("p");

        emptyMessage.textContent =
            "No messages yet. Start the conversation!";

        messageList.appendChild(emptyMessage);
        return;
    }

    messages.forEach(function(message) {
        const messageBox = document.createElement("div");
        messageBox.className = "message-box";

        const sender = document.createElement("strong");
        sender.textContent = "You";

        const text = document.createElement("p");
        text.textContent = message;

        messageBox.append(sender, text);
        messageList.appendChild(messageBox);
    });
}

// =========================
// NFR-5: LOAD CONVERSATION
// =========================

function loadConversation() {
    if (messagesLoading) {
        messagesLoading.hidden = false;
    }

    conversationContent.hidden = true;
    conversationStatus.textContent = "";

    try {
        if (!user) {
            conversationName.textContent = "Your Messages";

            conversationStatus.textContent = userId
                ? "Student not found."
                : "No conversation selected. Browse students to start a conversation.";

            return;
        }

        if (!acceptedUserIds.includes(user.id)) {
            conversationName.textContent = "";

            conversationStatus.textContent =
                "Messaging is only available after a skill-swap request is accepted.";

            return;
        }

        conversationName.textContent =
            "Conversation with " + user.name;

        // Local demo storage, not a real private conversation.
        try {
            const savedMessages = localStorage.getItem(
                "skillswapMessages-" + user.id
            );

            const parsedMessages = savedMessages
                ? JSON.parse(savedMessages)
                : [];

            messages = Array.isArray(parsedMessages)
                ? parsedMessages.filter(function(message) {
                    return typeof message === "string";
                })
                : [];

        } catch (error) {
            console.error("Message storage error:", error);

            messages = [];

            conversationStatus.textContent =
                "Saved demo messages could not be loaded.";
        }

        displayMessages();
        conversationContent.hidden = false;

    } catch (error) {
        console.error("Conversation loading error:", error);

        conversationStatus.textContent =
            "Could not load conversation. Please try again.";

    } finally {
        // NFR-5: Hide spinner when loading finishes.
        if (messagesLoading) {
            messagesLoading.hidden = true;
        }
    }
}

// =========================
// SEND DEMO MESSAGE
// =========================

messageForm.addEventListener("submit", function(event) {
    event.preventDefault();

    if (!user || !acceptedUserIds.includes(user.id)) {
        messageStatus.textContent =
            "You cannot send messages to this student.";

        messageStatus.style.color = "red";
        return;
    }

    const text = messageInput.value.trim();

    if (text === "") {
        messageStatus.textContent =
            "Please enter a message.";

        messageStatus.style.color = "red";
        return;
    }

    const updatedMessages = messages.concat(text);

    try {
        localStorage.setItem(
            "skillswapMessages-" + user.id,
            JSON.stringify(updatedMessages)
        );

        messages = updatedMessages;
        messageInput.value = "";

        messageStatus.textContent =
            "Demo message saved successfully!";

        messageStatus.style.color = "green";

        displayMessages();

    } catch (error) {
        console.error("Message saving error:", error);

        messageStatus.textContent =
            "Message could not be saved. Please try again.";

        messageStatus.style.color = "red";
    }
});

// =========================
// START
// =========================

loadConversation();
