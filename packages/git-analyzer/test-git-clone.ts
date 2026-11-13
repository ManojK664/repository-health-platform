import { validateGitHubUrl } from "./src/git-clone.js";

interface TestCase {
  url: string;
  expectedValid: boolean;
  expectedNormalized?: string;
}

const tests: TestCase[] = [
  // Valid URLs
  { url: "https://github.com/facebook/react", expectedValid: true, expectedNormalized: "https://github.com/facebook/react" },
  { url: "https://github.com/facebook/react.git", expectedValid: true, expectedNormalized: "https://github.com/facebook/react" },
  { url: "http://github.com/torvalds/linux", expectedValid: true, expectedNormalized: "https://github.com/torvalds/linux" },
  { url: "https://www.github.com/vercel/next.js", expectedValid: true, expectedNormalized: "https://github.com/vercel/next.js" },
  { url: "https://github.com/owner-name/repo_name.test", expectedValid: true, expectedNormalized: "https://github.com/owner-name/repo_name.test" },
  
  // Invalid / Unsafe URLs
  { url: "", expectedValid: false },
  { url: "not-a-url", expectedValid: false },
  { url: "https://gitlab.com/owner/repo", expectedValid: false },
  { url: "https://bitbucket.org/owner/repo", expectedValid: false },
  { url: "https://github.com/owner", expectedValid: false },
  { url: "https://github.com/owner/repo/extra/path", expectedValid: false },
  { url: "https://github.com/owner/repo; rm -rf /", expectedValid: false },
  { url: "https://github.com/owner/repo && calc", expectedValid: false },
  { url: "https://github.com/--upload-pack/repo", expectedValid: false },
  { url: "https://github.com/owner/--upload-pack", expectedValid: false },
  { url: "https://github.com/../repo", expectedValid: false },
  { url: "file:///etc/passwd", expectedValid: false },
];

let failed = 0;
console.log("=== Running GitHub URL Validation Tests ===");
for (const t of tests) {
  const res = validateGitHubUrl(t.url);
  const pass = res.valid === t.expectedValid && (!t.expectedNormalized || res.normalizedUrl === t.expectedNormalized);
  if (pass) {
    console.log(`[PASS] "${t.url}" -> valid: ${res.valid}`);
  } else {
    failed++;
    console.error(`[FAIL] "${t.url}" -> expected valid: ${t.expectedValid}, got: ${res.valid} (${res.error})`);
  }
}

if (failed === 0) {
  console.log("\nAll validation tests passed successfully!");
} else {
  console.error(`\n${failed} tests failed!`);
  process.exit(1);
}

