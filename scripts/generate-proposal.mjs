import PDFDocument from 'pdfkit';
import fs from 'fs';

const doc = new PDFDocument({
  size: 'letter',
  margins: { top: 72, bottom: 72, left: 72, right: 72 },
  info: {
    Title: 'Code for Communities — Organizational Proposal',
    Author: 'Code for Communities',
    Subject: 'Founding Proposal for Code for Communities 501(c)(3)',
  }
});

const output = fs.createWriteStream('client/public/proposal.pdf');
doc.pipe(output);

const navy = '#0B1D3A';
const teal = '#0EA5E9';
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
  .text('Code for\nCommunities', 72, 240);

doc.moveDown(1.5);
doc.fontSize(14).fillColor('#FFFFFF').font('Helvetica').opacity(0.7)
  .text('Free Software & Web Design for Community Organizations.\nWorkforce Training for Underserved Talent.', 72);

doc.opacity(1);
doc.moveDown(4);

doc.fontSize(11).fillColor(teal).font('Helvetica-Bold')
  .text('501(c)(3) Nonprofit Initiative', 72);
doc.fontSize(11).fillColor('#FFFFFF').font('Helvetica').opacity(0.6)
  .text('Founding Stage — 2026', 72);
doc.opacity(1);

doc.fontSize(10).fillColor('#FFFFFF').font('Helvetica').opacity(0.4)
  .text('This is a living document. We welcome questions, critiques, and conversations.', 72, 700);
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
  ['3', 'Our Solution', 4],
  ['4', 'Three Pillars of Impact', 5],
  ['5', 'Who We Serve', 6],
  ['6', 'Workforce Development Program', 7],
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

body('Code for Communities is an early-stage 501(c)(3) nonprofit initiative that delivers free, custom-built software and websites to community organizations, nonprofits, and underserved state and local government agencies — while simultaneously training underserved candidates in AI-assisted software development.');

body('We operate at the intersection of two urgent needs:');

bullet('Community organizations and local agencies are underserved by technology — running critical operations on spreadsheets, paper forms, and outdated systems they can\'t afford to replace.');
bullet('Talented people from non-traditional backgrounds are locked out of tech careers by an industry that demands years of experience for entry-level roles.');

body('Code for Communities bridges both gaps at once. Our trainees build real software for real organizations under expert supervision, using modern AI-assisted development tools. Organizations receive powerful, custom tools at no cost. Trainees gain verifiable experience, a professional portfolio, and a direct pathway into the tech workforce.');

body('Founded by a retiring Service-Disabled Veteran-Owned Small Business (SDVOSB) software entrepreneur working alongside his son, Code for Communities brings decades of enterprise software experience to the nonprofit sector — combined with deep knowledge of the AI-assisted development tools that are transforming how software gets built.');

subheading('Key Facts');
bullet('Cost to organizations: $0');
bullet('100% donation-funded');
bullet('No formal education required beyond a high school diploma or GED');
bullet('Non-traditional candidates are our priority');
bullet('Dual impact: software delivery + workforce development');

// ===========================
// 2. THE PROBLEM
// ===========================
doc.addPage();
heading('2. The Problem');
divider();

subheading('The Technology Gap');
body('Thousands of community organizations — homeless shelters, free clinics, food banks, youth mentorship programs, veteran service organizations — and underfunded state and local government agencies rely on manual processes to manage life-changing work. They track client intake on paper. They manage case files in shared spreadsheets. They communicate via sticky notes and whiteboard schedules.');

body('Commercial software solutions cost tens of thousands of dollars per year. Off-the-shelf tools rarely fit their unique operational needs. And even when grants cover software costs, there\'s rarely budget for customization, training, or ongoing support.');

body('The result: organizations that serve our most vulnerable populations are themselves underserved by technology.');

checkPage(200);
subheading('The Workforce Gap');
body('At the same time, the tech industry faces a pipeline problem of its own making. Entry-level positions increasingly require 2-3 years of professional experience, pricing out candidates from non-traditional backgrounds — career changers, veterans, formerly incarcerated individuals, single parents, GED holders, and self-taught learners.');

body('Coding bootcamps and community college programs produce graduates with foundational skills but no professional experience. Without that first break, talented people cycle through rejection, and the industry loses access to diverse perspectives and problem-solving approaches.');

checkPage(120);
subheading('The Timing Opportunity');
body('AI-assisted development tools — GitHub Copilot, Cursor, Replit, and others — have fundamentally changed the learning curve for software development. Motivated learners can now build functional, production-quality software far faster than was possible even two years ago. This creates a historic window: with the right supervision and real-world projects, motivated candidates can reach professional competency in weeks rather than years.');

