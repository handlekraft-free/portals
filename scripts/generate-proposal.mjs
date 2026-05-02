import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const doc = new PDFDocument({
  size: 'letter',
  margins: { top: 72, bottom: 72, left: 72, right: 72 },
  info: {
    Title: 'handləkraft — Strategic Plan 2026–2030',
    Author: 'handləkraft',
    Subject: 'Strategic Plan for handləkraft 501(c)(3)',
  }
});

const output = fs.createWriteStream('client/public/proposal.pdf');
doc.pipe(output);

const navy = '#1A1F2B';
const teal = '#0D7377';
const gold = '#D4A843';
const darkGray = '#333333';
const lightGray = '#888888';
const pageWidth = 612;
const contentLeft = 72;
const contentRight = 540;

const img = (name) => path.resolve(`scripts/assets/${name}.png`);
const logoPath = path.resolve('client/src/assets/images/logo.png');

function safeImage(imgPath, x, y, width) {
  if (fs.existsSync(imgPath)) {
    doc.image(imgPath, x, y, { width });
  }
}

function heading(text, size = 24) {
  doc.font('Helvetica-Bold').fontSize(size).fillColor(navy).text(text);
  doc.moveDown(0.5);
}

function sectionStart(title, vikingName) {
  const vikingPath = img(vikingName);
  if (fs.existsSync(vikingPath)) {
    doc.image(vikingPath, contentRight - 50, contentLeft - 8, { width: 55 });
  }
  doc.font('Helvetica-Bold').fontSize(24).fillColor(navy).text(title);
  doc.moveDown(0.3);
  const y = doc.y;
  doc.strokeColor(gold).lineWidth(1.5).moveTo(contentLeft, y).lineTo(contentRight, y).stroke();
  doc.moveDown(0.8);
}

function subheading(text, size = 16) {
  doc.font('Helvetica-Bold').fontSize(size).fillColor(teal).text(text);
  doc.moveDown(0.4);
}

function body(text) {
  doc.font('Helvetica').fontSize(11).fillColor(darkGray).text(text, { lineGap: 4 });
  doc.moveDown(0.6);
}

function bullet(text) {
  doc.font('Helvetica').fontSize(11).fillColor(darkGray).text(`•  ${text}`, { indent: 16, lineGap: 3 });
  doc.moveDown(0.3);
}

function spacer(n = 1) {
  doc.moveDown(n);
}

function checkPage(needed = 120) {
  if (doc.y + needed > 700) {
    doc.addPage();
  }
}

// ===========================
// COVER PAGE
// ===========================
doc.rect(0, 0, pageWidth, 792).fill(navy);
doc.rect(0, 0, pageWidth, 6).fill(gold);

if (fs.existsSync(logoPath)) {
  doc.image(logoPath, 256, 80, { width: 100 });
}

doc.fontSize(12).fillColor(gold).font('Helvetica')
  .text('STRATEGIC PLAN 2026–2030', contentLeft, 200, { characterSpacing: 4, align: 'center' });

doc.moveDown(1);
doc.fontSize(52).fillColor('#FFFFFF').font('Helvetica-Bold')
  .text('handl\u0259kraft', contentLeft, 240, { align: 'center' });

doc.moveDown(0.3);
doc.fontSize(14).fillColor(gold).font('Helvetica')
  .text('handl\u0259 · kraft — Norwegian: the power to act', contentLeft, undefined, { align: 'center' });

doc.moveDown(1.5);
doc.fontSize(14).fillColor('#FFFFFF').font('Helvetica').opacity(0.7)
  .text('Technology Services & Training for Community Organizations.', contentLeft, undefined, { align: 'center' });
doc.fontSize(14).fillColor('#FFFFFF').font('Helvetica').opacity(0.7)
  .text('Real Careers for Non-Traditional Learners.', contentLeft, undefined, { align: 'center' });
doc.fontSize(14).fillColor('#FFFFFF').font('Helvetica').opacity(0.7)
  .text('Accessibility for Everyone.', contentLeft, undefined, { align: 'center' });
doc.opacity(1);

safeImage(img('viking-ship-building'), 106, 430, 400);

doc.fontSize(11).fillColor(gold).font('Helvetica-Bold')
  .text('501(c)(3) Nonprofit Initiative', contentLeft, 680, { align: 'center' });
doc.fontSize(11).fillColor('#FFFFFF').font('Helvetica').opacity(0.6)
  .text('Launching September 1, 2026', contentLeft, undefined, { align: 'center' });
doc.opacity(1);

doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica').opacity(0.4)
  .text('This is a living document — we expect it to evolve as we learn. That\'s by design.', contentLeft, 740, { align: 'center' });
doc.opacity(1);

// ===========================
// TABLE OF CONTENTS
// ===========================
doc.addPage();
doc.rect(0, 0, pageWidth, 6).fill(teal);

heading('Table of Contents', 28);
spacer(0.3);

const tocItems = [
  ['1', 'Executive Summary'],
  ['2', 'The Problem'],
  ['3', 'Our Approach'],
  ['4', 'Three Integrated Streams'],
  ['5', 'Who We Serve'],
  ['6', 'The Fellowship Program — Two-Tier Training'],
  ['7', 'Accessibility by Default'],
  ['8', 'The AI Advantage'],
  ['9', 'Operating Model & Principles'],
  ['10', 'Funding Strategy'],
  ['11', 'Founding Team'],
  ['12', 'Implementation Timeline'],
  ['13', 'How You Can Help'],
  ['—', 'Program Documents & Source Links'],
];

