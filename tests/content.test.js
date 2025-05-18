/**
 * @jest-environment jsdom
 *
 * Verifies that content.js scrapes all profile fields correctly
 * against our mockProfile.html fixture.
 */

import { jest, describe, test, expect, beforeEach } from "@jest/globals";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let profile;
let scrapeSkills;

// Polyfill innerText in jsdom by delegating to textContent
Object.defineProperty(HTMLElement.prototype, "innerText", {
  get() {
    return this.textContent;
  },
  set(value) {
    // if your code ever assigns to innerText, mirror it to textContent
    this.textContent = value;
  },
  configurable: true,
});

// Mock the Chrome APIs so storage/runtime calls don’t blow up
import "jest-chrome";
global.chrome = {
  storage: { local: { set: jest.fn((obj, cb) => cb && cb()) } },
  runtime: { sendMessage: jest.fn() },
};

describe("Full LinkedIn Profile Scraping", () => {
  beforeEach(async () => {
    const html = fs.readFileSync(
      path.resolve(__dirname, "./fixtures/mockProfile.html"),
      "utf8"
    );

    // Only inject the content inside <body>…</body> so selectors can find elements
    document.body.innerHTML = html.toString();
    // Import the core module and allow its IIFE to run
    await import("../content.js");
    profile= window.profile;
    scrapeSkills = window.scrapeSkills;
  });

  test("parses basic profile fields", async () => {
    expect(profile.fullName).toBe("John Doe");
    expect(profile.headline).toBe("Senior Software Engineer");
    expect(profile.location).toBe("Malaga, Spain");
    expect(profile.about).toBe(
      "Passionate software engineer with over 10 years of experience."
    );
  });

  test("parses experience entries", () => {
    expect(profile.experience).toEqual([
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
    ]);
  });

  test("parses education entries", () => {
    expect(profile.education).toEqual([
      {
        school: "State University",
        degree: "Bachelor of Science",
        dateRange: "2014 • 2018",
        description: "",
      },
    ]);
  });

  test("scrapeSkills() returns the correct array", async () => {
    const skills = await scrapeSkills();
    expect(skills).toEqual(["JavaScript", "React", "Node.js"]);
  });
});
