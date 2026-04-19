import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const doc = new PDFDocument({
  size: 'letter',
  margins: { top: 72, bottom: 72, left: 72, right: 72 },
  info: {
    Title: 'handlekraft — Organizational Proposal',
    Author: 'handlekraft',
    Subject: 'Founding Proposal for handlekraft 501(c)(3)',
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
  .text('ORGANIZATIONAL PROPOSAL', contentLeft, 200, { characterSpacing: 4, align: 'center' });

doc.moveDown(1);
doc.fontSize(52).fillColor('#FFFFFF').font('Helvetica-Bold')
  .text('handlekraft', contentLeft, 240, { align: 'center' });

doc.moveDown(0.3);
doc.fontSize(14).fillColor(gold).font('Helvetica')
  .text('handle · kraft — Norwegian: the power to act', contentLeft, undefined, { align: 'center' });

doc.moveDown(1.5);
doc.fontSize(14).fillColor('#FFFFFF').font('Helvetica').opacity(0.7)
  .text('Free Software & Websites for Community Organizations.', contentLeft, undefined, { align: 'center' });
doc.fontSize(14).fillColor('#FFFFFF').font('Helvetica').opacity(0.7)
  .text('Product-Focused Training for Aspiring Problem Solvers.', contentLeft, undefined, { align: 'center' });
doc.opacity(1);

safeImage(img('viking-ship-building'), 106, 430, 400);

doc.fontSize(11).fillColor(gold).font('Helvetica-Bold')
  .text('501(c)(3) Nonprofit Initiative', contentLeft, 680, { align: 'center' });
doc.fontSize(11).fillColor('#FFFFFF').font('Helvetica').opacity(0.6)
  .text('Launching September 1, 2026', contentLeft, undefined, { align: 'center' });
doc.opacity(1);

doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica').opacity(0.4)
  .text('This is a living document. We welcome questions, ideas, and conversations.', contentLeft, 740, { align: 'center' });
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
  ['4', 'Three Ways We Deliver Agency'],
  ['5', 'Who We Serve'],
  ['6', 'The Fellowship Program'],
  ['7', 'The AI Advantage'],
  ['8', 'Operating Model'],
  ['9', 'Funding Strategy'],
  ['10', 'Founding Team'],
  ['11', 'Implementation Timeline'],
  ['12', 'How You Can Help'],
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

body('handlekraft is an early-stage 501(c)(3) nonprofit that pairs aspiring product builders with community organizations that need help — creating free, custom software and websites that give organizations the power to act.');

body('We exist at the intersection of two needs that belong together:');

bullet('Community organizations and local agencies are underserved by technology — running critical work on spreadsheets, paper forms, and outdated systems they can\'t afford to replace.');
bullet('Talented people from non-traditional backgrounds are locked out of tech careers by an industry that too often values credentials over capability.');

body('handlekraft brings these two worlds together. Our fellows learn to own products from idea to delivery — using AI-powered tools to solve real problems for real organizations, with caring expert supervision at every step. Organizations receive powerful, custom tools at no cost. Fellows gain verifiable experience, a professional portfolio, and a genuine pathway into tech.');

body('Founded by a father-son team — a retiring Service-Disabled Veteran-Owned Small Business (SDVOSB) software entrepreneur and his son — handlekraft combines decades of enterprise software experience with a deep belief that the best way to learn is by helping someone who needs it.');

subheading('Key Facts');
bullet('Cost to organizations: $0');
bullet('100% donation-funded');
bullet('No formal education required beyond a high school diploma or GED');
bullet('Non-traditional candidates are our priority');
bullet('Product-focused training: fellows learn to own and deliver solutions, not just write code');
bullet('Dual impact: software delivery + career development');

// ===========================
// 2. THE PROBLEM
// ===========================
doc.addPage();
sectionStart('2. The Problem', 'viking-search');

subheading('The Technology Gap');
body('Thousands of community organizations — homeless shelters, free clinics, food banks, youth mentorship programs, veteran service organizations — and underfunded state and local government agencies rely on manual processes to manage life-changing work. They track client intake on paper. They manage case files in shared spreadsheets. They communicate via sticky notes and whiteboard schedules.');

body('Commercial software solutions cost tens of thousands of dollars per year. Off-the-shelf tools rarely fit their unique operational needs. And even when grants cover software costs, there\'s rarely budget for customization, training, or ongoing support.');

body('The result: the organizations that care the most about their communities are often the least equipped to serve them efficiently.');

checkPage(200);
subheading('The Opportunity Gap');
body('Right now, the tech industry is in the middle of a historic shift. AI tools are reshaping how software gets built, and companies are rethinking what their teams look like. Entry-level hiring has tightened — but this is a moment, not a permanent condition. The door will swing open again, and when it does, the people who are ready will walk through it.');

body('The challenge is that talented people from non-traditional backgrounds — career changers, veterans, single parents, GED holders, and self-taught learners — often can\'t get that first real opportunity to prove what they can do. Bootcamps and community college programs build foundational skills, but without professional experience and a real portfolio, graduates cycle through rejection.');

body('handlekraft exists to close that gap right now — so that when the industry is ready, our fellows already are. We give them real projects, real mentorship, and real skills so they\'re not waiting for an opportunity. They\'re building one.');

checkPage(180);
subheading('The Emerging Capability');
body('AI-powered development tools — GitHub Copilot, Cursor, Replit, and others — have fundamentally changed what it means to build software. Agentic engineering is accelerating fast: AI handles more and more of the deep technical implementation, while humans focus on understanding problems, designing solutions, and owning the product.');

body('This shift means the most valuable skill isn\'t memorizing syntax or mastering low-level architecture — it\'s knowing how to apply emerging tools to solve real problems. With the right guidance and real-world projects, motivated people can reach professional competency in weeks rather than years. handlekraft trains people for where the industry is heading, not where it\'s been.');

// ===========================
// 3. OUR APPROACH
// ===========================
doc.addPage();
sectionStart('3. Our Approach', 'viking-idea');

body('handlekraft works as a simple, powerful cycle:');

spacer(0.3);
subheading('Step 1: Listen');
body('Community organizations, nonprofits, and local agencies tell us what they need — a website, a scheduling tool, a better way to track clients. Our team listens carefully, scopes the project, and figures out how to help.');

subheading('Step 2: Build Together');
body('We pair each project with fellows who own the solution end to end — scoping requirements, designing the product, and building it with AI-powered tools, with senior mentors guiding them every step of the way. Every deliverable is reviewed. Professional practices are followed from day one.');

subheading('Step 3: Deliver with Care');
body('Organizations receive custom-built tools — intake systems, scheduling platforms, donor dashboards, websites, workflow automation — tailored to their needs. We provide training and support to make sure adoption sticks.');

subheading('Step 4: Pay It Forward');
body('As fellows grow, they take on more complex products and begin mentoring the next group. Graduates leave with a real portfolio of products they owned, real references, and the ability to leverage emerging tools to solve any problem. Many transition into paid tech careers — and some come back to help the next cohort.');

body('Each graduating class strengthens our ability to help more organizations and welcome more learners. That\'s the handlekraft — the power to act, multiplied.');

// ===========================
// 4. THREE WAYS WE DELIVER AGENCY
// ===========================
doc.addPage();
sectionStart('4. Three Ways We Deliver Agency', 'viking-builder');

subheading('1. Free Software & Web Design');
body('We work like a caring software consultancy — but the bill is always $0. What we build:');
bullet('Custom websites and landing pages');
bullet('Client intake and case management systems');
bullet('Scheduling and appointment tools');
bullet('Donor and volunteer management platforms');
bullet('Dashboards and reporting tools');
bullet('Workflow automation and process digitization');
bullet('Data migration from legacy systems');
body('Every solution is shaped around the organization\'s real needs, built on modern technology, and delivered with training and documentation.');

checkPage(200);
subheading('2. Product-Focused Training');
body('Our fellowship trains people to own and deliver products — not just write code. We teach fellows to leverage AI-powered tools to solve problems, with a grounded understanding of the architectures underneath:');
bullet('2-4 week foundational program covering how software products work — databases, interfaces, logic, and workflows — with AI tools doing the heavy lifting');
bullet('Immediate placement on real products with senior mentorship');
bullet('Fellows own their projects end to end: scoping, building, delivering, and supporting');
bullet('A portfolio of deployed, live products — not classroom exercises');
bullet('No tuition. No college degree required. Only a high school diploma or GED.');
body('Non-traditional candidates — GED holders, career changers, veterans, single parents, self-taught learners — are exactly who we\'re looking for.');

checkPage(160);
subheading('3. A Growing Community');
body('As fellows advance, they mentor the next group. This creates a cycle that lifts everyone:');
bullet('Our capacity to help organizations grows with each graduating class');
bullet('More organizations get the tools they need');
bullet('More people gain real-world experience and launch careers');
bullet('Graduates often return as volunteer mentors');
body('Over time, handlekraft becomes a self-sustaining engine for community technology and product-focused career development.');

// ===========================
// 5. WHO WE SERVE
// ===========================
doc.addPage();
sectionStart('5. Who We Serve', 'viking-community');

subheading('Organizations We Help');
body('We serve nonprofits, community service organizations, and underserved state and local government agencies — any organization doing good work on a tight budget that could use the power to act.');

const orgs = [
  ['Shelters', 'Homeless shelters and transitional housing programs'],
  ['Clinics', 'Free and sliding-scale community health clinics'],
  ['Social Services', 'Case management and social service agencies'],
  ['Food Banks', 'Food banks, pantries, and community kitchens'],
  ['Youth Programs', 'Mentorship and after-school programs'],
  ['Veteran Services', 'Veteran service and transition organizations'],
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
body('Our fellowship prioritizes non-traditional candidates — people with the drive and curiosity to solve problems and own products, but without access to traditional pathways into tech:');

const candidates = [
  'GED holders and high school graduates',
  'Career changers from non-tech industries',
  'Veterans transitioning to civilian careers',
  'Single parents returning to the workforce',
  'Self-taught learners without formal credentials',
  'Underemployed workers seeking upward mobility',
  'Community college students and non-degree candidates',
];

candidates.forEach(c => bullet(c));

body('The only prerequisites are a high school diploma or GED, basic computer literacy, and the willingness to learn and help. We\'re not looking for people who already know how to code — we\'re looking for people who want to solve problems and own the outcome.');

// ===========================
// 6. THE FELLOWSHIP PROGRAM
// ===========================
doc.addPage();
sectionStart('6. The Fellowship Program', 'viking-mentoring');

subheading('Phase 1: Foundations (Weeks 1-4)');
body('Fellows complete a supportive foundational program focused on understanding how software products work and how to build them with AI-powered tools:');
bullet('How software products are structured: databases, interfaces, logic, and workflows');
bullet('Working with AI development tools: directing agents, reviewing output, iterating on solutions');
bullet('Understanding architectures at a practical level — enough to make smart decisions, not to build from scratch');
bullet('Version control and collaborative workflows');
bullet('Product thinking: scoping problems, designing solutions, and delivering value');
body('The emphasis is on learning by doing. Fellows build small functional products from day one — using AI tools for the deep technical work while they focus on solving problems and owning the outcome.');

checkPage(200);
subheading('Phase 2: Real Products (Weeks 5-12)');
body('Fellows are paired with real client products under caring senior supervision:');
bullet('Own actual products being built for community organizations — from requirements to delivery');
bullet('Follow professional workflow: sprints, standups, retrospectives');
bullet('Use AI agents for implementation while focusing on product decisions and quality');
bullet('Build a portfolio of live, deployed products with real impact');
bullet('Receive regular feedback, encouragement, and mentorship');

checkPage(200);
subheading('Phase 3: Grow & Give Back (Weeks 13+)');
body('As fellows advance, they step into bigger roles:');
bullet('Take on more complex products and higher-level architectural decisions');
bullet('Begin reviewing work from newer fellows');
bullet('Serve as product leads on smaller projects');
bullet('Mentor the next cohort');

checkPage(140);
subheading('Phase 4: Launch Your Career');
body('Graduates leave the program with:');
bullet('A portfolio of 3-5 deployed, real-world products they owned end to end');
bullet('Verifiable professional experience in a team environment');
bullet('The ability to leverage AI-powered tools to build and ship products — the skill employers increasingly need');
bullet('Professional references from senior engineers');
bullet('Job search support and interview preparation');

// ===========================
// 7. THE AI ADVANTAGE
// ===========================
doc.addPage();
sectionStart('7. The AI Advantage', 'viking-tech');

body('handlekraft is built for this moment. Agentic engineering — where AI handles more and more of the deep technical implementation — is transforming software development. We\'re not fighting that trend. We\'re riding it.');

body('Our philosophy is simple: AI agents do the deep stuff. Our fellows focus on what matters most — understanding the problem, designing the right solution, and owning the product. We teach people to apply emerging tools with a practical understanding of the architectures underneath, not to compete with AI on implementation.');

subheading('For Fellows');
bullet('AI agents handle the heavy technical lifting — fellows focus on product thinking, problem solving, and quality');
bullet('Fellows learn to direct AI tools, review their output, and iterate — the core skill of the emerging workforce');
bullet('Focus shifts from memorizing syntax to understanding problems and owning solutions end to end');
bullet('Graduates enter the job market trained for where the industry is heading, not where it\'s been');

checkPage(180);
subheading('For Organizations');
bullet('AI-powered workflows mean faster delivery, so we can help more organizations each cycle');
bullet('Products are built on modern stacks that are easier to maintain long-term');
bullet('Fellows bring a product mindset — they care about solving your problem, not just shipping code');

checkPage(140);
subheading('For the Mission');
bullet('Lower barriers to entry mean a wider, more diverse community of learners — you don\'t need a CS degree to own a product');
bullet('Faster product delivery means more impact per dollar donated');
bullet('As AI capabilities accelerate, our model scales with them — every advance makes our fellows more capable, not less relevant');

// ===========================
// 8. OPERATING MODEL
// ===========================
doc.addPage();
sectionStart('8. Operating Model', 'viking-flag');

subheading('Year 1: Walking Before We Run (Launches September 1, 2026)');
body('Year 1 is about getting the foundation right. We are not trying to build the full program on day one. Our goals are to operate soundly, support our first fellows and organizations well, and learn what we need to learn to grow responsibly.');
bullet('Complete all legal, HR, and compliance infrastructure before operations begin');
bullet('Launch a small first cohort — the right size to mentor well, not to impress');
bullet('Complete 2-3 pilot projects for local organizations, with real care for quality');
bullet('Learn what good looks like for our clients, our fellows, and our team');
bullet('Set real Year 2 milestones together as a board, based on what we learn');
body('We do not need a full curriculum, a polished website, or any of the Year 2 and 3 ambitions in hand on September 1. The real milestones will be set by the board once we have our feet under us.');

checkPage(200);
subheading('Year 2: Finding Our Stride');
bullet('Scale cohort size based on mentor capacity and what we learned in Year 1');
bullet('Complete more projects for community organizations and local agencies');
bullet('Track and publish employment outcomes for graduates');
bullet('Begin applying for foundation and government workforce development grants');
bullet('Expand mentor network to include volunteer senior engineers');

checkPage(200);
subheading('Year 3 and Beyond: Expanding Our Reach');
bullet('Scale cohorts as infrastructure and funding allow');
bullet('Explore geographic expansion or remote delivery');
bullet('Develop partnerships with employers for graduate placement');
bullet('Pursue government contracts for civic technology projects');
bullet('Publish impact report and case studies');
body('The Year 2 and 3 vision is directional, not a firm commitment. Pace and ambition will be set by the board together.');

// ===========================
// 9. FUNDING STRATEGY
// ===========================
doc.addPage();
sectionStart('9. Funding Strategy', 'viking-treasure');

body('handlekraft is 100% donation-funded in its founding stage. Our funding approach grows with the organization:');

subheading('Founding Stage (Year 1)');
bullet('Founding sponsors — companies and individuals who want to support workforce development and community technology');
bullet('Individual donors — people who believe in the dual-impact model');
bullet('Founder investment — our founding team is personally committed to getting this off the ground');

checkPage(200);
subheading('Growth Stage (Years 2-3)');
bullet('Foundation grants — workforce development, digital equity, and community technology grants');
bullet('Government grants — federal and state workforce development programs (WIOA, etc.)');
bullet('Corporate partnerships — sponsorships, employee volunteer programs, hiring pipeline agreements');
bullet('Fee-for-service civic contracts — paid government technology projects that help fund our free work');

checkPage(140);
subheading('Budget Transparency');
body('We believe in full transparency. Our annual budget, expenditures, and impact metrics will be published openly. Every dollar donated goes toward two outcomes: better tools for organizations that need them, and brighter futures for people who deserve them.');

// ===========================
// 10. FOUNDING TEAM
// ===========================
doc.addPage();
sectionStart('10. Founding Team', 'viking-handshake');

body('handlekraft was founded by a father-son team who believe the best things in life are built together.');

subheading('Founder');
body('A retiring Service-Disabled Veteran-Owned Small Business (SDVOSB) software entrepreneur with decades of experience building enterprise software solutions. His career spans government contracting, commercial software development, and small business leadership. He brings deep expertise in project management, client relations, and software architecture — along with a lifelong commitment to giving back.');

subheading('Co-Founder');
body('Working alongside his father, the co-founder brings modern product development skills, deep experience with AI-powered and agentic development tools, and a genuine passion for making tech careers accessible to people from all backgrounds.');

checkPage(140);
subheading('We\'re Growing Our Team');
body('We are actively looking for:');
bullet('Founding board members with experience in nonprofit governance, workforce development, or technology');
bullet('Founding sponsors who want to help shape this from day one');
bullet('Volunteer senior engineers willing to mentor fellows and review code');
bullet('Advisory council members from the communities we serve');

// ===========================
// 11. IMPLEMENTATION TIMELINE
// ===========================
doc.addPage();
sectionStart('11. Implementation Timeline', 'viking-ship-building');

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
  'Board Meeting #3: approve offer letters, employee handbook, and program agreements',
];
july.forEach(t => bullet(t));
spacer(0.5);

checkPage(200);
subheading('August 2026: Final Readiness');
const august = [
  'Complete I-9/W-4 processes and payroll dry-run',
  'Confirm all insurance is active',
  'Board Meeting #4: final readiness check and go/no-go confirmation',
];
august.forEach(t => bullet(t));
spacer(0.5);

checkPage(100);
doc.font('Helvetica-Bold').fontSize(14).fillColor(teal).text('September 1, 2026 — Operations Begin');
doc.moveDown(0.4);
body('This is the date we\'ve been building toward. Staff onboarded, infrastructure in place, and our first fellows and client organizations ready to begin. A few important notes: we do not need the 501(c)(3) determination letter in hand by September — the application filed is sufficient, and donors are ready on that basis. We also do not need a full curriculum, a polished website, or any of the Year 2 and 3 ambitions. We are walking, not running, this first year — and we\'ll set our real milestones together as a board.');
spacer(0.5);

checkPage(160);
subheading('Year 2 and Beyond');
const future = [
  'Scale to 2 cohorts per year as infrastructure and funding mature',
  'Track and publish employment outcomes for graduates',
  'Apply for foundation and government workforce development grants',
  'Expand mentor network to include volunteer senior engineers',
  'Explore civic technology partnerships and employer placement agreements',
];
future.forEach(t => bullet(t));
body('The pace and ambition of Years 2 and 3 will be set by the board together, based on what we learn in Year 1. The vision is clear — the milestones are ours to define.');

// ===========================
// 12. HOW YOU CAN HELP
// ===========================
doc.addPage();
sectionStart('12. How You Can Help', 'viking-welcome');

body('handlekraft is just getting started. We need people who believe in this vision to help us bring it to life. Here\'s how you can be part of it:');

subheading('Become a Founding Sponsor');
body('Founding sponsors help shape handlekraft from the ground up. Your support goes directly to building software for community organizations and launching careers for people who deserve a chance. Founding sponsors are recognized in all materials and have a voice in our direction.');

checkPage(160);
subheading('Join Our Board');
body('We\'re looking for board members with experience in nonprofit governance, workforce development, technology, community organizing, or philanthropy. This is a ground-floor opportunity to help build something genuinely good.');

checkPage(160);
subheading('Volunteer as a Mentor');
body('Senior engineers and experienced developers can volunteer as code reviewers, project mentors, or curriculum advisors. Even a few hours per month makes a real difference in a fellow\'s journey.');

checkPage(160);
subheading('Refer an Organization');
body('Know a nonprofit, community organization, or local agency that could use the power to act? Send them our way. We want to hear from any organization doing good work on a tight budget.');

checkPage(160);
subheading('Apply for the Fellowship');
body('If you have a high school diploma or GED, curiosity, and the drive to learn — we want to meet you. No college degree required. No tuition. Non-traditional candidates are exactly who we\'re looking for.');

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
  .text('handlekraft is a 501(c)(3) nonprofit initiative.', { align: 'center' });
doc.font('Helvetica').fontSize(10).fillColor(lightGray)
  .text('All donations are tax-deductible.', { align: 'center' });
doc.moveDown(0.3);
doc.font('Helvetica').fontSize(10).fillColor(lightGray)
  .text('Founded by a father-son team. Powered by agency, code, and community.', { align: 'center' });

doc.end();

output.on('finish', () => {
  console.log('Proposal PDF generated successfully at client/public/proposal.pdf');
});
