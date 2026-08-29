class GeneralTool {
  async execute({ question, user }) {
    return {
      type: "GENERAL",
      data: {
        question,
        greeting: true,
      },
    };
  }
}

module.exports = new GeneralTool();
