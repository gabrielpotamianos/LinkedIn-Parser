/**
 * @fileoverview
 * This Cypress end-to-end test suite validates the functionality of the extension's data parser and combined authentication page.
 * author @gabri-da-dev 
 */

const MOCK_IFRAME_TAB_ID = 999;
const linkedinUrl = "https://www.linkedin.com/in/test-user";

/**
 * Creates a mock iframe with the specified HTML content.
 * @param {Window} win - The window object to create the iframe in.
 * @param {string} html - The HTML content to populate the iframe with.
 * @returns {HTMLIFrameElement} The created iframe element.
 */
const createMockIframe = (win, html) => {
  const iframe = win.document.createElement("iframe");
  iframe.id = "mockLinkedInIframe";
  Object.assign(iframe.style, { position: "absolute", top: "-9999px" });
  win.document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();

  return iframe;
};

/**
 * Fills and submits the login form.
 * @param {string} email - The email address to enter.
 * @param {string} password - The password to enter.
 * @returns {Cypress.Chainable<JQuery<HTMLElement>>} Chainable Cypress object for the login button click.
 */
const login = (email, password) => {
  cy.get("#email-login").clear().type(email);
  cy.get("#pass-login").clear().type(password);
  return cy.get("#login-btn").click();
};

/**
 * Registers a new user with email, password and confirmPassword.
 * @param {string} email - The email address to register.
 * @param {string} password - The password to register.
 * @param {string} confirmPassword - The password confirmation.
 * @returns {Cypress.Chainable<JQuery<HTMLElement>>} Chainable Cypress object for the register button click.
 */
const register = (email, password, confirmPassword) => {
  switchToRegister();
  cy.get("#email-reg").clear().type(email);
  cy.get("#pass-reg").clear().type(password);
  cy.get("#pass-confirm").clear().type(confirmPassword);
  return cy.get("#register-btn").click();
};

/**
 * Sets up the chrome API stubs on the iframe window.
 * @param {Window} iframeWin - The iframe window object.
 * @param {Object} chromeStubs - The chrome stubs object.
 * @param {number} tabId - The tab ID to assign.
 */
const setupChromeOnIframe = (iframeWin, chromeStubs, tabId) => {
  iframeWin.chrome = chromeStubs;
  iframeWin.chrome.storage = chromeStubs.storage;
  iframeWin.chrome.tabs = chromeStubs.tabs;
  iframeWin.chrome.runtime = chromeStubs.runtime;
  iframeWin.chrome.scripting = chromeStubs.scripting;
  iframeWin.tabId = tabId;
};

/**
 * Stubs the chrome API on the given window object.
 * @param {Object} config - Configuration object.
 * @param {Window} config.win - The window object to stub.
 * @param {Object} config.storageObj - The storage object to use.
 * @param {string} config.linkedinUrl - The LinkedIn URL to respond with.
 * @param {{count: number}} config.tabRef - Reference object counting tab queries.
 * @param {string} [config.mockIframeUrl] - Optional mock iframe URL.
 * @param {number} [config.mockIframeTabId] - Optional mock iframe tab ID.
 */