tocItems.forEach(([num, title]) => {
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(13).fillColor(gold).text(num, contentLeft, y);
  doc.font('Helvetica').fontSize(13).fillColor(darkGray).text(title, contentLeft + 30, y);
  doc.moveDown(0.6);
});

// ===========================
// 1. EXECUTIVE SUMMARY
// ===========================
doc.addPage();
sectionStart('1. Executive Summary', 'viking-scroll');

body('handl\u0259kraft is an early-stage 501(c)(3) nonprofit that provides technology services and training to community organizations — at no cost, ever. We are not primarily a software-building organization. We are a services, training, and capability-transfer organization that happens to build software when it\'s genuinely the right answer.');

body('We exist at the intersection of three interconnected needs:');

bullet('Community organizations and local agencies run life-changing work on a patchwork of spreadsheets, email threads, and institutional memory. They don\'t need more software — they need honest assessment, the right tools configured well, and the confidence to run them independently.');
bullet('Capable people are locked out of technology careers — not for lack of ability, but for lack of access. Non-traditional learners, neurodivergent thinkers, veterans, people in recovery, formerly incarcerated individuals, caregivers, people with disabilities. Our fellowship trains them on real client engagements using AI-native tools.');
bullet('The people our organizations serve are too often forgotten by technology designers. Accessibility is not an afterthought at handl\u0259kraft — it is woven into every engagement and taught in every cohort.');

body('Founded by a father-son team launching September 2026, handl\u0259kraft multiplies the power to act — for organizations underserved by technology, for learners underserved by traditional pathways, and for end users whom technology too often forgets.');

subheading('Key Facts');
bullet('Cost to organizations: $0 — always, for every service we provide');
bullet('100% donation-funded');
bullet('Services include: discovery, honest assessment, tool configuration, staff training, capability transfer, light customization, and custom software (rarely, when genuinely needed)');
bullet('Fellowship: small attentive cohorts working on real client engagements');
bullet('No formal education required beyond a high school diploma or GED');
bullet('Accessibility — WCAG, trauma-informed design, plain language — in every engagement and every cohort');
bullet('Three integrated streams: client technology services, fellowship & career pathways, accessibility by default');
bullet('30-hour workweek for staff — a deliberate, strategic operating principle');

// ===========================
// 2. THE PROBLEM
// ===========================
doc.addPage();
sectionStart('2. The Problem', 'viking-search');

subheading('The Technology Services Gap');
body('Thousands of community organizations — homeless shelters, free clinics, food banks, youth mentorship programs, mutual aid groups, veteran service organizations — and underfunded local agencies run critical operations on a patchwork of spreadsheets, email threads, and institutional memory. They track client intake on paper. They manage case files in shared drives. They communicate via sticky notes and whiteboard schedules.');

body('The problem is rarely that they don\'t have software. It\'s that the software they have is misconfigured, their staff isn\'t trained to use it, their data is siloed, and they have no one to help them think clearly about what they actually need. Commercial consultants are out of reach. Off-the-shelf tools rarely fit without configuration. Even when grants cover software costs, there\'s rarely budget for setup, training, or the honest conversation about what the organization actually needs first.');

body('The result: organizations that care the most about their communities are chronically underequipped — and often don\'t know that the answer isn\'t always new software.');

checkPage(200);
subheading('The Opportunity Gap');
body('Talented people from non-traditional backgrounds — career changers, veterans, single parents, GED holders, neurodivergent learners, formerly incarcerated individuals, people in recovery, people with disabilities — are locked out of technology careers not by lack of ability but by lack of access. Bootcamps and community college programs build foundational skills, but without professional experience on real projects and close mentorship, graduates cycle through rejection.');

body('Traditional technology training compounds the problem: it\'s expensive, it\'s designed for a narrow learner profile, it\'s inaccessible by default, and it trains people for a job market that is rapidly shifting away from the skills it teaches.');

checkPage(180);
subheading('The Accessibility Gap');
body('The people our client organizations serve are often those most poorly served by digital tools. They may have disabilities — cognitive, sensory, physical. They may have experienced trauma. They may have limited English proficiency or low digital literacy. They may be navigating crisis. Technology designed without them in mind fails them at the exact moment they need it most.');

body('Most organizations — and most technology trainers — treat accessibility as a compliance checkbox or a late-stage QA step. handl\u0259kraft treats it as a foundational design value, a professional standard, and a competitive differentiator.');

checkPage(160);
subheading('The Emerging Capability');
body('AI-powered tools — GitHub Copilot, Cursor, Replit, Claude, and others — have fundamentally changed what it means to configure and build technology. As AI handles more and more of the technical implementation, the highest-value skills have shifted: toward understanding real problems, asking the right questions, directing work thoughtfully, and transferring capability to the people who will sustain it.');

body('This shift is not a threat to our model. It is the foundation of it. With the right guidance and real-world projects, motivated people can reach professional competency in weeks — not years — if the training is designed for them.');

