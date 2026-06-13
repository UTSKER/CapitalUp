const cron = require("node-cron");

const {
  refreshMarketData,
} = require(
  "../services/marketdata.service"
);

function startMarketDataJob() {
  cron.schedule(
    "*/10 * * * * *",
    async () => {
      console.log(
        "Running market data refresh..."
      );

      await refreshMarketData();
    }
  );
}

module.exports = {
  startMarketDataJob,
};