const stubChromeAPI = ({ win, storageObj, linkedinUrl, tabRef, mockIframeUrl, mockIframeTabId }) => {
  win.chrome = {
    storage: {
      local: {
        get: (keys) => {
          if (typeof keys === "string") {
            return Promise.resolve({ [keys]: storageObj[keys] });
          }
          return Promise.resolve({ ...storageObj });
        },
        set: (items) => {
          Object.assign(storageObj, items);
          return Promise.resolve();
        },
        remove: (keys) => {
          if (typeof keys === "string") {
            delete storageObj[keys];
          } else if (Array.isArray(keys)) {
            keys.forEach((k) => {
              delete storageObj[k];
            });
          }
          return Promise.resolve();
        },
      },
    },
    runtime: {
      getURL: (path) => `${win.location.origin}/${path.replace(/^\/+/, "")}`,
      sendMessage: () => Promise.resolve(),
      onMessage: { addListener: () => {} },
    },
    tabs: {
      query: () => {
        tabRef.count++;
        if (mockIframeUrl) {
          return Promise.resolve([{ id: mockIframeTabId, url: mockIframeUrl }]);
        }
        if (tabRef.count === 2) {
          return Promise.resolve([{ url: linkedinUrl }]);
        }
        return Promise.resolve([{ id: 1, url: win.location.href }]);
      },
    },
    scripting: {
      executeScript: () => {
        const iframe = win.document.querySelector("#mockLinkedInIframe");
        if (!iframe) throw new Error("Mock iframe not found");

        const doc = iframe.contentDocument;
        if (!doc) throw new Error("Iframe document not ready");

        return new Cypress.Promise((resolve) => {
          const checkBody = () => {
            if (doc.body) {
              cy.readFile("content.js").then((scriptContent) => {
                const scriptEl = doc.createElement("script");
                scriptEl.textContent = scriptContent;
                doc.head.appendChild(scriptEl);
                resolve();
              });
            } else {
              setTimeout(checkBody, 10);
            }
          };
          checkBody();
        });
      },
    },
  };
};

/**
 * Helper to stub window.close and track calls.
 * @param {Window} win - The window object to stub close on.
 */
const stubWindowClose = (win) => {
  cy.stub(win, "close")
    .callsFake(() => {
      Object.defineProperty(win, "closed", {
        get: () => true,
        configurable: true,
      });
    })
    .as("closeWindow");
  Object.defineProperty(win, "closed", {
    get: () => false,
    configurable: true,
  });
};

/**
 * Switches to the login form tab.
 * @returns {Cypress.Chainable<JQuery<HTMLElement>>} Chainable Cypress object for the login tab click.
 */
const switchToLogin = () => {
  cy.get("#tab-login").click();
  cy.get("#form-login").should("not.have.class", "hidden");
  return cy.get("#form-register").should("have.class", "hidden");
};

/**
 * Switches to the registration form tab.
 * @returns {Cypress.Chainable<JQuery<HTMLElement>>} Chainable Cypress object for the register tab click.
 */
const switchToRegister = () => {
  cy.contains("button, a", "Register").click();
  cy.get("#form-register").should("not.have.class", "hidden");
  return cy.get("#form-login").should("have.class", "hidden");
};

/**
 * Waits for profile data to be stored in chrome storage.
 * @param {Window} iframeWin - The iframe window object.
 * @param {string} key - The storage key to check.
 * @returns {Cypress.Chainable<Object>} Promise resolving with the stored data object.
 */
const waitForProfileData = (iframeWin, key) => {
  return new Cypress.Promise((resolve) => {
    const checkStored = () => {
      iframeWin.chrome.storage.local.get(key).then((stored) => {
        if (stored[key] && stored[key].fullName) {
          resolve(stored);
        } else {
          setTimeout(checkStored, 50);
        }
      });
    };
    checkStored();
  });
};