// ===========================
// 3. OUR APPROACH
// ===========================
doc.addPage();
sectionStart('3. Our Approach', 'viking-idea');

body('handl\u0259kraft works as a simple, honest cycle. Every engagement starts with listening — not with assuming we know the answer. Every engagement ends with capability in the hands of the organization, not dependence on us.');

spacer(0.3);
subheading('Step 1: Free Discovery Conversation');
body('A community organization reaches out. We start with a real conversation — no sales pitch, no jargon, no predetermined answer. We listen to understand what the organization actually does, what\'s painful, what would genuinely help, and what they\'ve already tried. Many organizations arrive expecting to request a website or an app. We often help them see that what they need is something simpler, faster, and more sustainable.');

subheading('Step 2: Honest Assessment');
body('We recommend the right path — honestly. That might be configuring a tool they already have. It might be training their staff on something they\'re underusing. It might be migrating their data into a better-organized system. It might be a small custom addition to an existing platform. And occasionally — rarely — it might be building something new from scratch. If they don\'t need us, we say so. That honesty is how we earn trust.');

subheading('Step 3: Configuration, Training, and Capability Transfer');
body('We do the work — and we bring our fellows along as real contributors on real engagements. We configure what\'s needed, document everything, and train the team to run it independently. Our exit is planned from the beginning. We succeed when an organization can operate their systems six months after we\'ve left without calling us.');

subheading('Step 4: Fellows Own Real Outcomes');
body('Our fellows aren\'t observers — they\'re contributors on real client work. They configure systems that real nonprofits depend on. They write documentation that real staff will read. They train real users. They learn by doing work that matters, with close mentorship alongside them. They graduate with a portfolio of actual outcomes, not classroom simulations.');

// ===========================
// 4. THREE INTEGRATED STREAMS
// ===========================
doc.addPage();
sectionStart('4. Three Integrated Streams', 'viking-builder');

body('handl\u0259kraft operates through three integrated streams — not three separate programs. Each reinforces the others. Client engagements are where fellows learn. Fellow learning is what makes our services better. And accessibility connects both: it\'s what we deliver to client end-users, and it\'s what we practice in how we teach.');

checkPage(200);
subheading('Stream 1: Technology Services for Nonprofits');
body('We help community organizations choose, configure, and operate the right technology for their work. What we provide:');
bullet('Discovery and honest assessment — understanding what\'s actually needed before recommending anything');
bullet('Tool selection — identifying the best fit from existing platforms (we only build custom when truly justified)');
bullet('Configuration and setup — tailored to the organization\'s real workflow, not a generic template');
bullet('Staff training and onboarding — hands-on, plain-language, designed for the actual users');
bullet('Documentation — everything written down so institutional knowledge doesn\'t walk out the door');
bullet('Light customization — small, targeted additions where existing tools have genuine gaps');
bullet('Custom software — built with care, rarely, when nothing else fits, with sustainability as the primary design criterion');
bullet('Accessibility audit and remediation — ensuring what we deliver serves everyone the organization serves');
body('Every service is free. Always. We\'re a 501(c)(3) funded by donations and we exist to give organizations the power to act — not to add to their costs.');

checkPage(220);
subheading('Stream 2: Fellowship & Career Pathways');
body('Our fellowship is a small, attentive training program for non-traditional learners working on real client engagements. It runs in two tiers — both free, both built around real work rather than simulated exercises.');
bullet('Small cohorts — designed to provide close mentorship and genuine attention, not to maximize throughput');
bullet('Real client engagements — fellows work on actual handl\u0259kraft client projects, not practice scenarios');
bullet('AI-native curriculum — AI is both the subject and the teaching tool; fellows learn to direct AI work confidently');
bullet('Accessibility as core curriculum — WCAG, plain-language, trauma-informed design woven throughout');
bullet('A broad learner profile — designed for the full range of human learners, not a narrow archetype');
bullet('No tuition — ever; HS diploma or GED required; accessibility accommodations available');
body('Fellows are not cheap labor. They are learners whose participation creates real value for client organizations while building skills and portfolios for themselves. That mutuality is the point.');

checkPage(180);
subheading('Stream 3: Accessibility by Default');
body('Accessibility is not a section in our curriculum and not a line item in our project checklist. It is a standing professional standard at handl\u0259kraft — applied to every client engagement and taught in every cohort.');
bullet('Every client engagement includes an accessibility component — audit, remediation, or design review');
bullet('Every fellow learns WCAG 2.1 AA standards as part of foundational training');
bullet('Trauma-informed design principles are woven into how we approach user experience');
bullet('Plain-language writing is a professional standard for documentation and client-facing content');
bullet('Our pedagogy is itself accessible — designed for neurodivergent learners, chronic illness, variable schedules');
body('The people our client organizations serve are often those most marginalized by technology. We refuse to build systems that fail them.');

// ===========================
// 5. WHO WE SERVE
// ===========================
doc.addPage();
sectionStart('5. Who We Serve', 'viking-community');

subheading('Organizations We Help');
body('We serve nonprofits, community service organizations, mutual aid groups, and underserved state and local government agencies — any organization doing good work on a tight budget that could use help with their technology, honestly assessed and fully supported.');

