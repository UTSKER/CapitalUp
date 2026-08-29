const portfolioService = require("../../../portfolio/services/portfolio.service");

class PortfolioTool {
  async execute({ user }) {
    const userId = user?.userId || user?.id;
    if (!userId) {
      return {
        type: "PORTFOLIO",
        data: { holdings: [], totalValue: 0, realizedPnl: 0 },
      };
    }

    const portfolio = await portfolioService.getPortfolio(userId);

    return {
      type: "PORTFOLIO",
      data: portfolio,
    };
  }
}

module.exports = new PortfolioTool();
