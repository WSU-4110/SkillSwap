/**
 * @jest-environment jsdom
 */

const {
    getProfileError,
    showProfileMessage,
    readApiResponse,
    showSkillEmptyState,
    displaySkills,
    showProfileRetryButton
} = require("../../frontend/js/profile.js");

describe("getProfileError", () => {
    test("returns the correct message for a timeout error", () => {
        const error = new Error("Request timed out");
        error.name = "AbortError";

        expect(getProfileError(error, "load profile"))
            .toBe("The request took too long. Please try again.");
    });

    test("returns the correct message for a connection error", () => {
        const error = new TypeError("Failed to fetch");

        expect(getProfileError(error, "load profile"))
            .toBe("Unable to connect to SkillSwap. Please check your connection and try again.");
    });

    test("returns a general error message", () => {
        const error = new Error("Server error");

        expect(getProfileError(error, "load profile"))
            .toBe("Could not load profile. Please try again later.");
    });
});

describe("showProfileMessage", () => {
    test("displays a success message", () => {
        const element = document.createElement("div");

        showProfileMessage(element, "Profile saved!");

        expect(element.textContent).toBe("Profile saved!");
        expect(element.hidden).toBe(false);
        expect(element.style.color).toBe("green");
        expect(element.getAttribute("role")).toBe("status");
    });

    test("displays an error message", () => {
        const element = document.createElement("div");

        showProfileMessage(element, "Something went wrong", true);

        expect(element.textContent).toBe("Something went wrong");
        expect(element.style.color).toBe("rgb(153, 27, 27)");
        expect(element.getAttribute("role")).toBe("alert");
    });

    test("handles a missing element", () => {
        expect(() => {
            showProfileMessage(null, "Test");
        }).not.toThrow();
    });
});

describe("readApiResponse", () => {
    test("returns data for a successful API response", async () => {
        const response = {
            status: 200,
            ok: true,
            json: jest.fn().mockResolvedValue({ name: "Lana" })
        };

        const result = await readApiResponse(response, "load profile");

        expect(result).toEqual({ name: "Lana" });
    });

    test("throws the server error message", async () => {
        const response = {
            status: 400,
            ok: false,
            json: jest.fn().mockResolvedValue({
                message: "Invalid profile"
            })
        };

        await expect(
            readApiResponse(response, "save profile")
        ).rejects.toThrow("Invalid profile");
    });

    test("uses a fallback message when the API fails", async () => {
        const response = {
            status: 500,
            ok: false,
            json: jest.fn().mockRejectedValue(new Error("Invalid JSON"))
        };

        await expect(
            readApiResponse(response, "save profile")
        ).rejects.toThrow("Could not save profile.");
    });
});

describe("showSkillEmptyState", () => {
    test("displays the correct title and description", () => {
        const list = document.createElement("ul");

        showSkillEmptyState(
            list,
            "No skills yet",
            "Add your first skill!"
        );

        expect(list.querySelector("h3").textContent)
            .toBe("No skills yet");

        expect(list.querySelector("p").textContent)
            .toBe("Add your first skill!");
    });

    test("creates a list item with the correct styling", () => {
        const list = document.createElement("ul");

        showSkillEmptyState(list, "Empty", "No skills");

        expect(list.querySelectorAll("li")).toHaveLength(1);
        expect(list.querySelector(".skills-box")).not.toBeNull();
    });

    test("adds an empty state without deleting existing items", () => {
        const list = document.createElement("ul");
        const existingItem = document.createElement("li");
        existingItem.textContent = "Existing skill";
        list.appendChild(existingItem);

        showSkillEmptyState(list, "Empty", "Add skills");

        expect(list.querySelectorAll("li")).toHaveLength(2);
        expect(list.firstElementChild.textContent)
            .toBe("Existing skill");
    });
});

describe("displaySkills", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <ul id="teach-skills"></ul>
            <ul id="learn-skills"></ul>
        `;
    });

    test("displays a list of skill names", () => {
        displaySkills("teach-skills", ["JavaScript", "Python"]);

        const items = document.querySelectorAll("#teach-skills li");

        expect(items).toHaveLength(2);
        expect(items[0].textContent).toBe("JavaScript");
        expect(items[1].textContent).toBe("Python");
    });

    test("displays skills provided as objects", () => {
        displaySkills("learn-skills", [
            { name: "HTML" },
            { name: "CSS" }
        ]);

        const items = document.querySelectorAll("#learn-skills li");

        expect(items).toHaveLength(2);
        expect(items[0].textContent).toBe("HTML");
        expect(items[1].textContent).toBe("CSS");
    });

    test("displays an empty state when no skills exist", () => {
        displaySkills("teach-skills", []);

        expect(document.querySelector("#teach-skills h3").textContent)
            .toBe("Your teaching journey starts here!");
    });

    test("displays an error when skills data is invalid", () => {
        displaySkills("learn-skills", null);

        expect(document.querySelector("#learn-skills li").textContent)
            .toBe("Couldn't load skills. Please try again.");
    });
});

describe("showProfileRetryButton", () => {
    test("displays the retry message and button", () => {
        const container = document.createElement("div");
        const retryAction = jest.fn();

        showProfileRetryButton(
            container,
            "Failed to load profile",
            retryAction
        );

        expect(container.textContent).toContain("Failed to load profile");
        expect(container.querySelector("button").textContent)
            .toBe("🔄 Try Again");
        expect(container.getAttribute("role")).toBe("alert");
        expect(container.hidden).toBe(false);
    });

    test("calls retryAction when the button is clicked", async () => {
        const container = document.createElement("div");
        const retryAction = jest.fn().mockResolvedValue(undefined);

        showProfileRetryButton(container, "Try again", retryAction);

        const button = container.querySelector("button");
        button.click();

        expect(retryAction).toHaveBeenCalledTimes(1);
        expect(button.disabled).toBe(true);
        expect(button.textContent).toBe("Retrying...");
    });

    test("does nothing when the container is missing", () => {
        const retryAction = jest.fn();

        expect(() => {
            showProfileRetryButton(null, "Error", retryAction);
        }).not.toThrow();

        expect(retryAction).not.toHaveBeenCalled();
    });
});