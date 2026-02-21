import PDFDocument from 'pdfkit';
import fs from 'fs';

const doc = new PDFDocument({
  size: 'letter',
  margins: { top: 72, bottom: 72, left: 72, right: 72 },
  info: {
    Title: 'The Buddy Promise — Organizational Proposal',
    Author: 'The Buddy Promise',
    Subject: 'Founding Proposal for The Buddy Promise 501(c)(3)',
  }
});

const output = fs.createWriteStream('client/public/proposal.pdf');
doc.pipe(output);

const navy = '#0B1D3A';
const teal = '#14B8A6';
const darkGray = '#333333';
const medGray = '#555555';
const lightGray = '#888888';

function heading(text, size = 24) {
  doc.font('Helvetica-Bold').fontSize(size).fillColor(navy).text(text);
  doc.moveDown(0.5);
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

function divider() {
  doc.moveDown(0.5);
  const y = doc.y;
  doc.strokeColor('#ddd').lineWidth(0.5).moveTo(72, y).lineTo(540, y).stroke();
  doc.moveDown(0.8);
}

function checkPage(needed = 120) {
  if (doc.y + needed > 700) {
    doc.addPage();
  }
}

// ===========================
// COVER PAGE
// ===========================
doc.rect(0, 0, 612, 792).fill(navy);

doc.fontSize(14).fillColor(teal).font('Helvetica')
  .text('ORGANIZATIONAL PROPOSAL', 72, 200, { characterSpacing: 4 });

doc.moveDown(1);
doc.fontSize(42).fillColor('#FFFFFF').font('Helvetica-Bold')
  .text('The Buddy\nPromise', 72, 240);

doc.moveDown(1.5);
doc.fontSize(14).fillColor('#FFFFFF').font('Helvetica').opacity(0.7)
  .text('Free Software & Websites for Community Organizations.\nHands-On Training for Aspiring Developers.', 72);

doc.opacity(1);
doc.moveDown(4);

doc.fontSize(11).fillColor(teal).font('Helvetica-Bold')
  .text('501(c)(3) Nonprofit Initiative', 72);
doc.fontSize(11).fillColor('#FFFFFF').font('Helvetica').opacity(0.6)
  .text('Founding Stage — 2026', 72);
doc.opacity(1);

doc.fontSize(10).fillColor('#FFFFFF').font('Helvetica').opacity(0.4)
  .text('This is a living document. We welcome questions, ideas, and conversations.', 72, 700);
doc.opacity(1);

// ===========================
// TABLE OF CONTENTS
// ===========================
doc.addPage();
heading('Table of Contents', 28);
spacer(0.5);

const tocItems = [
  ['1', 'Executive Summary', 3],
  ['2', 'The Problem', 3],
  ['3', 'Our Approach', 4],
  ['4', 'Three Ways We Help', 5],
  ['5', 'Who We Serve', 6],
  ['6', 'The Fellowship Program', 7],
  ['7', 'The AI Advantage', 8],
  ['8', 'Operating Model', 9],
  ['9', 'Funding Strategy', 10],
  ['10', 'Founding Team', 11],
  ['11', 'Implementation Timeline', 11],
  ['12', 'How You Can Help', 12],
];

tocItems.forEach(([num, title, page]) => {
  doc.font('Helvetica').fontSize(12).fillColor(darkGray)
    .text(`${num}.  ${title}`, 72, doc.y, { continued: false });
  doc.moveDown(0.4);
});

// ===========================
// 1. EXECUTIVE SUMMARY
// ===========================
doc.addPage();
heading('1. Executive Summary');
divider();

body('The Buddy Promise is an early-stage 501(c)(3) nonprofit that pairs aspiring developers with community organizations that need help — building free, custom software and websites side by side, like buddies do.');

body('We exist at the intersection of two needs that belong together:');

bullet('Community organizations and local agencies are underserved by technology — running critical work on spreadsheets, paper forms, and outdated systems they can\'t afford to replace.');
bullet('Talented people from non-traditional backgrounds are locked out of tech careers by an industry that demands years of experience for entry-level roles.');

body('The Buddy Promise brings these two worlds together. Our fellows build real software for real organizations under caring, expert supervision, using modern AI-assisted development tools. Organizations receive powerful, custom tools at no cost. Fellows gain verifiable experience, a professional portfolio, and a genuine pathway into tech.');

body('Founded by a father-son team — a retiring Service-Disabled Veteran-Owned Small Business (SDVOSB) software entrepreneur and his son — The Buddy Promise combines decades of enterprise software experience with a deep belief that the best way to learn is by helping someone who needs it.');

subheading('Key Facts');
bullet('Cost to organizations: $0');
bullet('100% donation-funded');
bullet('No formal education required beyond a high school diploma or GED');
bullet('Non-traditional candidates are our priority');
bullet('Dual impact: software delivery + career development');

// ===========================
// 2. THE PROBLEM
// ===========================
doc.addPage();
heading('2. The Problem');
divider();

subheading('The Technology Gap');
body('Thousands of community organizations — homeless shelters, free clinics, food banks, youth mentorship programs, veteran service organizations — and underfunded state and local government agencies rely on manual processes to manage life-changing work. They track client intake on paper. They manage case files in shared spreadsheets. They communicate via sticky notes and whiteboard schedules.');

body('Commercial software solutions cost tens of thousands of dollars per year. Off-the-shelf tools rarely fit their unique operational needs. And even when grants cover software costs, there\'s rarely budget for customization, training, or ongoing support.');

body('The result: the organizations that care the most about their communities are often the least equipped to serve them efficiently.');

checkPage(200);
subheading('The Workforce Gap');
body('At the same time, the tech industry has a pipeline problem. Entry-level positions increasingly require 2-3 years of professional experience, leaving talented people from non-traditional backgrounds on the outside looking in — career changers, veterans, formerly incarcerated individuals, single parents, GED holders, and self-taught learners.');

body('Bootcamps and community college programs produce graduates with foundational skills but no professional experience. Without that first real opportunity, talented people cycle through rejection — and the industry misses out on diverse perspectives and problem-solving approaches it desperately needs.');

checkPage(120);
subheading('The Timing Opportunity');
body('AI-assisted development tools — GitHub Copilot, Cursor, Replit, and others — have fundamentally changed the learning curve for software development. Motivated learners can now build functional, production-quality software far faster than was possible even two years ago. With the right guidance and real-world projects, motivated people can reach professional competency in weeks rather than years. The door is open wider than it\'s ever been.');

// ===========================
// 3. OUR APPROACH
// ===========================
doc.addPage();
heading('3. Our Approach');
divider();

body('The Buddy Promise works as a simple, warm cycle:');

spacer(0.3);
subheading('Step 1: Listen');
body('Community organizations, nonprofits, and local agencies tell us what they need — a website, a scheduling tool, a better way to track clients. Our team listens carefully, scopes the project, and figures out how to help.');

subheading('Step 2: Build Together');
body('We pair each project with fellows who build the solution using AI-assisted tools, with senior mentors guiding them every step of the way. Every line of code is reviewed. Professional practices are followed from day one.');

subheading('Step 3: Deliver with Care');
body('Organizations receive custom-built tools — intake systems, scheduling platforms, donor dashboards, websites, workflow automation — tailored to their needs. We provide training and support to make sure adoption sticks.');

subheading('Step 4: Pay It Forward');
body('As fellows grow, they take on more complex projects and begin mentoring the next group. Graduates leave with a real portfolio, real references, and real skills. Many transition into paid tech careers — and some come back to help the next buddy.');

body('Each graduating class strengthens our ability to help more organizations and welcome more learners. That\'s the promise.');

// ===========================
// 4. THREE WAYS WE HELP
// ===========================
doc.addPage();
heading('4. Three Ways We Help');
divider();

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
subheading('2. Hands-On Training');
body('Our fellowship is designed as a warm, supportive on-ramp to tech careers:');
bullet('2-4 week foundational program covering databases, forms, logic, version control, and AI-assisted tools');
bullet('Immediate placement on real projects with senior mentorship');
bullet('Professional practices from day one: code review, testing, collaborative workflow');
bullet('A portfolio of deployed, live projects — not classroom exercises');
bullet('No tuition. No college degree required. Only a high school diploma or GED.');
body('Non-traditional candidates — GED holders, career changers, veterans, formerly incarcerated individuals, single parents, self-taught learners — are exactly who we\'re looking for.');

checkPage(160);
subheading('3. A Growing Family');
body('As fellows advance, they mentor the next group. This creates a cycle that lifts everyone:');
bullet('Our capacity to help organizations grows with each graduating class');
bullet('More organizations get the tools they need');
bullet('More people gain real-world experience and launch careers');
bullet('Graduates often return as volunteer mentors');
body('Over time, The Buddy Promise becomes a self-sustaining engine for community technology and career development.');

// ===========================
// 5. WHO WE SERVE
// ===========================
doc.addPage();
heading('5. Who We Serve');
divider();

subheading('Organizations We Help');
body('We serve nonprofits, community service organizations, and underserved state and local government agencies — any organization doing good work on a tight budget that could use a technology buddy.');

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
  doc.font('Helvetica-Bold').fontSize(11).fillColor(navy).text(name, { continued: true });
  doc.font('Helvetica').fillColor(darkGray).text(` — ${desc}`);
  doc.moveDown(0.3);
});

