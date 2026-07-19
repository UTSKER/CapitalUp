const portfolioService = require("../../../portfolio/services/portfolio.service");

class PortfolioTool {
  async execute({ user }) {
    if (!user) {
      throw new Error("Authentication required.");
    }

    const portfolio = await portfolioService.getPortfolio(user.id);

    return {
      type: "PORTFOLIO",
      data: portfolio,
    };
  }
}

module.exports = new PortfolioTool();