const orgs = [
  ['Shelters', 'Homeless shelters, transitional housing, and emergency services'],
  ['Clinics', 'Free and sliding-scale community health clinics'],
  ['Social Services', 'Case management and social service agencies'],
  ['Food Banks', 'Food banks, pantries, and community kitchens'],
  ['Youth Programs', 'Mentorship, after-school, and youth development programs'],
  ['Veteran Services', 'Veteran service and transition organizations'],
  ['Mutual Aid', 'Mutual aid networks and community resilience organizations'],
  ['Local Government', 'Underserved state and local agencies serving the public'],
  ['Community Orgs', 'Neighborhood and community development groups'],
];

orgs.forEach(([name, desc]) => {
  doc.font('Helvetica-Bold').fontSize(11).fillColor(teal).text(name, { continued: true });
  doc.font('Helvetica').fillColor(darkGray).text(` — ${desc}`);
  doc.moveDown(0.3);
});

spacer(0.5);
subheading('People We Train');
body('Our fellowship is built for people whose paths into technology have been blocked — not for lack of ability, but for lack of access. Our pedagogy is designed for the full range of human learners, not a narrow archetype. We specifically prioritize:');

const candidates = [
  'GED holders and high school graduates',
  'Career changers from non-tech industries',
  'Veterans, including those with OTH (Other Than Honorable) discharges',
  'Single parents and primary caregivers',
  'Neurodivergent learners (ADHD, autism spectrum, dyslexia, and others)',
  'Formerly incarcerated individuals',
  'People in recovery',
  'People with disabilities or chronic illness',
  'Self-taught learners without formal credentials',
  'Underemployed workers seeking upward mobility',
  'Community college students and non-degree candidates',
];

candidates.forEach(c => bullet(c));

body('The only prerequisites are a high school diploma or GED and a genuine desire to learn and help. Accessibility accommodations are available — no documentation required to ask. We are not looking for people who already know how to code. We are looking for people who want to solve real problems, own real outcomes, and grow.');

// ===========================
// 6. THE FELLOWSHIP PROGRAM
// ===========================
doc.addPage();
sectionStart('6. The Fellowship Program', 'viking-mentoring');

body('handl\u0259kraft\'s training runs in two tiers. Tier 1 is foundational and open to anyone with a GED or diploma. Tier 2 goes deeper technically for those ready to go further. Both are free. Both involve real client work. Learners move at their own pace — not every Tier 1 graduate needs Tier 2, and both paths lead somewhere real.');

body('A critical design principle: small, attentive cohorts. We are not trying to maximize throughput. We are trying to provide the kind of close mentorship and genuine attention that actually changes trajectories.');

checkPage(100);
subheading('Tier 1 — Foundational Applied AI');
body('6 weeks · 16 hours/week · 96 total hours · Evenings, online · Target launch: Q4 2026');
doc.moveDown(0.2);
body('Tier 1 is designed for non-traditional learners — career changers, veterans, GED holders, neurodivergent candidates, people in recovery — who may never have written a line of code. Prerequisites are a high school diploma or GED and willingness to show up and help. The program delivers 96 structured hours across six weeks of weeknight sessions, accessible to people who work full time.');

const tier1weeks = [
  ['Week 0', 'Onboarding & Setup', 'Account setup, workspace fluency, accessibility tool orientation, code of conduct, loaner laptop logistics.'],
  ['Week 1', 'Personal AI Fluency', 'Using Claude for daily tasks; rewritten resume and personal learning log. Introduction to plain-language writing.'],
  ['Week 2', 'Reading a Business', 'Discovery interviews, systems thinking, accessibility audit basics, written assessment with three prioritized recommendations.'],
  ['Week 3', 'Lightweight Automation', 'AI-assisted Office/Sheets workflows; Wix-style website improvements with accessibility review.'],
  ['Week 4', 'SEO, Social & Content', 'Practical SEO audit; two-week content calendar for a sample organization; plain-language content review.'],
  ['Week 5', 'Prototyping with Replit', 'Direct an AI agent to build and deploy a working web prototype addressing a real client pain point, with accessibility built in.'],
  ['Week 6', 'Client Communication & Demo', 'Written recommendation, 10-minute presentation to an external audience, full portfolio package, reflective debrief.'],
];

spacer(0.3);
tier1weeks.forEach(([week, theme, desc]) => {
  checkPage(70);
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(teal).text(week, contentLeft, y, { width: 70, continued: false });
  doc.font('Helvetica-Bold').fontSize(11).fillColor(navy).text(theme, contentLeft + 75, y, { continued: false });
  doc.y = doc.y;
  doc.font('Helvetica').fontSize(10).fillColor(darkGray).text(desc, contentLeft + 75, doc.y, { lineGap: 2 });
  doc.moveDown(0.5);
});

checkPage(140);
body('Graduates leave Tier 1 with a portfolio of six artifacts, a written reference from the instructor, and eligibility for short-term engagements with partner organizations as opportunities arise. Strong graduates are priority candidates for Tier 2.');

checkPage(220);
doc.addPage();
subheading('Tier 2 — Applied Claude Code');
body('4 weeks · 16 hours/week · 64 total hours · Evenings, online · Target launch: Q2 2027');
doc.moveDown(0.2);
body('Tier 2 is for people ready to build and ship real software — not a coding bootcamp, but a program for learning to own software in a world where the AI writes most of the code. It serves Tier 1 graduates who demonstrated aptitude and want to go deeper, and mid-career knowledge workers who want to retool around agentic development. The two groups learn well together.');

