const OrderBookManager =
require("../core/OrderBookManager");

const StopOrderBook =
require("../core/StopOrderBook");

class MatchingEngine {

    constructor() {

        this.bookManager =
            new OrderBookManager();

        this.orderBooks =
            this.bookManager.books;

        this.stopBooks = new Map();
        this.latencies = [];

    }

    recordLatency(startedAt) {
        this.latencies.push(Date.now() - startedAt);
        if (this.latencies.length > 1000) this.latencies.shift();
    }

    placeOrder(order) {
        const startedAt = Date.now();

        const book =
            this.getOrCreateOrderBook(order.symbol);

        const result = book.processOrder(order);
        this.recordLatency(startedAt);
        return result;

    }

    cancelOrder(symbol, orderId) {

        const book =
            this.orderBooks.get(symbol);

        if (!book) {
            return false;
        }

        return book.cancelOrder(orderId);

    }

    getOrder(symbol, orderId) {

        const book =
            this.orderBooks.get(symbol);

        if (!book) {
            return null;
        }

        return book.getOrder(orderId) || null;
    }

    processMarketPrice(symbol, currentPrice) {
        const startedAt = Date.now();

        const book =
            this.orderBooks.get(symbol);

        if (!book) {
            return [];
        }

        const result = book.executeEligibleOrders(currentPrice);
        this.recordLatency(startedAt);
        return result;
    }

    getOrCreateOrderBook(symbol) {

        return this.bookManager.getBook(symbol);
    }

    placeStopOrder(order) {
        const startedAt = Date.now();

        const book =
            this.getOrCreateStopOrderBook(order.symbol);

        const result = book.processOrder(order);
        this.recordLatency(startedAt);
        return result;

    }

    cancelStopOrder(symbol, orderId) {

        const book =
            this.stopBooks.get(symbol);

        if (!book) {
            return false;
        }

        return book.cancelOrder(orderId);

    }

    getStopOrder(symbol, orderId) {

        const book =
            this.stopBooks.get(symbol);

        if (!book) {
            return null;
        }

        return book.getOrder(orderId) || null;
    }

    processMarketPriceForStops(symbol, currentPrice) {
        const startedAt = Date.now();

        const book =
            this.stopBooks.get(symbol);

        if (!book) {
            return [];
        }

        const result = book.triggerEligibleOrders(currentPrice);
        this.recordLatency(startedAt);
        return result;
    }

    getOrCreateStopOrderBook(symbol) {

        if (!this.stopBooks.has(symbol)) {
            this.stopBooks.set(
                symbol,
                new StopOrderBook(symbol)
            );
        }

        return this.stopBooks.get(symbol);
    }

    getOrderBookSnapshot(symbol, depth = 10) {
        const book = this.orderBooks.get(symbol);
        if (!book) {
            return { symbol, bids: [], asks: [], orderCount: 0 };
        }

        const collect = (node, descending, levels) => {
            if (!node || levels.length >= depth) return;
            const first = descending ? node.right : node.left;
            const second = descending ? node.left : node.right;
            collect(first, descending, levels);
            if (levels.length < depth) {
                const orders = [];
                let current = node.priceLevel.orders.head;
                while (current) {
                    orders.push({
                        id: current.id,
                        userId: current.userId,
                        quantity: current.quantity,
                        remainingQuantity: current.remainingQuantity,
                        createdAt: current.createdAt,
                    });
                    current = current.next;
                }
                levels.push({
                    price: node.priceLevel.price,
                    totalQuantity: node.priceLevel.totalQuantity,
                    orderCount: node.priceLevel.size(),
                    fifo: orders,
                });
            }
            collect(second, descending, levels);
        };

        const bids = [];
        const asks = [];
        collect(book.buyTree.root, true, bids);
        collect(book.sellTree.root, false, asks);
        return { symbol, bids, asks, orderCount: book.orderCount() };
    }

    getMetrics() {
        const percentile = (fraction) => {
            if (!this.latencies.length) return null;
            const values = [...this.latencies].sort((a, b) => a - b);
            return values[Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)];
        };
        let pendingOrders = 0;
        for (const book of this.orderBooks.values()) pendingOrders += book.orderCount();
        for (const book of this.stopBooks.values()) pendingOrders += book.orderCount();
        return {
            orderBooks: this.orderBooks.size,
            pendingOrders,
            p95LatencyMs: percentile(0.95),
            p99LatencyMs: percentile(0.99),
        };
    }

}

module.exports = MatchingEngine;