// ===========================
// 3. OUR SOLUTION
// ===========================
doc.addPage();
heading('3. Our Solution');
divider();

body('Code for Communities operates as a virtuous cycle with four stages:');

spacer(0.3);
subheading('Stage 1: Identify Need');
body('Community organizations, nonprofits, and local government agencies apply for free custom software and web design. Our senior team evaluates applications, scopes projects, and prioritizes based on impact and feasibility.');

subheading('Stage 2: Build Under Supervision');
body('Trainees build the software using AI-assisted development tools under the direct supervision of senior engineers. Every line of code is reviewed before it goes live. Projects follow professional engineering practices: version control, code review, testing, and iterative deployment.');

subheading('Stage 3: Deliver & Support');
body('Organizations receive custom-built tools — intake systems, scheduling platforms, donor management dashboards, websites, workflow automation — tailored to their specific needs. We provide training and ongoing support to ensure adoption.');

subheading('Stage 4: Graduate & Mentor');
body('As trainees advance, they take on more complex projects and begin mentoring new cohorts. Graduates leave with a professional portfolio of deployed, real-world projects, verifiable experience, and modern development skills. Many will transition into paid roles in the tech industry.');

body('The cycle then repeats — each cohort of graduates strengthens the organization\'s capacity to serve more organizations and train more people.');

// ===========================
// 4. THREE PILLARS
// ===========================
doc.addPage();
heading('4. Three Pillars of Impact');
divider();

subheading('Pillar 1: Pro Bono Software & Web Design');
body('We function as a high-quality software consultancy — but our invoice is always $0. Our deliverables include:');
bullet('Custom websites and landing pages');
bullet('Client intake and case management systems');
bullet('Scheduling and appointment tools');
bullet('Donor and volunteer management platforms');
bullet('Dashboards and reporting tools');
bullet('Workflow automation and process digitization');
bullet('Data migration from legacy systems');
body('Every solution is tailored to the organization\'s specific operational needs, built on modern, maintainable technology, and delivered with training and documentation.');

checkPage(200);
subheading('Pillar 2: Workforce Training');
body('Our training program is designed as a fast on-ramp to tech careers, not a traditional classroom experience:');
bullet('2-4 week foundational program covering databases, forms, logic, version control, and AI-assisted development tools');
bullet('Immediate placement on real client projects with senior supervision');
bullet('Professional engineering practices from day one: code review, testing, agile workflow');
bullet('Portfolio of deployed, live projects — not toy exercises');
bullet('No tuition. No college degree required. Only a high school diploma or GED.');
body('Non-traditional candidates — GED holders, career changers, veterans, formerly incarcerated individuals, single parents, self-taught learners — are our priority.');

checkPage(160);
subheading('Pillar 3: The Virtuous Cycle');
body('As trainees advance, they take on increasingly complex projects and begin mentoring new cohorts. This creates a self-reinforcing cycle:');
bullet('The organization\'s delivery capacity grows with each graduating cohort');
bullet('More organizations receive free software');
bullet('More trainees gain real-world experience');
bullet('Graduates enter the workforce and may return as volunteer mentors');
body('Over time, Code for Communities becomes a sustainable engine for both community technology and workforce development.');

// ===========================
// 5. WHO WE SERVE
// ===========================
doc.addPage();
heading('5. Who We Serve');
divider();

subheading('Organizations We Support');
body('We serve nonprofits, community service organizations, and underserved state and local government agencies — any mission-driven organization running on shoestring technology that serves the public good.');

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
subheading('Candidates We Train');
body('Our training program prioritizes non-traditional candidates who have the aptitude and drive but lack access to traditional pathways into tech:');

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

body('The only prerequisites are a high school diploma or GED, basic computer literacy, and the motivation to learn.');

// ===========================
// 6. WORKFORCE DEVELOPMENT
// ===========================
doc.addPage();
heading('6. Workforce Development Program');
divider();

subheading('Phase 1: Foundations (Weeks 1-4)');
body('Trainees complete an intensive foundational program covering:');
bullet('Core web development concepts: HTML, CSS, JavaScript');
bullet('Database fundamentals: SQL, data modeling, CRUD operations');
bullet('Version control with Git and collaborative workflows');
bullet('AI-assisted development: prompt engineering, code generation, debugging with AI tools');
bullet('Professional practices: code review, documentation, testing basics');
body('The emphasis is on practical application, not theory. Trainees build small functional projects from day one using AI-assisted tools.');