const tier2weeks = [
  ['Week 1', 'The Agentic Mindset', 'Breaking old habits; directing and reviewing Claude Code at feature scope; accessibility as a first-class engineering concern; scoped project brief and first working feature.'],
  ['Week 2', 'Working in Real Codebases', 'Navigating unfamiliar code with AI assistance; Git depth — branches, pull requests, code review; reviewed PR on a practice codebase.'],
  ['Week 3', 'Shipping Something Real', 'Taking a learner\'s own project to a deployed, accessible state; deployment fundamentals; internal demo day.'],
  ['Week 4', 'Professional Practice', 'Documentation that matters; handoff and support; the handl\u0259kraft client workflow; final demo to an external audience plus portfolio walkthrough.'],
];

spacer(0.3);
tier2weeks.forEach(([week, theme, desc]) => {
  checkPage(70);
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(teal).text(week, contentLeft, y, { width: 70, continued: false });
  doc.font('Helvetica-Bold').fontSize(11).fillColor(navy).text(theme, contentLeft + 75, y, { continued: false });
  doc.font('Helvetica').fontSize(10).fillColor(darkGray).text(desc, contentLeft + 75, doc.y, { lineGap: 2 });
  doc.moveDown(0.5);
});

checkPage(140);
body('Tier 2 is a later-stage draft than Tier 1, shared for board awareness rather than decision. Its detailed design will be revisited after at least one Tier 1 cohort has run and once a volunteer lead has been identified. The Tier 2 curriculum will be co-developed with that lead — not imposed on them after the fact.');

checkPage(180);
subheading('The Full Pathway');
const pathway = [
  'Tier 1 complete → Portfolio of six real artifacts, written reference, alumni community, short-term engagement eligibility',
  'Tier 2 complete → Deployed application, pull request history, written recommendation to a notional client, professional reference',
  'Fellowship → Contributor roles on handl\u0259kraft client engagements for graduates who demonstrate exceptional aptitude',
  'Mentorship → Exceptional graduates are invited back to support future Tier 1 and Tier 2 cohorts',
];
pathway.forEach(p => bullet(p));
body('Every step in the pathway is optional. Learners who complete Tier 1 and return to their existing careers have still gained real, verifiable skills. The program is designed to meet people where they are.');

// ===========================
// 7. ACCESSIBILITY BY DEFAULT
// ===========================
doc.addPage();
sectionStart('7. Accessibility by Default', 'viking-key');

body('Accessibility is a strategic pillar at handl\u0259kraft — not a compliance exercise, not a checklist item, and not a section at the end of a project. It is a standing professional standard applied from the first conversation to the final handoff.');

subheading('Why This Matters for Our Clients');
body('The people that our client organizations serve are often those most poorly served by digital tools. They may have cognitive, sensory, or physical disabilities. They may be navigating trauma, crisis, or survival. They may have limited English proficiency or low digital literacy. Technology designed without them in mind fails them at the exact moment they most need help.');
body('When we configure a tool, redesign a process, or build something custom, we evaluate it through the lens of the hardest users first. If it works for them, it works for everyone.');

checkPage(200);
subheading('What We Deliver to Client Organizations');
bullet('WCAG 2.1 AA conformance review for any web-facing tool we configure or build');
bullet('Plain-language audit of staff-facing documentation and client communications');
bullet('Trauma-informed design review of intake forms, onboarding flows, and client-facing interfaces');
bullet('Alternative format support assessment — screen readers, keyboard navigation, color contrast, font size');
bullet('Staff training that includes basic accessibility practices for the tools they will maintain');

checkPage(200);
subheading('What We Teach in the Fellowship');
bullet('WCAG 2.1 AA fundamentals — not memorization, but working understanding');
bullet('How to run a basic accessibility audit using free tools (axe, WAVE, manual keyboard testing)');
bullet('Plain-language writing as a professional standard — not a style preference');
bullet('Trauma-informed design principles and their application in nonprofit settings');
bullet('How to give accessibility feedback in a code review or a project debrief');
body('Accessibility is taught as applied skill, not theory. Fellows learn it by doing it on real client work. By the time they graduate, reviewing their own work through an accessibility lens is habit, not extra effort.');

checkPage(160);
subheading('Why This Is a Competitive Differentiator');
body('Most technology service providers treat accessibility as a project phase — something that happens after the "real work" is done. We treat it as the professional standard that the real work is held to. That distinction changes outcomes. It also makes our fellows genuinely more valuable in any technology role they enter after the fellowship.');

// ===========================
// 8. THE AI ADVANTAGE
// ===========================
doc.addPage();
sectionStart('8. The AI Advantage', 'viking-tech');

body('handl\u0259kraft is built for this moment. Agentic engineering — where AI handles more and more of the deep technical implementation — is transforming software development. We are not fighting that trend. We are teaching people to direct it well.');

body('Our philosophy is simple: AI is the co-worker, not the competitor. Our fellows focus on what matters most — understanding the problem deeply, recommending the honest path, configuring what\'s needed, and transferring capability to real users. They learn to direct AI tools with confidence, review their output critically, and take responsibility for the outcome.');

