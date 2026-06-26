const cron = require("node-cron");

const {
  refreshMarketData,
} = require(
  "../services/marketdata.service"
);

const {
  expireDayOrders,
} = require(
  "../../limit-order/services/limitOrder.service"
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

function startDayOrderExpiryJob() {
  cron.schedule(
    "0 16 * * 1-5",
    async () => {
      try {
        const expiredOrders =
          await expireDayOrders();

        console.log(
          `Expired ${expiredOrders.length} DAY limit orders`
        );
      } catch (error) {
        console.error(
          "Failed to expire DAY limit orders",
          error.message
        );
      }
    },
    {
      timezone:
        process.env.MARKET_TIMEZONE ||
        "Asia/Kolkata",
    }
  );
}

module.exports = {
  startMarketDataJob,
  startDayOrderExpiryJob,
};