spacer(0.5);
subheading('People We Train');
body('Our fellowship prioritizes non-traditional candidates — people with the drive and curiosity to learn but without access to traditional pathways into tech:');

const candidates = [
  'GED holders and high school graduates',
  'Career changers from non-tech industries',
  'Veterans transitioning to civilian careers',
  'Formerly incarcerated individuals seeking stable employment',
  'Single parents returning to the workforce',
  'Self-taught learners without formal credentials',
  'Underemployed workers seeking upward mobility',
  'Community college students and non-degree candidates',
];

candidates.forEach(c => bullet(c));

body('The only prerequisites are a high school diploma or GED, basic computer literacy, and the willingness to learn and help.');

// ===========================
// 6. THE FELLOWSHIP PROGRAM
// ===========================
doc.addPage();
heading('6. The Fellowship Program');
divider();

subheading('Phase 1: Foundations (Weeks 1-4)');
body('Fellows complete a supportive foundational program covering:');
bullet('Core web development concepts: HTML, CSS, JavaScript');
bullet('Database fundamentals: SQL, data modeling, CRUD operations');
bullet('Version control with Git and collaborative workflows');
bullet('AI-assisted development: prompt engineering, code generation, debugging with AI tools');
bullet('Professional practices: code review, documentation, testing basics');
body('The emphasis is on learning by doing. Fellows build small functional projects from day one with AI-assisted tools and senior support.');

