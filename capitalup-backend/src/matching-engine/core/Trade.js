class Trade {

    constructor({
        tradeId,
        id,
        orderId,
        userId,
        symbol,
        buyOrderId,
        sellOrderId,
        buyerId,
        sellerId,
        executedQuantity,
        quantity,
        executedPrice,
        price,
        timestamp = Date.now()
    }) {

        this.tradeId = tradeId ?? id;
        this.id = this.tradeId;

        this.orderId = orderId;
        this.userId = userId;
        this.symbol = symbol;

        this.buyOrderId = buyOrderId;
        this.sellOrderId = sellOrderId;

        this.buyerId = buyerId;
        this.sellerId = sellerId;

        this.executedQuantity =
            executedQuantity ?? quantity;
        this.quantity = this.executedQuantity;

        this.executedPrice =
            executedPrice ?? price;
        this.price = this.executedPrice;

        this.timestamp = timestamp;
    }

}

module.exports = Trade;
