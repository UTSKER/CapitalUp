const PriceLevel = require("../core/PriceLevel");
const OrderNode = require("../core/OrderNode");
const RedBlackTree = require("../datastructures/RedBlackTree");
const Trade = require("./Trade");
const crypto = require("crypto");

// Stop orders trigger with the OPPOSITE price comparison of limit orders:
// BUY STOP fires when currentPrice >= stopPrice (breakout entry),
// SELL STOP fires when currentPrice <= stopPrice (stop-loss).
// Both execute at the current market price.
class StopOrderBook {

    constructor(symbol) {

        this.symbol = symbol;

        this.buyStopTree = new RedBlackTree();

        this.sellStopTree = new RedBlackTree();

        this.orderIndex = new Map();

        this.tradeHistory = [];
    }

    toPriceTicks(price) {
        return Math.round(Number(price) * 100);
    }

    processOrder(orderData, sequence = 0) {

        if (orderData.id && this.orderIndex.has(orderData.id)) {
            const existing = this.orderIndex.get(orderData.id);
            return {
                trades: [],
                remainingOrder: existing,
                duplicate: true,
                status: existing.status,
            };
        }

        // OrderNode and PriceLevel key on limitPrice; the stop price is
        // stored there so the shared tree structures work unchanged.
        const order = new OrderNode({
            ...orderData,
            limitPrice: orderData.stopPrice,
            sequence: sequence || orderData.sequence || 0,
        });

        order.stopPrice = orderData.stopPrice;

        this.insertOrder(order);

        return {
            trades: [],
            remainingOrder: order,
            status: "PENDING"
        };
    }

    addOrder(orderData, sequence = 0) {
        return this.processOrder(orderData, sequence);
    }

    triggerEligibleOrders(currentPrice) {

        const trades = [];

        trades.push(
            ...this.triggerEligibleBuyStops(currentPrice)
        );

        trades.push(
            ...this.triggerEligibleSellStops(currentPrice)
        );

        return trades;
    }

    triggerEligibleBuyStops(currentPrice) {

        const trades = [];
        const currentTicks = this.toPriceTicks(currentPrice);

        // eslint-disable-next-line no-constant-condition
        while (true) {

            const lowestBuyStopLevel = this.lowestBuyStop();

            if (
                !lowestBuyStopLevel ||
                this.toPriceTicks(lowestBuyStopLevel.price) > currentTicks
            ) {
                break;
            }

            if (lowestBuyStopLevel.isEmpty()) {
                this.buyStopTree.delete(lowestBuyStopLevel.treeNode || lowestBuyStopLevel.price);
                if (this.lowestBuyStop() === lowestBuyStopLevel) {
                    this.buyStopTree.delete(lowestBuyStopLevel.price);
                    if (this.lowestBuyStop() === lowestBuyStopLevel) break;
                }
                continue;
            }

            trades.push(
                ...this.executePriceLevel(
                    lowestBuyStopLevel,
                    currentPrice
                )
            );
        }

        return trades;
    }

    triggerEligibleSellStops(currentPrice) {

        const trades = [];
        const currentTicks = this.toPriceTicks(currentPrice);

        // eslint-disable-next-line no-constant-condition
        while (true) {

            const highestSellStopLevel = this.highestSellStop();

            if (
                !highestSellStopLevel ||
                this.toPriceTicks(highestSellStopLevel.price) < currentTicks
            ) {
                break;
            }

            if (highestSellStopLevel.isEmpty()) {
                this.sellStopTree.delete(highestSellStopLevel.treeNode || highestSellStopLevel.price);
                if (this.highestSellStop() === highestSellStopLevel) {
                    this.sellStopTree.delete(highestSellStopLevel.price);
                    if (this.highestSellStop() === highestSellStopLevel) break;
                }
                continue;
            }

            trades.push(
                ...this.executePriceLevel(
                    highestSellStopLevel,
                    currentPrice
                )
            );
        }

        return trades;
    }

    executePriceLevel(priceLevel, currentPrice) {

        const trades = [];

        while (!priceLevel.isEmpty()) {

            const order = priceLevel.peek();
            const quantity = order.remainingQuantity;

            priceLevel.reduceQuantity(
                order,
                quantity
            );

            const trade =
                this.createMarketTrade(
                    order,
                    currentPrice,
                    quantity
                );

            trades.push(trade);
            this.tradeHistory.push(trade);

            this.removeOrder(order);
        }

        return trades;
    }

    insertOrder(order) {

        const tree =
            order.side === "BUY"
                ? this.buyStopTree
                : this.sellStopTree;

        let priceNode =
            tree.find(order.limitPrice);

        if (!priceNode) {

            const level =
                new PriceLevel(order.limitPrice);

            priceNode =
                tree.insert(level);

        }

        priceNode.priceLevel.addOrder(order);

        this.orderIndex.set(
            order.id,
            order
        );

        return order;
    }

    removeOrder(order) {

        const level = order.priceLevel;

        if (!level) {
            this.orderIndex.delete(order.id);
            return;
        }

        const tree =
            order.side === "BUY"
                ? this.buyStopTree
                : this.sellStopTree;

        level.removeOrder(order);

        this.orderIndex.delete(order.id);

        if (level.isEmpty() && level.treeNode) {
            tree.delete(level.treeNode);
        }
    }

    cancelOrder(orderId) {

        const order =
            this.orderIndex.get(orderId);

        if (!order) {
            return false;
        }

        if (order.status === "FILLED" || order.remainingQuantity === 0) {
            return false;
        }

        if (order.status === "CANCELLED") {
            return false;
        }

        this.removeOrder(order);

        order.cancel("USER_CANCELLED");

        return true;
    }

    createMarketTrade(order, currentPrice, quantity) {

        return new Trade({
            tradeId: `tr_stop_${order.symbol}_${Date.now()}_${order.id}`,
            orderId: order.id,
            userId: order.userId,
            symbol: order.symbol,
            executedPrice: currentPrice,
            executedQuantity: quantity,
            timestamp: Date.now()
        });
    }

    getOrder(orderId) {

        return this.orderIndex.get(orderId);

    }

    lowestBuyStop() {

        const node =
            this.buyStopTree.minimum();

        return node
            ? node.priceLevel
            : null;
    }

    highestSellStop() {

        const node =
            this.sellStopTree.maximum();

        return node
            ? node.priceLevel
            : null;
    }

    orderCount() {

        return this.orderIndex.size;

    }

}

module.exports = StopOrderBook;
