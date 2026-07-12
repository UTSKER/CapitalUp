# Section: Support and Ticketing System (Work in Progress)
## Topic: Help Requests, Ticket Creation, and Support Channels

### Overview
This system is currently under active development and outlines how users will request technical or financial support from CapitalUp administrators.

---

### Topic: Planned Support Ticket Flow
- **Description:** 
  - Users will be able to create a support ticket from their dashboard if they experience transaction delays, KYC rejections, or platform difficulties.
- **Planned Endpoints:**
  - Create Ticket: `POST /api/v1/tickets/`
  - Get User Tickets: `GET /api/v1/tickets/`
  - Add Message Response: `POST /api/v1/tickets/:id/messages`
- **Planned Fields:**
  - `ticket_id`: Unique tracking ID.
  - `subject`: Summary of the issue.
  - `category`: E.g., `PAYMENT`, `KYC`, `ORDER`, `TECHNICAL`.
  - `description`: Text specifying the problem.
  - `status`: State lifecycle of the ticket (`OPEN`, `RESOLVED`, `CLOSED`).

---

### Topic: Admin Ticket Management
- **Description:**
  - Admin accounts will have access to a support console (`GET /api/v1/admin/tickets/`) to review tickets, assign priorities, reply directly to the user's issue, and mark tickets as `RESOLVED`.

---

### Topic: Troubleshooting and Error Scenarios
1. **Error: "Feature under development"**
   - **Reason:** The support ticket subsystem is currently work-in-progress and has not been fully activated on the server.
   - **Solution:** Send an email directly to platform helpdesk support instead.
2. **Error: "Cannot reply to a closed ticket"**
   - **Reason:** Once a ticket's status is set to `CLOSED` or `RESOLVED`, further chat messages or replies are blocked to prevent stale discussion.
   - **Solution:** Open a new support ticket if the issue persists.