checkPage(200);
subheading('Phase 2: Real Projects (Weeks 5-12)');
body('Trainees are assigned to real client projects under direct senior supervision:');
bullet('Work on actual software being built for community organizations');
bullet('Follow professional agile workflow: sprints, standups, retrospectives');
bullet('All code reviewed by senior engineers before deployment');
bullet('Build a portfolio of live, deployed projects with verifiable impact');
bullet('Receive regular feedback and mentorship');

checkPage(200);
subheading('Phase 3: Advance & Mentor (Weeks 13+)');
body('Top performers graduate into expanded roles:');
bullet('Take on more complex features and architectural decisions');
bullet('Begin reviewing code from newer trainees');
bullet('Serve as team leads on smaller projects');
bullet('Mentor incoming cohort members');

checkPage(140);
subheading('Phase 4: Launch Your Career');
body('Graduates leave the program with:');
bullet('A portfolio of 3-5 deployed, real-world projects');
bullet('Verifiable professional experience working in a team environment');
bullet('Modern AI-assisted development skills that are in high demand');
bullet('Professional references from senior engineers');
bullet('Job search support and interview preparation');

// ===========================
// 7. THE AI ADVANTAGE
// ===========================
doc.addPage();
heading('7. The AI Advantage');
divider();

body('Code for Communities is built for this specific moment in technology. AI-assisted development tools have fundamentally changed what\'s possible:');

subheading('For Trainees');
bullet('AI tools act as a "senior pair programmer" available 24/7, accelerating the learning curve dramatically');
bullet('Trainees can build functional, production-quality software in weeks rather than months');
bullet('Focus shifts from memorizing syntax to understanding problems and designing solutions');
bullet('Graduates enter the job market with the AI-native development skills employers increasingly demand');

checkPage(180);
subheading('For Organizations');
bullet('Projects can be scoped and delivered faster, meaning more organizations served per cohort');
bullet('AI tools help maintain code quality even with junior developers');
bullet('Modern technology stacks that are easier to maintain long-term');

checkPage(140);
subheading('For the Model');
bullet('Lower barriers to entry mean a wider, more diverse talent pool');
bullet('Faster project delivery means more impact per dollar donated');
bullet('AI-assisted development is the future of the industry — our graduates are trained for where the market is going, not where it\'s been');

// ===========================
// 8. OPERATING MODEL
// ===========================
doc.addPage();
heading('8. Operating Model');
divider();

subheading('Year 1: Foundation');
bullet('Establish 501(c)(3) status and organizational infrastructure');
bullet('Recruit founding board members and advisory council');
bullet('Secure founding corporate sponsors');
bullet('Launch pilot cohort of 5-8 trainees');
bullet('Complete 3-5 pilot projects for local organizations');
bullet('Document processes, curriculum, and quality standards');

checkPage(200);
subheading('Year 2: Validation');
bullet('Scale to 2 cohorts per year (10-16 trainees total)');
bullet('Complete 8-12 projects for community organizations and local agencies');
bullet('Track and publish employment outcomes for graduates');
bullet('Begin applying for government and foundation grants');
bullet('Expand mentor network to include volunteer senior engineers');

checkPage(200);
subheading('Year 3: Growth');
bullet('Scale to 3-4 cohorts per year');
bullet('Explore geographic expansion or remote delivery model');
bullet('Develop partnerships with employers for graduate placement');
bullet('Pursue government contracts for civic technology projects');
bullet('Publish impact report and case studies');

// ===========================
// 9. FUNDING STRATEGY
// ===========================
doc.addPage();
heading('9. Funding Strategy');
divider();

body('Code for Communities is 100% donation-funded in its founding stage. Our funding strategy is built on diversified revenue streams that grow with the organization:');

subheading('Founding Stage (Year 1)');
bullet('Founding corporate sponsors — companies that want to support workforce development and community technology');
bullet('Individual donors — people who believe in the dual-impact model');
bullet('Founder investment — the founding team is personally committed to getting this off the ground');

checkPage(200);
subheading('Growth Stage (Years 2-3)');
bullet('Foundation grants — workforce development, digital equity, and community technology grants');
bullet('Government grants — federal and state workforce development programs (WIOA, etc.)');
bullet('Corporate partnerships — sponsorships, employee volunteer programs, hiring pipeline agreements');
bullet('Fee-for-service civic contracts — paid government technology projects that subsidize free nonprofit work');

