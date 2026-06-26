const PriceLevel = require("../core/PriceLevel");
const OrderNode = require("../core/OrderNode");
const RedBlackTree = require("../datastructures/RedBlackTree");
const Trade = require("./Trade");
const crypto = require("crypto");

class OrderBook {

    constructor(symbol) {

        this.symbol = symbol;

        this.buyTree = new RedBlackTree();

        this.sellTree = new RedBlackTree();

        this.orderIndex = new Map();

        this.tradeHistory = [];
    }

    processOrder(orderData) {

        const order = new OrderNode(orderData);

        this.insertOrder(order);

        return {
            trades: [],
            remainingOrder: order
        };
    }

    addOrder(orderData) {
        return this.processOrder(orderData);
    }

    executeEligibleOrders(currentPrice) {

        const trades = [];

        trades.push(
            ...this.executeEligibleBuyOrders(currentPrice)
        );

        trades.push(
            ...this.executeEligibleSellOrders(currentPrice)
        );

        return trades;
    }

    executeEligibleBuyOrders(currentPrice) {

        const trades = [];

        while (true) {

            const bestBuyLevel = this.bestBid();

            if (
                !bestBuyLevel ||
                bestBuyLevel.price < currentPrice
            ) {
                break;
            }

            trades.push(
                ...this.executePriceLevel(
                    bestBuyLevel,
                    currentPrice
                )
            );
        }

        return trades;
    }

    executeEligibleSellOrders(currentPrice) {

        const trades = [];

        while (true) {

            const bestSellLevel = this.bestAsk();

            if (
                !bestSellLevel ||
                bestSellLevel.price > currentPrice
            ) {
                break;
            }

            trades.push(
                ...this.executePriceLevel(
                    bestSellLevel,
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

    matchBuyOrder(order) {

        const trades = [];

        while (order.remainingQuantity > 0) {

            const bestAsk = this.bestAsk();

            if (!bestAsk) {
                break;
            }

            // Best ask is too expensive
            if (bestAsk.price > order.limitPrice) {
                break;
            }

            const sellOrder = bestAsk.peek();

            const trade = this.executeTrade(
                order,
                sellOrder
            );

            trades.push(trade);

            if (sellOrder.isFilled()) {
                this.removeOrder(sellOrder);
            }

        }

        if (!order.isFilled()) {
            this.insertOrder(order);
        }

        return {
            trades,
            remainingOrder: order.isFilled() ? null : order
        };
    }

    matchSellOrder(order) {

        const trades = [];

        while (order.remainingQuantity > 0) {

            const bestBid = this.bestBid();

            if (!bestBid) {
                break;
            }

            // Bid too low
            if (bestBid.price < order.limitPrice) {
                break;
            }

            const buyOrder = bestBid.peek();

            const trade = this.executeTrade(
                buyOrder,
                order
            );

            trades.push(trade);

            if (buyOrder.isFilled()) {
                this.removeOrder(buyOrder);
            }

        }

        if (!order.isFilled()) {
            this.insertOrder(order);
        }

        return {
            trades,
            remainingOrder: order.isFilled() ? null : order
        };
    }

    insertOrder(order) {

        const tree =
            order.side === "BUY"
                ? this.buyTree
                : this.sellTree;

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
            return;
        }

        const tree =
            order.side === "BUY"
                ? this.buyTree
                : this.sellTree;

        level.removeOrder(order);

        this.orderIndex.delete(order.id);

        if (level.isEmpty()) {
            tree.delete(level.treeNode);
        }
    }

    cancelOrder(orderId) {

        const order =
            this.orderIndex.get(orderId);

        if (!order) {
            return false;
        }

        this.removeOrder(order);

        order.cancel();

        return true;
    }

    executeTrade(buyOrder, sellOrder) {

        const tradeQuantity = Math.min(
            buyOrder.remainingQuantity,
            sellOrder.remainingQuantity
        );

        // Price-Time Priority
        // Trade happens at resting order's price
        const tradePrice = sellOrder.limitPrice;

        buyOrder.fill(tradeQuantity);
        sellOrder.fill(tradeQuantity);

        buyOrder.priceLevel.totalQuantity -= tradeQuantity;
        sellOrder.priceLevel.totalQuantity -= tradeQuantity;

        const trade = new Trade({
            id: crypto.randomUUID(),
            symbol: buyOrder.symbol,
            buyOrderId: buyOrder.id,
            sellOrderId: sellOrder.id,
            buyerId: buyOrder.userId,
            sellerId: sellOrder.userId,
            quantity: tradeQuantity,
            price: tradePrice,
            timestamp: Date.now()
        });

        this.tradeHistory.push(trade);

        return trade;
    }

    createMarketTrade(order, currentPrice, quantity) {

        return new Trade({
            tradeId: crypto.randomUUID(),
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

    bestBid() {

        const node =
            this.buyTree.maximum();

        return node
            ? node.priceLevel
            : null;
    }

    bestAsk() {

        const node =
            this.sellTree.minimum();

        return node
            ? node.priceLevel
            : null;
    }

    orderCount() {

        return this.orderIndex.size;

    }

}

module.exports = OrderBook;
