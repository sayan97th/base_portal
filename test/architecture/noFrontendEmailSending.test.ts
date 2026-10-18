import fs from "fs";
import path from "path";

// Every email must be sent by the Laravel API, where it passes through the
// Email Notification Settings delivery policy. The portal only asks the API
// to send (for example "resend invitation"), it never talks to a mail
// provider itself. This suite fails if a mail library or provider API ends up
// in the frontend, which would let emails skip those settings.

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SOURCE_ROOT = path.join(PROJECT_ROOT, "src");

const FORBIDDEN_PACKAGES = [
  "nodemailer",
  "resend",
  "@sendgrid/mail",
  "postmark",
  "mailgun.js",
  "mailgun-js",
  "@emailjs/browser",
  "emailjs-com",
  "@aws-sdk/client-ses",
  "@getbrevo/brevo",
  "sib-api-v3-sdk",
];

const FORBIDDEN_SOURCE_PATTERNS: { pattern: RegExp; description: string }[] = [
  {
    pattern: new RegExp(`from\\s+["'](${FORBIDDEN_PACKAGES.join("|").replace(/[./@]/g, "\\$&")})["']`),
    description: "imports a mail library",
  },
  {
    pattern:
      /https?:\/\/api\.(mailgun\.net|sendgrid\.com|postmarkapp\.com|resend\.com|emailjs\.com|brevo\.com)/i,
    description: "calls an email provider API",
  },
  { pattern: /createTransport\s*\(/, description: "creates an SMTP transport" },
];

function listSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full_path = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full_path);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) ? [full_path] : [];
  });
}

describe("frontend email sending", () => {
  it("does not depend on any mail library", () => {
    const package_json = JSON.parse(
      fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8")
    );
    const dependencies = Object.keys({
      ...package_json.dependencies,
      ...package_json.devDependencies,
    });

    expect(dependencies.filter((name) => FORBIDDEN_PACKAGES.includes(name))).toEqual([]);
  });

  it("never sends email directly from the source code", () => {
    const violations = listSourceFiles(SOURCE_ROOT).flatMap((file_path) => {
      const content = fs.readFileSync(file_path, "utf8");
      return FORBIDDEN_SOURCE_PATTERNS.filter(({ pattern }) => pattern.test(content)).map(
        ({ description }) => `${path.relative(PROJECT_ROOT, file_path)} ${description}`
      );
    });

    expect(violations).toEqual([]);
  });
});
