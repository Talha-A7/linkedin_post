import { InfoButton, Tip } from "./InfoButton";

export function ProfileUrlGuide({ label = "Find my profile link" }: { label?: string }) {
  return (
    <InfoButton title="Find your profile link" label={label}>
      <ol>
        <li>Open <code>linkedin.com</code> and sign in.</li>
        <li>Click your photo (<b>Me</b>) in the top bar, then <b>View Profile</b>.</li>
        <li>Copy the address from your browser's address bar. It looks like <code>linkedin.com/in/your-name</code>.</li>
      </ol>
      <p><b>On the mobile app:</b> open your profile, tap <b>⋯</b>, then <b>Share via…</b> → <b>Copy</b>.</p>
      <Tip>Link ends in random numbers? On your profile page, click <b>Edit public profile &amp; URL</b> (top right) to set a clean one.</Tip>
    </InfoButton>
  );
}

export function PdfGuide({ label = "How do I download my PDF?" }: { label?: string }) {
  return (
    <InfoButton title="Download your profile as a PDF" label={label}>
      <ol>
        <li>On a <b>computer</b>, open <a href="https://www.linkedin.com/in/me/" target="_blank" rel="noopener noreferrer" className="underline">your LinkedIn profile</a> (or <b>Me</b> → <b>View Profile</b>).</li>
        <li>Under your name and headline, click <b>Resources</b>. On some accounts the button is called <b>More</b>.</li>
        <li>Choose <b>Save to PDF</b>. The file (usually <code>Profile.pdf</code>) downloads automatically.</li>
        <li>Come back here and upload it.</li>
      </ol>
      <Tip>The mobile app can't save a PDF. Use a desktop browser, or switch to <b>Paste text</b> and copy in your sections.</Tip>
    </InfoButton>
  );
}

export function PdfMissingGuide() {
  return (
    <InfoButton title="What the PDF leaves out" label="Why are we asking?">
      <p>LinkedIn's PDF only includes text. It doesn't show:</p>
      <ol>
        <li><b>Profile photo:</b> do you have one? Is it a clear, friendly headshot?</li>
        <li><b>Banner:</b> the default blue, or a custom image? What does it say?</li>
        <li><b>Featured section:</b> what's pinned there, if anything?</li>
        <li><b>Recent posts:</b> roughly how often you post and what about.</li>
        <li><b>Badges:</b> "Open to work" or "Providing services".</li>
      </ol>
      <p>Describe them briefly so they're included in your score. Leave this blank and we'll list them for you to check.</p>
    </InfoButton>
  );
}

export function CompanyUrlGuide() {
  return (
    <InfoButton title="Find your company page link" label="Find my company page">
      <ol>
        <li>Sign in to <code>linkedin.com</code> and click <b>Me</b> or <b>For Business</b> in the top bar.</li>
        <li>Under <b>Manage</b>, click your company page.</li>
        <li>Click <b>View as member</b>, then copy the address bar. It looks like <code>linkedin.com/company/your-company</code>.</li>
      </ol>
      <Tip>Not an admin? Search for the company in LinkedIn's search bar and open its page.</Tip>
    </InfoButton>
  );
}

export function CompanyCopyGuide() {
  return (
    <InfoButton title="Copy your company page content" label="What should I paste?">
      <p>Company pages have no PDF export. Open the page as a member and paste in:</p>
      <ol>
        <li><b>Tagline</b>, the line under the company name.</li>
        <li>The <b>About</b> tab: overview, website, industry, size, specialties.</li>
        <li>The <b>custom button</b> label (for example, "Visit website") and where it links.</li>
        <li>A short description of your <b>cover image</b>.</li>
        <li>Your <b>pinned post</b> and the last 3–5 posts, with rough reaction counts.</li>
      </ol>
      <Tip>Add any proof that isn't on the page yet, such as customer results, ratings or integrations, in the proof question. That's often what's missing.</Tip>
    </InfoButton>
  );
}

export function PersonalPasteGuide() {
  return (
    <InfoButton title="What to paste from your profile" label="What should I paste?">
      <p>Copy these from your profile, in any order:</p>
      <ol>
        <li>Name, <b>headline</b>, location.</li>
        <li>Your <b>About</b> section (click "see more" first).</li>
        <li><b>Experience</b>: every role with its description.</li>
        <li><b>Skills</b> (at least the top ones), <b>Recommendations</b>, <b>Featured</b> items.</li>
        <li>Whether you show "Open to work" or "Providing services".</li>
      </ol>
    </InfoButton>
  );
}
