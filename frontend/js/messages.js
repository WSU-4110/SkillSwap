
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

const user = messageUsers.find(function (student) {
    return student.id === userId;
});

const conversationName = document.getElementById("conversation-name");
const conversationStatus = document.getElementById("conversation-status");
const conversationContent = document.getElementById("conversation-content");
const messageList = document.getElementById("message-list");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messageStatus = document.getElementById("message-status");

let messages = [];

function displayMessages() {
    messageList.replaceChildren();

    if (messages.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No messages yet. Start the conversation!";
        messageList.appendChild(emptyMessage);
        return;
    }

    messages.forEach(function (message) {
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

function loadConversation() {
    if (!user) {
        conversationName.textContent = "";
        conversationStatus.textContent = "Student not found.";
        return;
    }

    if (!acceptedUserIds.includes(user.id)) {
        conversationName.textContent = "";
        conversationStatus.textContent =
            "Messaging is only available after a skill-swap request is accepted.";
        return;
    }

    conversationName.textContent = "Conversation with " + user.name;

    // Local demo storage, not a real private conversation.
    try {
        const savedMessages = localStorage.getItem("skillswapMessages-" + user.id);
        const parsedMessages = savedMessages ? JSON.parse(savedMessages) : [];

        messages = Array.isArray(parsedMessages)
            ? parsedMessages.filter(function (message) {
                return typeof message === "string";
            })
            : [];
    } catch (error) {
        messages = [];
        conversationStatus.textContent =
            "Saved demo messages could not be loaded.";
    }

    conversationContent.hidden = false;
    displayMessages();
}

messageForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!user || !acceptedUserIds.includes(user.id)) {
        messageStatus.textContent = "You cannot send messages to this student.";
        messageStatus.style.color = "red";
        return;
    }

    const text = messageInput.value.trim();

    if (text === "") {
        messageStatus.textContent = "Please enter a message.";
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
        messageStatus.textContent = "Demo message saved successfully!";
        messageStatus.style.color = "green";

        displayMessages();
    } catch (error) {
        messageStatus.textContent =
            "Message could not be saved. Please try again.";
        messageStatus.style.color = "red";
    }
});

loadConversation();
