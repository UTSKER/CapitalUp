class TicketTool {
  async execute({ user }) {
    return {
      type: "TICKET",
      data: {
        active: false,
        message: "The support ticket subsystem is currently work-in-progress and has not been fully activated on the server. Ticket creation and live chat support are coming soon!"
      }
    };
  }
}

module.exports = new TicketTool();
