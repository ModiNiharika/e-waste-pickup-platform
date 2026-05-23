# Product Requirements Document (PRD): E-Waste Collection & Reward Platform

**Version:** 1.0 (MVP)
**Status:** Approved for MVP Development
**Author:** Niharika Modi
**Last Updated:** 07-05-2026

---

## 1. Overview & Problem Statement

### The Problem
Due to a lack of awareness and accessible disposal systems, households and small institutions often improperly dispose of electronic waste (e-waste). Many store obsolete devices indefinitely, give them to unverified scrap dealers (risking data security), or throw them in regular trash, leading to severe environmental pollution and health hazards. 

### The Solution
The E-Waste Collection & Reward Platform is a web-based service designed to make e-waste disposal simple, safe, and rewarding. By offering easy doorstep scheduling and instant reward incentives (points/coupons), the platform encourages responsible recycling while connecting users with verified recyclers.

## 2. Benefit Hypothesis & Goals

**Hypothesis:** If we provide an effortless, transparent doorstep pickup service coupled with tangible rewards, users will choose to recycle their e-waste properly rather than hoarding it or disposing of it unsafely.

### Core Goals
1. **Promote Responsible Disposal:** Make scheduling a pickup take less than 2 minutes.
2. **Incentivize Users:** Use a clear reward system to motivate action.
3. **Environmental Awareness:** Educate users on the impact of their recycling.
4. **Learning Objective:** Serve as a practical project to master the full Software Development Life Cycle (SDLC) from PRD to deployment.

### Success Metrics (V1)
- **Convenience:** >90% of users who start the request form complete it.
- **Speed:** Form submission takes < 2 minutes; confirmation appears within seconds.
- **Reliability:** <5% of pickup requests fail due to invalid user input.

---

## 3. Target Audience (Personas)

### Primary User: Households & Students
- **Profile:** Individuals with old phones, chargers, laptops, and minor appliances.
- **Pain Points:** Doesn't know where the nearest drop-off center is; lacks time to travel there.
- **Needs:** Fast scheduling, mobile-friendly UI, and instant gratification (rewards).

### Secondary User: Small Offices & Institutions
- **Profile:** Small businesses, hostels, or schools generating bulk e-waste.
- **Pain Points:** Need formal disposal for compliance; data security concerns for old hard drives.
- **Needs:** Reliable pickup, organized collection, and trust in the recycler.

### Tertiary User: System Admin (For V1 Fulfillment)
- **Profile:** Platform operator/owner.
- **Needs:** Ability to view incoming requests and manually mark them as "Completed" or "Cancelled" to trigger the reward state.

---

## 4. Scope Definition

### In Scope for MVP (V1)
- Web-based responsive frontend (Mobile-first UI).
- E-waste pickup request form with basic validation.
- Pre-defined, static reward point system based on device category.
- Simple Admin View (to view requests and update status to "Completed").
- Confirmation pages and basic state handling (Loading, Success, Error).

### Out of Scope (V1)
- Native iOS/Android mobile apps.
- Real-time GPS driver tracking.
- AI-based image recognition for waste valuation.
- Dynamic pricing/bidding by multiple recyclers.
- Complex user authentication and historical dashboards for users.
- Same-day pickup guarantees.

---

## 5. Core Features & Requirements

### F1: Pickup Request Form
Users must be able to submit a pickup request.
- **Required Fields:** Full Name, Phone Number (with validation), Full Address, E-Waste Category (Dropdown: Mobile, Laptop, Accessories, Large Appliances), Estimated Quantity.
- **Optional Fields:** Preferred pickup date/time, Additional notes.

### F2: Static Reward System
To motivate users without building complex logic in V1, a static reward table will be used.
- **Logic:** Users see estimated points upon form submission. (e.g., Laptops = 500 pts, Mobiles = 200 pts, Accessories = 50 pts).
- **Fulfillment:** Points are strictly "estimated" until the Admin marks the request as "Completed".