checkPage(200);
subheading('Phase 2: Real Projects (Weeks 5-12)');
body('Fellows are paired with real client projects under caring senior supervision:');
bullet('Work on actual software being built for community organizations');
bullet('Follow professional workflow: sprints, standups, retrospectives');
bullet('All code reviewed by senior mentors before deployment');
bullet('Build a portfolio of live, deployed projects with real impact');
bullet('Receive regular feedback, encouragement, and mentorship');

checkPage(200);
subheading('Phase 3: Grow & Give Back (Weeks 13+)');
body('As fellows advance, they step into bigger roles:');
bullet('Take on more complex features and architectural decisions');
bullet('Begin reviewing code from newer fellows');
bullet('Serve as team leads on smaller projects');
bullet('Mentor the next group of buddies');

checkPage(140);
subheading('Phase 4: Launch Your Career');
body('Graduates leave the program with:');
bullet('A portfolio of 3-5 deployed, real-world projects');
bullet('Verifiable professional experience in a team environment');
bullet('Modern AI-assisted development skills that employers want');
bullet('Professional references from senior engineers');
bullet('Job search support and interview preparation');

// ===========================
// 7. THE AI ADVANTAGE
// ===========================
doc.addPage();
heading('7. The AI Advantage');
divider();

body('The Buddy Promise is built for this moment. AI-assisted development tools have changed what\'s possible — and we\'re using them to open doors wider:');

subheading('For Fellows');
bullet('AI tools act as a patient, always-available coding partner, accelerating the learning curve dramatically');
bullet('Fellows can build functional, production-quality software in weeks rather than months');
bullet('Focus shifts from memorizing syntax to understanding problems and designing thoughtful solutions');
bullet('Graduates enter the job market with AI-native skills that employers increasingly need');

checkPage(180);
subheading('For Organizations');
bullet('Projects can be scoped and delivered faster, meaning we can help more organizations each cycle');
bullet('AI tools help maintain code quality even with newer developers');
bullet('Modern technology stacks that are easier to maintain long-term');

checkPage(140);
subheading('For the Mission');
bullet('Lower barriers to entry mean a wider, more diverse community of learners');
bullet('Faster project delivery means more impact per dollar donated');
bullet('AI-assisted development is the future — our graduates are trained for where the industry is heading');

// ===========================
// 8. OPERATING MODEL
// ===========================
doc.addPage();
heading('8. Operating Model');
divider();

subheading('Year 1: Getting Started');
bullet('Establish 501(c)(3) status and organizational infrastructure');
bullet('Recruit founding board members and advisory council');
bullet('Secure founding sponsors');
bullet('Launch pilot cohort of 5-8 fellows');
bullet('Complete 3-5 pilot projects for local organizations');
bullet('Document processes, curriculum, and quality standards');

checkPage(200);
subheading('Year 2: Growing');
bullet('Scale to 2 cohorts per year (10-16 fellows total)');
bullet('Complete 8-12 projects for community organizations and local agencies');
bullet('Track and publish employment outcomes for graduates');
bullet('Begin applying for government and foundation grants');
bullet('Expand mentor network to include volunteer senior engineers');

checkPage(200);
subheading('Year 3: Expanding');
bullet('Scale to 3-4 cohorts per year');
bullet('Explore geographic expansion or remote delivery');
bullet('Develop partnerships with employers for graduate placement');
bullet('Pursue government contracts for civic technology projects');
bullet('Publish impact report and case studies');