describe("Extension Data Parser E2E", () => {
  let storage;
  let tabQueryCountRef;

  beforeEach(() => {
    storage = {};
    tabQueryCountRef = { count: 0 };

    cy.fixture("mockProfile.html").as("mockHtml");
    cy.fixture("mockProfileMissingData.html").as("mockHtmlMissingData");
    cy.readFile("content.js").as("contentScript");

    cy.intercept("POST", "http://localhost:3000/api/login", {
      statusCode: 200,
      body: { token: "FAKE_TOKEN", userId: "USER123" },
    }).as("loginRequest");

    cy.intercept(
      { method: "GET", url: /cloudflare-dns\.com\/dns-query.*type=MX/ },
      { statusCode: 200, body: { Answer: [{ data: "mx1.example.com" }] } }
    ).as("mxCheck");

    cy.on("window:before:load", (win) => {
      stubChromeAPI({ win, storageObj: storage, linkedinUrl, tabRef: tabQueryCountRef });
    });
  });

  it("successfully parses LinkedIn profile and saves data", function () {
    let iframe;
    let winRef;

    cy.visit("auth/auth.html")
      .then(() => {
        return login("test@example.com", "Super$ecret1");
      })
      .wait("@loginRequest")
      .url()
      .should("include", "/parse/parse")
      .then(() => {
        cy.intercept("GET", linkedinUrl, {
          statusCode: 200,
          headers: { "Content-Type": "text/html" },
          body: this.mockHtml,
        }).as("linkedinProfile");
      })
      .reload()
      .get("#run-btn")
      .should("be.visible")
      .then(() => {
        cy.get("@mockHtml").then((mockHtml) => {
          cy.window().then((win) => {
            winRef = win;
            iframe = createMockIframe(winRef, mockHtml);
            setupChromeOnIframe(iframe.contentWindow, winRef.chrome, MOCK_IFRAME_TAB_ID);
          });
        });
      })
      .get("#run-btn")
      .click()
      .then(() => {
        return waitForProfileData(iframe.contentWindow, "profileData");
      })
      .then((stored) => {
        expect(stored.profileData).to.have.property("fullName").and.be.a("string");
      })
      .visit("profile/profile.html", {
        onBeforeLoad(win) {
          stubWindowClose(win);
        },
      })
      .get("#discard-profile-btn")
      .click()
      .get("@closeWindow")
      .should("have.been.called")
      .window()
      .its("closed")
      .should("be.true")
      .visit("parse/parse.html")
      .get("#logout-btn")
      .click();
  });

    it("successfully parses LinkedIn profile WITH MISSING DATA  and saves data", function () {
    let iframe;
    let winRef;

    cy.visit("auth/auth.html")
      .then(() => {
        return login("test@example.com", "Super$ecret1");
      })
      .wait("@loginRequest")
      .url()
      .should("include", "/parse/parse")
      .then(() => {
        cy.intercept("GET", linkedinUrl, {
          statusCode: 200,
          headers: { "Content-Type": "text/html" },
          body: this.mockHtmlMissingData,
        }).as("linkedinProfile");
      })
      .reload()
      .get("#run-btn")
      .should("be.visible")
      .then(() => {
        cy.get("@mockHtmlMissingData").then((mockHtmlMissingData) => {
          cy.window().then((win) => {
            winRef = win;
            iframe = createMockIframe(winRef, mockHtmlMissingData);
            setupChromeOnIframe(iframe.contentWindow, winRef.chrome, MOCK_IFRAME_TAB_ID);
          });
        });
      })
      .get("#run-btn")
      .click()
      .then(() => {
        return waitForProfileData(iframe.contentWindow, "profileData");
      })
      .then((stored) => {
        expect(stored.profileData).to.have.property("fullName").and.be.a("string");
        expect(stored.profileData).to.have.property("about").and.be.a("string");
        expect(stored.profileData).to.have.property("experience").that.is.an("array").that.is.empty;
        expect(stored.profileData).to.have.property("education").that.is.an("array");
        expect(stored.profileData).to.have.property("skills").that.is.an("array");
        expect(stored.profileData).to.have.property("location").and.be.a("string");
        expect(stored.profileData).to.have.property("headline").and.be.a("string");
      })
      .visit("profile/profile.html", {
        onBeforeLoad(win) {
          stubWindowClose(win);
        },
      })
      .get(".skills-placeholder")
      .should('be.visible')
      .get("#experience")
      .should('not.be.visible')
      .get("#discard-profile-btn")
      .click()
      .get("@closeWindow")
      .should("have.been.called")
      .window()
      .its("closed")
      .should("be.true")
      .visit("parse/parse.html")
      .get("#logout-btn")
      .click();
  });
});