### F3: Request Management (Admin View)
A basic mechanism for fulfillment.
- **Functionality:** A hidden or password-protected admin route `/admin` that lists all pending requests.
- **Action:** Admin can click "Complete Pickup", which finalizes the transaction and logically awards the points to the user's phone number/account.

### F4: UI States & Validation
- **Validation:** Prevent submission of empty fields; enforce 10-digit phone numbers.
- **States:** Clear loading spinners during API calls, user-friendly error messages if the server fails, and a celebratory success page upon booking.

---

## 6. User Stories

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-01 | Household User | easily schedule an e-waste pickup from my phone | I don't have to leave my house to recycle. |
| US-02 | Household User | see an estimate of the rewards I will earn | I am motivated to complete the form. |
| US-03 | Student | know exactly what data I need to provide | the collector can find my hostel without issues. |
| US-04 | Office Manager | specify bulk quantities of e-waste | the collector brings the right vehicle. |
| US-05 | System Admin | view a list of all incoming pickup requests | I can coordinate with recyclers and update the status. |

---

## 7. Technical Architecture & Dependencies

| Component | Technology / Detail |
|---|---|
| **Backend** | Python (FastAPI or Flask) for REST APIs |
| **Frontend** | HTML5, CSS3, Vanilla JS (Mobile Responsive) |
| **Database** | SQLite (for MVP simplicity) or MySQL |
| **Environment** | `python-dotenv` for managing secrets |
| **Hosting** | Render, Heroku, or Vercel (for frontend) |

---

## 8. Competitor & SWOT Analysis

### Competitor Landscape
Many platforms (e.g., *Kabadiwalla Uncle*, *ScrapUncle*) focus heavily on general scrap (paper, metal) and less on the specific needs, data-security concerns, and rewards of pure e-waste. Our platform differentiates by being **exclusively dedicated to e-waste**, providing a cleaner, more tailored UI for electronics.

| Competitor | Focus | Strengths | Weaknesses |
|---|---|---|---|
| **Reloop** | Doorstep e-waste, green points | Good reward system | Limited regional availability |
| **ScrapUncle** | General scrap & instant payment | Quick payment, high trust | E-waste is a secondary focus |
| **E-Waste Uncle** | E-waste & verified recyclers | Professional, trusted | UI/UX can be complex |

### SWOT Analysis
- **Strengths:** Niche focus entirely on e-waste, simple scheduling UX, integrated reward motivation.
- **Weaknesses:** Bootstrapped MVP means manual fulfillment logistics and limited initial geographic reach.
- **Opportunities:** Growing government regulations around e-waste, rising environmental awareness, future integration of AI sorting.
- **Threats:** Established general scrap dealers (informal sector), fake/spam pickup requests draining operational time.

---

## 9. Product Strategy & Future Expansion
While V1 is a simple lead-generation and reward-estimation tool, the long-term vision is a **comprehensive e-waste ecosystem**.
- **Phase 2:** Introduce Recycler Dashboards where verified third-party recyclers can bid on or claim pickup requests.
- **Phase 3:** Introduce secure data-wiping certifications for corporate clients.
- **Phase 4:** Partner with local brands so users can redeem their reward points for actual discounts on new electronics.

---

## Appendix: Tasks (SDLC Build Order)

*(Included for project tracking)*

### Phase 1 - Foundation 
- [ ] Create folder structure & setup Git.
- [ ] Write CLAUDE.md / Instructions.
- [ ] Set up Python virtual environment & install dependencies.

### Phase 2 - Backend
- [ ] Design SQLite database schema (Users, Requests, Rewards).
- [ ] Create API for pickup request submission with input validation.
- [ ] Create basic `/admin` API to view and update requests.

### Phase 3 - Frontend
- [ ] Create mobile-responsive homepage UI.
- [ ] Build the pickup request form with JS validation.
- [ ] Connect frontend to backend APIs and handle loading/success/error states.

### Phase 4 - Polish & Ship
- [ ] Test edge cases (invalid inputs, server downtime).
- [ ] Write comprehensive README documentation.
- [ ] Deploy backend (e.g., Render) and frontend.
