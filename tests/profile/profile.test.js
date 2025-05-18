import { jest, test, expect, beforeAll } from "@jest/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  typeWriter,
  animateInput,
  createReadOnlyInput,
} from "../../profile/profile.js";

const mockProfile = {
  url: "http://localhost/",
  fullName: "John Doe",
  headline: "Senior Software Engineer",
  location: "Malaga, Spain",
  about: "Passionate software engineer with over 10 years of experience.",
  experience: [
    {
      title: "Software Engineer",
      company: "Acme Corp",
      employmentType: "",
      date: "Jan 2020 - Present",
    },
    {
      title: "Junior Developer",
      company: "Beta LLC",
      employmentType: "",
      date: "Jun 2018 - Dec 2018",
    },
    {
      title: "Developer",
      company: "Beta LLC",
      employmentType: "",
      date: "Jan 2019 - Dec 2019",
    },
  ],
  education: [
    {
      school: "State University",
      degree: "Bachelor of Science",
      dateRange: "2014 • 2018",
      description: "",
    },
  ],
  skills: ["JavaScript", "React", "Node.js"],
};

global.chrome = {
  storage: {
    local: {
      get: jest.fn(() => Promise.resolve({ profileData: mockProfile })),
    },
  },
  runtime: {
    onMessage: {
      addListener: jest.fn((fn) => {
        global.chrome._messageListener = fn;
      }),
    },
  },
  _messageListener: () => {},
};

beforeAll(async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const htmlContent = fs.readFileSync(
    path.resolve(__dirname, "../fixtures/mockProfileCard.html"),
    "utf8"
  );
  const bodyContent = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  document.body.innerHTML = bodyContent ? bodyContent[1] : htmlContent;

  window.skipAnimations = true;

  await import("../../profile/profile.js");
  document.dispatchEvent(new Event("DOMContentLoaded"));
  await new Promise((resolve) => setTimeout(resolve, 10));
});

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      media: "",
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  };

// ───── Profile Rendering ─────

test("renders profile data from chrome.storage", () => {
  expect(document.getElementById("fullName").value).toBe(mockProfile.fullName);
  expect(document.getElementById("headline").value).toBe(mockProfile.headline);
  expect(document.getElementById("location").value).toBe(mockProfile.location);
  expect(document.getElementById("about").value).toBe(mockProfile.about);
  expect(document.getElementById("skills").value).toContain("JavaScript");
});

test("chrome.runtime.onMessage triggers renderProfile for SAVE_PROFILE", async () => {
  const { profileData } = await global.chrome.storage.local.get("profileData");

  expect(typeof global.chrome._messageListener).toBe("function");

  global.chrome._messageListener({
    type: "SAVE_PROFILE",
    data: profileData,
  });

  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(document.getElementById("fullName").value).toBe(profileData.fullName);
  expect(document.getElementById("headline").value).toBe(profileData.headline);
  expect(document.getElementById("location").value).toBe(profileData.location);
  expect(document.getElementById("about").value).toBe(profileData.about);
});

test("discard button clears profileData and closes window", async () => {
  const mockRemove = jest.fn(() => Promise.resolve());
  global.chrome.storage.local.remove = mockRemove;
  window.close = jest.fn();

  const discardBtn = document.getElementById("discard-profile-btn");
  discardBtn.click();

  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(mockRemove).toHaveBeenCalledWith("profileData");
  expect(window.close).toHaveBeenCalled();
});

// ───── UI Components ─────

test("createReadOnlyInput returns correct input element", () => {
  const input = createReadOnlyInput("testing", "value");
  expect(input.tagName).toBe("INPUT");
  expect(input.type).toBe("text");
  expect(input.readOnly).toBe(true);
  expect(input.className).toBe("testing");
  expect(input.value).toBe("value");
  expect(input.hasAttribute("readonly")).toBe(true);
});

test("animateInput appends and queues animation", () => {
  const container = document.createElement("div");
  const animations = [];
  const input = animateInput(container, "job-role", "Lead Dev", animations);

  expect(input.tagName).toBe("INPUT");
  expect(container.querySelector(".job-role")).toBe(input);
  expect(animations.length).toBe(1);
});

// ───── Animation ─────

test("typeWriter sets value immediately if animations are skipped", async () => {
  window.skipAnimations = true;
  const input = document.createElement("input");
  await typeWriter(input, "Hello");
  expect(input.value).toBe("Hello");
});

test("typeWriter animates text incrementally when enabled", async () => {
  jest.useFakeTimers();
  window.skipAnimations = false;

  const input = document.createElement("input");
  const typing = typeWriter(input, "Test", 50);

  jest.advanceTimersByTime(100);
  expect(input.value.length).toBeGreaterThan(0);
  jest.advanceTimersByTime(200);

  await typing;
  expect(input.value).toBe("Test");
  jest.useRealTimers();
});