// ===========================
// 9. FUNDING STRATEGY
// ===========================
doc.addPage();
heading('9. Funding Strategy');
divider();

body('The Buddy Promise is 100% donation-funded in its founding stage. Our funding approach grows with the organization:');

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
heading('10. Founding Team');
divider();

body('The Buddy Promise was founded by a father-son team who believe the best things in life are built together.');

subheading('Founder');
body('A retiring Service-Disabled Veteran-Owned Small Business (SDVOSB) software entrepreneur with decades of experience building enterprise software solutions. His career spans government contracting, commercial software development, and small business leadership. He brings deep expertise in project management, client relations, and software architecture — along with a lifelong commitment to giving back.');

subheading('Co-Founder');
body('Working alongside his father, the co-founder brings modern development skills, experience with AI-assisted development tools, and a genuine passion for making tech careers accessible to people from all backgrounds.');

checkPage(140);
subheading('We\'re Growing Our Family');
body('We are actively looking for:');
bullet('Founding board members with experience in nonprofit governance, workforce development, or technology');
bullet('Founding sponsors who want to help shape this from day one');
bullet('Volunteer senior engineers willing to mentor fellows and review code');
bullet('Advisory council members from the communities we serve');

// ===========================
// 11. IMPLEMENTATION TIMELINE
// ===========================
checkPage(300);
heading('11. Implementation Timeline');
divider();

const timeline = [
  ['Q1 2026', 'File 501(c)(3) application. Recruit founding board members and sponsors. Finalize curriculum.'],
  ['Q2 2026', 'Launch pilot cohort (5-8 fellows). Begin first 3 client projects. Build mentor network.'],
  ['Q3 2026', 'Complete pilot projects. Gather impact data. Begin second cohort intake.'],
  ['Q4 2026', 'Publish first impact report. Apply for foundation and government grants. Plan Year 2 growth.'],
  ['2027', 'Scale to 2-3 cohorts/year. Expand into civic technology projects. Develop employer partnerships.'],
  ['2028', 'Explore geographic expansion. Launch alumni mentorship program. Pursue sustainable revenue through government contracts.'],
];

timeline.forEach(([period, desc]) => {
  checkPage(80);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(teal).text(period);
  doc.font('Helvetica').fontSize(11).fillColor(darkGray).text(desc, { lineGap: 3 });
  doc.moveDown(0.6);
});

// ===========================
// 12. HOW YOU CAN HELP
// ===========================
doc.addPage();
heading('12. How You Can Help');
divider();

body('The Buddy Promise is just getting started. We need people who believe in this vision to help us bring it to life. Here\'s how you can be part of it:');

subheading('Become a Founding Sponsor');
body('Founding sponsors help shape The Buddy Promise from the ground up. Your support goes directly to building software for community organizations and launching careers for people who deserve a chance. Founding sponsors are recognized in all materials and have a voice in our direction.');

checkPage(160);
subheading('Join Our Board');
body('We\'re looking for board members with experience in nonprofit governance, workforce development, technology, community organizing, or philanthropy. This is a ground-floor opportunity to help build something genuinely good.');

checkPage(160);
subheading('Volunteer as a Mentor');
body('Senior engineers and experienced developers can volunteer as code reviewers, project mentors, or curriculum advisors. Even a few hours per month makes a real difference in a fellow\'s journey.');

checkPage(160);
subheading('Refer an Organization');
body('Know a nonprofit, community organization, or local agency that could use a technology buddy? Send them our way. We want to hear from any organization doing good work on a tight budget.');

checkPage(160);
subheading('Apply for the Fellowship');
body('If you have a high school diploma or GED, curiosity, and the drive to learn — we want to meet you. No college degree required. No tuition. Non-traditional candidates are exactly who we\'re looking for.');

spacer(1);
divider();
spacer(0.5);

doc.font('Helvetica-Bold').fontSize(14).fillColor(navy)
  .text('Get in Touch', { align: 'center' });
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(12).fillColor(darkGray)
  .text('hello@thebuddypromise.org', { align: 'center' });
doc.moveDown(0.3);
doc.font('Helvetica').fontSize(10).fillColor(lightGray)
  .text('The Buddy Promise is a 501(c)(3) nonprofit initiative.', { align: 'center' });
doc.font('Helvetica').fontSize(10).fillColor(lightGray)
  .text('All donations are tax-deductible.', { align: 'center' });
doc.moveDown(0.3);
doc.font('Helvetica').fontSize(10).fillColor(lightGray)
  .text('Founded by a father-son team. Powered by kindness, code, and community.', { align: 'center' });

doc.end();

output.on('finish', () => {
  console.log('Proposal PDF generated successfully at client/public/proposal.pdf');
});