subheading('For Fellows');
bullet('AI handles the heavy technical lifting — fellows focus on problem understanding, decision-making, and quality');
bullet('Fellows learn to direct AI tools, review output, catch errors, and iterate — the core skill of the emerging workforce');
bullet('Focus shifts from memorizing syntax to understanding problems, owning solutions, and communicating clearly');
bullet('Graduates enter whatever comes next trained for where technology is heading, not where it\'s been');

checkPage(180);
subheading('For Organizations');
bullet('AI-powered workflows allow us to serve more organizations with the same team capacity');
bullet('Tools and configurations we recommend are informed by current best-in-class AI-assisted options');
bullet('Fellows bring a problem-first mindset — they care about solving your problem, not shipping a particular solution');
bullet('Documentation written with AI assistance is clearer, more consistent, and more maintainable');

checkPage(140);
subheading('For the Mission');
bullet('Lower barriers to entry mean a wider, more diverse community of learners');
bullet('Faster configuration and documentation delivery means more impact per dollar donated');
bullet('As AI capabilities accelerate, our model scales with them — every advance makes our fellows more capable, not less relevant');
bullet('Accessibility tooling is improving rapidly — we stay current and bring that currency to every engagement');

// ===========================
// 9. OPERATING MODEL & PRINCIPLES
// ===========================
doc.addPage();
sectionStart('9. Operating Model & Principles', 'viking-flag');

body('handl\u0259kraft is not a conventional nonprofit. We are a self-managed, mission-driven organization that takes its operating principles as seriously as its program commitments. These principles are not aspirational language — they are how we actually run.');

subheading('30-Hour Workweek');
body('Our staff work a 30-hour week. This is not a concession to work-life balance — it is a strategic commitment. We believe sustainable, high-quality work requires intentional boundaries. The 30-hour week filters for intrinsic motivation, forces prioritization, and models for our fellows that a good organization respects the full humanity of its people. We will not expand hours under pressure. If we can\'t accomplish our goals in 30 hours, we have set the wrong goals.');

checkPage(180);
subheading('Self-Managed Structure');
body('handl\u0259kraft operates on teal organization principles — distributed authority, explicit roles, and decisions made by the people closest to the work. We do not have layers of approval or managers reviewing the work of people who know more than they do. Staff are accountable to the mission, to each other, and to the board — not to hierarchical authority for its own sake.');

checkPage(200);
subheading('Honesty as a Practice');
body('We tell clients when they don\'t need us. We tell fellows when they\'re not ready. We tell the board when something isn\'t working. We tell donors exactly what their money is funding. This honesty is not a value we aspire to — it is a practice we hold ourselves to, and it is the foundation of every trust relationship we build.');

checkPage(180);
subheading('Capability Transfer as the Exit Criterion');
body('Every engagement ends when the client can operate without us. We measure our success not by the elegance of what we built but by how well the client\'s staff can run it six months later. Documentation is not an afterthought — it is a deliverable. Training is not optional — it is the point.');

checkPage(200);
subheading('Year 1: Walking Before We Run (Launches September 1, 2026)');
body('Year 1 is about getting the foundation right. We are not trying to build the full program on day one. Our goals are to operate soundly, support our first fellows and organizations with genuine care, and learn what we need to learn to grow responsibly.');
bullet('Complete all legal, HR, and compliance infrastructure before operations begin');
bullet('Launch a small first cohort — the right size to mentor well, not to impress');
bullet('Complete 2-3 pilot engagements for local organizations, with real care for quality');
bullet('Learn what good looks like for our clients, our fellows, and our team');
bullet('Set real Year 2 milestones together as a board, based on what we learn');

checkPage(200);
subheading('Year 2: Finding Our Stride');
bullet('Scale cohort size based on mentor capacity and what we learned in Year 1');
bullet('Complete more engagements for community organizations');
bullet('Track and publish employment outcomes for graduates');
bullet('Begin applying for foundation and government workforce development grants');
bullet('Expand mentor network to include volunteer senior technologists');

checkPage(200);
subheading('Year 3 and Beyond: Expanding Our Reach');
bullet('Scale cohorts as infrastructure and funding allow');
bullet('Explore geographic expansion or remote-first delivery');
bullet('Develop partnerships with employers for graduate placement');
bullet('Pursue government contracts for civic technology projects');
bullet('Publish impact report and case studies');
body('The Year 2 and 3 vision is directional, not a firm commitment. Pace and ambition will be set by the board together, based on what we learn in Year 1.');

// ===========================
// 10. FUNDING STRATEGY
// ===========================
doc.addPage();
sectionStart('10. Funding Strategy', 'viking-treasure');

body('handl\u0259kraft is 100% donation-funded in its founding stage. Our funding approach grows with the organization:');

subheading('Founding Stage (Year 1)');
bullet('Founding sponsors — companies and individuals who want to support workforce development and community technology');
bullet('Individual donors — people who believe in the three-stream model');
bullet('Founder investment — our founding team is personally committed to getting this off the ground');

checkPage(200);
subheading('Growth Stage (Years 2-3)');
bullet('Foundation grants — workforce development, digital equity, and community technology grants');
bullet('Government grants — federal and state workforce development programs (WIOA, etc.)');
bullet('Corporate partnerships — sponsorships, employee volunteer programs, hiring pipeline agreements');
bullet('Fee-for-service civic contracts — paid government technology projects that help fund our free work');

