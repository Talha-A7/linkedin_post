// Builds a fictional LinkedIn-style "Save to PDF" export for the demo video. No real person's data.
import { chromium } from "@playwright/test";
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
 body{font-family:Helvetica,Arial,sans-serif;color:#1d2226;margin:0;display:flex}
 aside{width:30%;background:#f3f2ef;padding:36px 24px;min-height:100vh} main{width:70%;padding:36px 40px}
 h1{font-size:30px;margin:0} h2{font-size:17px;margin:26px 0 8px;color:#0a66c2} h3{font-size:14px;margin:12px 0 2px}
 p,li{font-size:12.5px;line-height:1.5;margin:4px 0} .muted{color:#666} aside h2{color:#1d2226}
</style></head><body>
<aside><h2>Contact</h2><p>linkedin.com/in/maya-okafor-8a3b21194 (LinkedIn)</p>
<h2>Top Skills</h2><p>Adobe Photoshop</p><p>Microsoft Word</p><p>Teamwork</p>
<h2>Languages</h2><p>English</p><p>Portuguese</p></aside>
<main><h1>Maya Okafor</h1><p>Graphic Designer | Adobe Creative Suite | Figma | Passionate about design</p><p class="muted">Lisbon, Portugal</p>
<h2>Summary</h2><p>I am a passionate and creative graphic designer with over 7 years of experience. I love creating beautiful designs and I am always learning new things. I have worked in agencies and in-house. In my free time I enjoy surfing and photography. Feel free to connect!</p>
<h2>Experience</h2>
<h3>Self-employed</h3><p>Freelance Designer · January 2023 - Present</p><p>Design work for various clients.</p>
<h3>Brightwave Agency</h3><p>Senior Designer · 2019 - 2022</p><p>Created logos, brand guidelines and marketing materials for clients. Led the rebrand for a fintech client, which raised its Series A after launch.</p>
<h3>PrintCo</h3><p>Junior Designer · 2017 - 2019</p><p>Designed print materials.</p>
<h2>Education</h2><h3>University of the Arts London</h3><p>BA, Visual Communication</p>
</main></body></html>`;
const b = await chromium.launch(); const p = await b.newPage();
await p.setContent(html); await p.pdf({ path: process.argv[2], format: "A4", printBackground: true });
await b.close(); console.log("wrote", process.argv[2]);