checkPage(140);
subheading('Budget Transparency');
body('We are committed to radical financial transparency. Our annual budget, expenditures, and impact metrics will be published publicly. Every dollar donated goes toward two outcomes: software for organizations that need it, and careers for people who deserve them.');

// ===========================
// 10. FOUNDING TEAM
// ===========================
doc.addPage();
heading('10. Founding Team');
divider();

body('Code for Communities was founded by a father-son team combining decades of enterprise software experience with fresh perspective on modern development practices.');

subheading('Founder');
body('A retiring Service-Disabled Veteran-Owned Small Business (SDVOSB) software entrepreneur with decades of experience building enterprise software solutions. His career spans government contracting, commercial software development, and small business leadership. He brings deep expertise in project management, client relations, and software architecture — along with a commitment to giving back to the communities that supported his career.');

subheading('Co-Founder');
body('Working alongside his father, the co-founder brings modern development skills, experience with AI-assisted development tools, and a passion for making tech careers accessible to people from non-traditional backgrounds.');

checkPage(140);
subheading('We\'re Building Our Team');
body('We are actively seeking:');
bullet('Founding board members with experience in nonprofit governance, workforce development, or technology');
bullet('Founding corporate sponsors who want to shape this organization from the ground up');
bullet('Volunteer senior engineers willing to mentor trainees and review code');
bullet('Advisory council members from the communities we aim to serve');

// ===========================
// 11. IMPLEMENTATION TIMELINE
// ===========================
checkPage(300);
heading('11. Implementation Timeline');
divider();

const timeline = [
  ['Q1 2026', 'File 501(c)(3) application. Recruit founding board members and sponsors. Finalize curriculum.'],
  ['Q2 2026', 'Launch pilot cohort (5-8 trainees). Begin first 3 client projects. Establish mentor network.'],
  ['Q3 2026', 'Complete pilot projects. Gather impact data. Begin second cohort intake.'],
  ['Q4 2026', 'Publish first impact report. Apply for foundation and government grants. Plan Year 2 expansion.'],
  ['2027', 'Scale to 2-3 cohorts/year. Expand project scope to include civic technology. Develop employer partnerships.'],
  ['2028', 'Pursue geographic expansion. Launch alumni mentorship program. Seek government contracts for sustainable revenue.'],
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

body('Code for Communities is in its founding stage. We need people who believe in this vision to help us bring it to life. Here\'s how you can get involved:');

subheading('Become a Founding Sponsor');
body('Corporate sponsors at the founding stage will shape the direction of this organization. Your investment goes directly to building software for community organizations and launching tech careers for underserved talent. Founding sponsors receive recognition in all materials, a seat at the table for strategic decisions, and the knowledge that they helped build something meaningful from the ground up.');

checkPage(160);
subheading('Join Our Board');
body('We\'re looking for board members with experience in nonprofit governance, workforce development, technology, community organizing, or philanthropy. This is a ground-floor opportunity to help build a new kind of organization.');

checkPage(160);
subheading('Volunteer as a Mentor');
body('Senior engineers and experienced developers can volunteer as code reviewers, project mentors, or curriculum advisors. Even a few hours per month makes a significant impact on trainee outcomes.');

checkPage(160);
subheading('Refer an Organization');
body('Know a nonprofit, community organization, or local government agency struggling with outdated technology? Refer them to us. We want to hear from any mission-driven organization that could benefit from custom software or web design.');

checkPage(160);
subheading('Apply for the Fellowship');
body('If you have a high school diploma or GED, problem-solving instincts, and the drive to learn — we want to hear from you. No college degree required. No bootcamp tuition. Non-traditional candidates are our priority.');

spacer(1);
divider();
spacer(0.5);

doc.font('Helvetica-Bold').fontSize(14).fillColor(navy)
  .text('Contact Us', { align: 'center' });
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(12).fillColor(darkGray)
  .text('hello@codeforcommunities.org', { align: 'center' });
doc.moveDown(0.3);
doc.font('Helvetica').fontSize(10).fillColor(lightGray)
  .text('Code for Communities is a 501(c)(3) nonprofit initiative.', { align: 'center' });
doc.font('Helvetica').fontSize(10).fillColor(lightGray)
  .text('All donations are tax-deductible.', { align: 'center' });
doc.moveDown(0.3);
doc.font('Helvetica').fontSize(10).fillColor(lightGray)
  .text('Founded by a Service-Disabled Veteran-Owned Small Business entrepreneur.', { align: 'center' });

doc.end();

output.on('finish', () => {
  console.log('Proposal PDF generated successfully at client/public/proposal.pdf');
});
