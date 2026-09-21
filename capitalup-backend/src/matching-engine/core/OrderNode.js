class OrderNode {

    constructor({
        id,
        userId,
        accountId = null,
        symbol,
        side,
        quantity,
        limitPrice,
        validity,
        timeInForce,
        orderType,
        clientOrderId = null,
        sequence = 0,
        createdAt,
        expiresAt = null,
    }) {

        // Order Information
        this.id = id;
        this.userId = userId;
        this.accountId = accountId || userId;
        this.symbol = symbol;
        this.side = side;

        // Original quantity
        this.quantity = quantity;

        // Remaining quantity after partial execution
        this.remainingQuantity = quantity;

        this.limitPrice = limitPrice;

        // DAY / GTT / IOC / FOK
        this.validity = (validity || timeInForce || "DAY").toUpperCase();
        this.timeInForce = this.validity;
        this.orderType = (orderType || "LIMIT").toUpperCase();

        this.clientOrderId = clientOrderId || null;
        this.sequence = sequence || 0;
        this.reason = null;

        this.createdAt = createdAt || Date.now();
        this.expiresAt = expiresAt;

        // PENDING / PARTIALLY_FILLED / FILLED / CANCELLED / REJECTED
        this.status = "PENDING";

        // FIFO Queue pointers
        this.prev = null;
        this.next = null;

        // Pointer to owning PriceLevel
        this.priceLevel = null;
    }

    get filledQuantity() {
        return this.quantity - this.remainingQuantity;
    }

    isFilled() {
        return this.remainingQuantity === 0;
    }

    fill(quantity) {
        if (quantity <= 0) {
            throw new Error("Fill quantity must be greater than 0");
        }

        if (quantity > this.remainingQuantity) {
            throw new Error("Fill quantity exceeds remaining quantity");
        }

        this.remainingQuantity -= quantity;

        if (this.remainingQuantity === 0) {
            this.status = "FILLED";
        }
        else {
            this.status = "PARTIALLY_FILLED";
        }
    }

    cancel(reason = "USER_CANCELLED") {
        this.status = "CANCELLED";
        this.reason = reason;
    }

    reject(reason = "REJECTED") {
        this.status = "REJECTED";
        this.reason = reason;
    }

}

module.exports = OrderNode;