checkPage(140);
subheading('Budget Transparency');
body('We believe in full transparency. Our annual budget, expenditures, and impact metrics will be published openly. Every dollar donated goes toward three interconnected outcomes: better-equipped organizations, brighter futures for non-traditional learners, and technology that works for everyone those organizations serve.');

// ===========================
// 11. FOUNDING TEAM
// ===========================
doc.addPage();
sectionStart('11. Founding Team', 'viking-handshake');

body('handl\u0259kraft was founded by a father-son team who believe the best things in life are built together — and that the best organizations are built with honesty, care, and clear principles.');

subheading('Founder');
body('A retiring Service-Disabled Veteran-Owned Small Business (SDVOSB) software entrepreneur with decades of experience building enterprise software solutions. His career spans government contracting, commercial software development, and small business leadership. He brings deep expertise in project management, client relations, software architecture, and — critically — how to deliver capability that actually transfers to clients after the engagement ends.');

subheading('Co-Founder');
body('Working alongside his father, the co-founder brings modern product development skills, deep experience with AI-powered and agentic development tools, and a genuine passion for making technology careers accessible to people from all backgrounds. He leads curriculum design and brings the strategic perspective of someone who has seen what\'s working in the current technology landscape.');

checkPage(160);
subheading('We\'re Growing Our Team');
body('We are actively looking for:');
bullet('Founding board members with experience in nonprofit governance, workforce development, accessibility, or technology');
bullet('Founding sponsors who want to help shape this from day one');
bullet('Volunteer senior technologists willing to mentor fellows and review work');
bullet('Advisory council members from the communities we serve — including disability advocates, workforce development experts, and community organizers');

// ===========================
// 12. IMPLEMENTATION TIMELINE
// ===========================
doc.addPage();
sectionStart('12. Implementation Timeline', 'viking-ship-building');

body('Between now and our September 1 launch, our founding team will handle all the legwork. What the board provides is review, advice, and presence at four meetings. Below is the shape of what\'s coming — nothing will catch anyone off guard.');

subheading('April – May 2026: Foundations');
const aprilMay = [
  'Engage nonprofit and employment attorneys',
  'File Articles of Incorporation; obtain EIN; file state charitable and tax-exemption registrations',
  'Draft bylaws and seat the founding board',
  'Open bank account and set up bookkeeping',
  'Commission compensation comparability study',
  'Select PEO (Professional Employer Organization) to handle payroll, benefits, workers\' comp, and HR compliance',
  'Board Meeting #1: ratify bylaws, elect officers, adopt conflict of interest policy, approve banking and initial budget framework',
];
aprilMay.forEach(t => bullet(t));
spacer(0.5);

checkPage(200);
subheading('June 2026: Filings and Commitments');
const june = [
  'File IRS Form 1023 for 501(c)(3) status',
  'Bind D&O and general liability insurance',
  'Sign PEO agreement and begin onboarding',
  'Execute founder gift agreement',
  'Board Meeting #2: approve Year 1 budget, approve staff compensation (founder recused), approve gift agreement structure',
];
june.forEach(t => bullet(t));
spacer(0.5);

checkPage(200);
subheading('July 2026: Documentation');
const july = [
  'Finalize employee handbook, offer letters, student program agreement, and client nonprofit agreement',
  'Confirm benefits and workers\' comp coverage through PEO',
  'Accessibility policy and accommodation process documented',
  'Board Meeting #3: approve offer letters, employee handbook, and program agreements',
];
july.forEach(t => bullet(t));
spacer(0.5);

checkPage(200);
subheading('August 2026: Final Readiness');
const august = [
  'Complete I-9/W-4 processes and payroll dry-run',
  'Confirm all insurance is active',
  'First client discovery conversations begin',
  'First fellow applications reviewed',
  'Board Meeting #4: final readiness check and go/no-go confirmation',
];
august.forEach(t => bullet(t));
spacer(0.5);

checkPage(100);
doc.font('Helvetica-Bold').fontSize(14).fillColor(teal).text('September 1, 2026 — Operations Begin');
doc.moveDown(0.4);
body('This is the date we\'ve been building toward. Staff onboarded, infrastructure in place, first fellows and client organizations ready to begin. A few important notes: we do not need the 501(c)(3) determination letter in hand by September — the application filed is sufficient. We do not need a full curriculum or a polished website or any Year 2 ambitions. We are walking, not running, in Year 1 — and we\'ll set our real milestones together as a board.');
spacer(0.5);

checkPage(160);
subheading('Year 2 and Beyond');
const future = [
  'Scale to 2 cohorts per year as infrastructure and funding mature',
  'Track and publish employment and accessibility outcomes',
  'Apply for foundation and government workforce development grants',
  'Expand mentor network to include volunteer senior technologists',
  'Explore civic technology partnerships and employer placement agreements',
  'Begin Tier 2 cohort if a volunteer lead has been identified and Tier 1 lessons absorbed',
];
future.forEach(t => bullet(t));
body('The pace and ambition of Years 2 and 3 will be set by the board together, based on what we learn in Year 1. The vision is clear — the milestones are ours to define.');