describe("Combined Auth Page (Login + Registration)", () => {
  let storage;
  let tabQueryCountRef;

  beforeEach(() => {
    storage = {};
    tabQueryCountRef = { count: 0 };

    cy.on("window:before:load", (win) => {
      stubChromeAPI({ win, storageObj: storage, linkedinUrl, tabRef: tabQueryCountRef });
    });
    cy.visit("auth/auth.html");

    cy.intercept(
      { method: "GET", url: /cloudflare-dns\.com\/dns-query.*type=MX/ },
      (req) => {
        if (req.url.includes("invalid.com")) {
          req.reply({ statusCode: 404 });
        } else {
          req.reply({
            statusCode: 200,
            body: { Answer: [{ data: "mx1.example.com" }] },
          });
        }
      }
    ).as("mxLookup");

    cy.intercept("POST", "http://localhost:3000/api/register", (req) => {
      const { email } = req.body;
      if (email === "duplicate@example.com") {
        req.reply({ statusCode: 409, body: { error: "Email already exists" } });
      } else {
        req.reply({
          statusCode: 201,
          body: { message: "Registration successful" },
        });
      }
    }).as("registerRequest");

    cy.intercept("POST", "http://localhost:3000/api/login", (req) => {
      const { email, password } = req.body;
      if (email === "user@example.com" && password === "CorrectPass1!") {
        req.reply({
          statusCode: 200,
          body: { token: "VALID_TOKEN", userId: "USER123" },
        });
      } else {
        req.reply({ statusCode: 401, body: { error: "Invalid credentials" } });
      }
    }).as("loginRequest");
  });

  context("Registration Flow", () => {
    it("registers successfully with valid email and matching passwords", () => {
      register("newuser@example.com", "ValidPass1!", "ValidPass1!");
      cy.wait("@mxLookup")
        .wait("@registerRequest")
        .get(".success-message")
        .should("be.visible")
        .and("contain.text", "Registered! Redirecting…")
        .then(() => {
          switchToLogin();
          cy.get("#form-login").should("not.have.class", "hidden");
          cy.get("#email-login").should("have.value", "newuser@example.com");
        });
    });

    it("shows error when email domain has no MX record", () => {
      register("user@invalid.com", "ValidPass1!", "ValidPass1!");
      cy.wait("@mxLookup")
        .get("#register-error")
        .should("be.visible")
        .and("contain.text", "Invalid email domain");
    });

    it("shows error when passwords do not match", () => {
      register("user@example.com", "ValidPass1!", "WrongPass1!");
      cy.get("#register-error")
        .should("be.visible")
        .and("contain.text", "Passwords do not match");
      cy.get("@registerRequest.all").should("have.length", 0);
    });

    it("shows error when email is already registered", () => {
      register("duplicate@example.com", "ValidPass1!", "ValidPass1!");
      cy.wait("@mxLookup")
        .wait("@registerRequest")
        .get("#register-error")
        .should("be.visible")
        .and("contain.text", "Email already registered");
    });
  });

  context("Login Flow", () => {
    it("logs in successfully with correct credentials", () => {
      login("user@example.com", "CorrectPass1!");
      cy.wait("@loginRequest")
        .url()
        .should("include", "parse")
        .get("#logout-btn")
        .click()
        .location("pathname")
        .should("include", "/auth/auth");
    });

    it("shows error with incorrect credentials", () => {
      login("user@example.com", "WrongPass1!");
      cy.wait("@loginRequest")
        .get("#login-error")
        .should("be.visible")
        .and("contain.text", "Invalid credentials")
        .get("#form-login")
        .should("not.have.class", "hidden");
    });

    it("shows validation error for empty fields", () => {
      cy.get("#login-btn").click()
        .get("#login-error")
        .should("be.visible")
        .and("contain.text", "Invalid email format");
      cy.get("@loginRequest.all").should("have.length", 0);
    });
  });
});
