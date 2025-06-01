const linkedinUrl = "https://www.linkedin.com/in/test-user";
const storage = {};
let tabQueryCountRef = { count: 0 };

// Helper to stub window.close and track calls
function stubWindowClose(win) {
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
}

function stubChromeAPI(win, storageObj, linkedinUrl, tabRef) {
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
        if (tabRef.count === 2) {
          return Promise.resolve([{ url: linkedinUrl }]);
        }
        return Promise.resolve([{ url: win.location.href }]);
      },
    },
    scripting: {
      executeScript: () => Promise.resolve(),
    },
  };
}

function loadAndRunInIframe(win, mockHtml, contentScript) {
  const iframe = win.document.createElement("iframe");
  iframe.id = "mockLinkedInIframe";
  Object.assign(iframe.style, { position: "absolute", top: "-9999px" });
  win.document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  doc.open();
  doc.write(mockHtml);
  doc.close();

  iframe.contentWindow.chrome = win.chrome;

  const scriptEl = doc.createElement("script");
  scriptEl.type = "text/javascript";
  scriptEl.textContent = contentScript;
  doc.head.appendChild(scriptEl);

  return iframe.contentWindow;
}

describe("Extension Data Parser E2E", () => {
  beforeEach(() => {
    tabQueryCountRef.count = 0;
    cy.fixture("mockProfile.html").as("mockHtml");
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
      stubChromeAPI(win, storage, linkedinUrl, tabQueryCountRef);
    });
  });

  it("parses LinkedIn profile and saves data", function () {
    cy.visit("auth/auth.html");
    cy.get("#email-login").type("test@example.com");
    cy.get("#pass-login").type("Super$ecret1");
    cy.get("#login-btn").click();
    cy.wait("@loginRequest");
    cy.url().should("include", "/parse/parse");

    cy.intercept("GET", linkedinUrl, {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: this.mockHtml,
    }).as("linkedinProfile");
    cy.reload();

    cy.window()
      .then((win) => {
        return loadAndRunInIframe(win, this.mockHtml, this.contentScript);
      })
      .then((iframeWin) => {
        cy.wrap(null).should(() => {
          return iframeWin.chrome.storage.local
            .get("profileData")
            .then((stored) => {
              expect(stored.profileData)
                .to.have.property("fullName")
                .and.be.a("string");
            });
        });
      });

    cy.visit("profile/profile.html", {
      onBeforeLoad(win) {
        stubWindowClose(win);
      },
    });

    // 2) Trigger whatever in your code calls window.close()
    cy.get("#discard-profile-btn").click();

    // 3) Assert that close() was called
    cy.get("@closeWindow").should("have.been.called");

    // 4) If your code relies on window.closed afterwards, verify it’s now true:
    cy.window().its("closed").should("be.true");

    cy.visit("parse/parse.html");
    cy.get("#logout-btn").click();
  });
});















function switchToRegister() {
  cy.contains("button, a", "Register").click();

  // cy.get("#tab-register").click();
  cy.get("#form-register").should("not.have.class", "hidden");
  cy.get("#form-login").should("have.class", "hidden");
}

// Helper to switch to the Login tab
function switchToLogin() {
  cy.get("#tab-login").click();
  cy.get("#form-login").should("not.have.class", "hidden");
  cy.get("#form-register").should("have.class", "hidden");
}

// Helper to fill and submit registration
function fillAndSubmitRegistration(email, password, confirmPassword) {
  switchToRegister();
  cy.get("#email-reg").clear().type(email);
  cy.get("#pass-reg").clear().type(password);
  cy.get("#pass-confirm").clear().type(confirmPassword);
  cy.get("#register-btn").click();
}

// Helper to fill and submit login
function fillAndSubmitLogin(email, password) {
  switchToLogin();
  cy.get("#email-login").clear().type(email);
  cy.get("#pass-login").clear().type(password);
  cy.get("#login-btn").click();
}

describe("Combined Auth Page (Login + Registration)", () => {
  beforeEach(() => {
    cy.on("window:before:load", (win) => {
      stubChromeAPI(win, storage, linkedinUrl, tabQueryCountRef);
    });
    // Visit the real combined auth page
    cy.visit("auth/auth.html");

    // Stub MX lookup for any valid domain
    cy.intercept(
      { method: "GET", url: /cloudflare-dns\.com\/dns-query.*type=MX/ },
      (req) => {
        // If URL contains “invalid.com”, return 404
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

    // Stub registration endpoint
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

    // Stub login endpoint
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
      fillAndSubmitRegistration(
        "newuser@example.com",
        "ValidPass1!",
        "ValidPass1!"
      );
      // MX lookup fires once for “newuser@example.com”
      cy.wait("@mxLookup");

      // Then registration request
      cy.wait("@registerRequest");

      // Success message appears and form should toggle back to login
      cy.get(".success-message")
        .should("be.visible")
        .and("contain.text", "Registered! Redirecting…");

      // After registration, page logic might switch to login tab
      // (If your code does a tab-switch on success.)
      switchToLogin();
      cy.get("#form-login").should("not.have.class", "hidden");
      cy.get("#email-login").should("have.value", "newuser@example.com");
    });

    it("shows error when email domain has no MX record", () => {
      fillAndSubmitRegistration(
        "user@invalid.com",
        "ValidPass1!",
        "ValidPass1!"
      );
      // MX lookup for invalid.com returns 404
      cy.wait("@mxLookup");
      cy.get("#register-error")
        .should("be.visible")
        .and("contain.text", "Invalid email domain");
    });

    it("shows error when passwords do not match", () => {
      fillAndSubmitRegistration(
        "user@example.com",
        "ValidPass1!",
        "WrongPass1!"
      );
      // Because passwords mismatch, MX and register endpoints should not be called
      cy.get("#register-error")
        .should("be.visible")
        .and("contain.text", "Passwords do not match");
      cy.get("@registerRequest.all").should("have.length", 0);
    });

    it("shows error when email is already registered", () => {
      fillAndSubmitRegistration(
        "duplicate@example.com",
        "ValidPass1!",
        "ValidPass1!"
      );
      // MX lookup fires
      cy.wait("@mxLookup");
      // Registration fires and returns 409
      cy.wait("@registerRequest");

      cy.get("#register-error")
        .should("be.visible")
        .and("contain.text", "Email already registered");
    });
  });

  context("Login Flow", () => {
    it("logs in successfully with correct credentials", () => {
      fillAndSubmitLogin("user@example.com", "CorrectPass1!");
      // Login endpoint should be called
      cy.wait("@loginRequest");
      // Assert navigation to dashboard page
      cy.url().should("include", "parse");
      cy.get("#logout-btn").click();
      cy.location('pathname').should('include', '/auth/auth');
    });
    it("shows error with incorrect credentials", () => {
      fillAndSubmitLogin("user@example.com", "WrongPass1!");
      cy.wait("@loginRequest");
      cy.get("#login-error")
        .should("be.visible")
        .and("contain.text", "Invalid credentials");
      // Ensure the login form remains visible
      cy.get("#form-login").should("not.have.class", "hidden");
    });
    it("shows validation error for empty fields", () => {
      // Leave both fields blank
      cy.get("#login-btn").click();
      cy.get("#login-error")
        .should("be.visible")
        .and("contain.text", "Invalid email format");
      // The login endpoint should not be called
      cy.get("@loginRequest.all").should("have.length", 0);
    });
  });
});