// ===========================
// 13. HOW YOU CAN HELP
// ===========================
doc.addPage();
sectionStart('13. How You Can Help', 'viking-welcome');

body('handl\u0259kraft is just getting started. We need people who believe in this vision to help us bring it to life. Here\'s how you can be part of it:');

subheading('Become a Founding Sponsor');
body('Founding sponsors help shape handl\u0259kraft from the ground up. Your support goes directly to building services for community organizations and launching careers for people who deserve a chance. Founding sponsors are recognized in all materials and have a voice in our direction.');

checkPage(160);
subheading('Join Our Board');
body('We\'re looking for board members with experience in nonprofit governance, workforce development, technology, accessibility, community organizing, or philanthropy. This is a ground-floor opportunity to help build something genuinely good.');

checkPage(160);
subheading('Volunteer as a Mentor');
body('Senior technologists, project managers, and experienced practitioners can volunteer as mentors, project advisors, or curriculum reviewers. Even a few hours per month makes a real difference in a fellow\'s trajectory.');

checkPage(160);
subheading('Refer an Organization');
body('Know a nonprofit, community organization, or local agency that could use honest technology help? Send them our way. We want to hear from any organization doing good work on a tight budget.');

checkPage(160);
subheading('Refer a Fellow');
body('Know someone who\'s been locked out of a technology career — not for lack of ability, but for lack of access? Tell them about the fellowship. Neurodivergent learners, formerly incarcerated individuals, veterans, people in recovery, single parents, people with disabilities — they are exactly who we\'re looking for.');

checkPage(160);
subheading('Apply for the Fellowship');
body('If you have a high school diploma or GED and a genuine desire to learn and help — we want to meet you. No college degree required. No tuition. Accessibility accommodations available. Non-traditional candidates are not just welcome — they are the point.');

spacer(1);
const divY = doc.y;
doc.strokeColor(gold).lineWidth(1.5).moveTo(contentLeft, divY).lineTo(contentRight, divY).stroke();
spacer(1);

doc.font('Helvetica-Bold').fontSize(14).fillColor(navy)
  .text('Get in Touch', { align: 'center' });
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(12).fillColor(teal)
  .text('robert@retired.email', { align: 'center' });
doc.moveDown(0.3);
doc.font('Helvetica').fontSize(10).fillColor(lightGray)
  .text('handl\u0259kraft is a 501(c)(3) nonprofit initiative. All donations are tax-deductible.', { align: 'center' });
doc.moveDown(0.3);
doc.font('Helvetica').fontSize(10).fillColor(lightGray)
  .text('Founded by a father-son team. Powered by agency, service, and community.', { align: 'center' });

// ===========================
// SOURCE DOCUMENTS
// ===========================
doc.addPage();
doc.rect(0, 0, pageWidth, 6).fill(gold);
spacer(1);

doc.font('Helvetica-Bold').fontSize(20).fillColor(navy).text('Program Documents', { align: 'center' });
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(11).fillColor(lightGray)
  .text('The following source documents are referenced in this plan and available for download.', { align: 'center', lineGap: 3 });
doc.moveDown(2);

const docs = [
  {
    title: 'Tier 1 Training Plan — Foundational Applied AI',
    subtitle: 'Draft for Board Review · 6 weeks · Target launch Q4 2026',
    url: 'https://handlekraft.ai/docs/handlekraft-tier1-training-plan.docx',
    desc: 'Full curriculum including weekly structure, learning outcomes, artifact descriptions, accessibility integration, assessment approach, open questions for the board, and instructor notes for the pilot cohort.',
  },
  {
    title: 'Tier 2 Training Plan — Applied Claude Code',
    subtitle: 'Early Draft for Board Awareness · 4 weeks · Target launch Q2 2027',
    url: 'https://handlekraft.ai/docs/handlekraft-tier2-training-plan.docx',
    desc: 'Program overview, audience profile, guiding philosophy, weekly structure, learner outcomes, accessibility curriculum integration, open questions, and post-program pathway. Shared for board awareness rather than decision.',
  },
];

docs.forEach((d, i) => {
  checkPage(160);
  const boxY = doc.y;
  doc.rect(contentLeft, boxY, contentRight - contentLeft, 2).fill(i === 0 ? teal : gold);
  doc.moveDown(0.8);

  doc.font('Helvetica-Bold').fontSize(14).fillColor(navy).text(d.title);
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(10).fillColor(lightGray).text(d.subtitle);
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(11).fillColor(darkGray).text(d.desc, { lineGap: 3 });
  doc.moveDown(0.6);

  doc.font('Helvetica').fontSize(11).fillColor(teal)
    .text('Download: ' + d.url, { link: d.url, underline: true });
  doc.moveDown(1.5);
});

doc.moveDown(1);
const refDivY = doc.y;
doc.strokeColor(gold).lineWidth(1).moveTo(contentLeft, refDivY).lineTo(contentRight, refDivY).stroke();
doc.moveDown(0.8);
doc.font('Helvetica').fontSize(9).fillColor(lightGray)
  .text('These documents are living drafts. Board input is welcomed and will shape the final versions.', { align: 'center' });

doc.end();

output.on('finish', () => {
  console.log('Strategic Plan PDF generated successfully at client/public/proposal.pdf');
});
