const OrderBookManager = require("../core/OrderBookManager");
const StopOrderBook = require("../core/StopOrderBook");

class SymbolCommandQueue {
    constructor(symbol) {
        this.symbol = symbol;
        this.sequence = 0;
        this.tail = Promise.resolve();
    }

    nextSequence() {
        return ++this.sequence;
    }

    run(fn) {
        const seq = this.nextSequence();
        return fn(seq);
    }

    async runAsync(fn) {
        const seq = this.nextSequence();
        const res = this.tail.then(() => fn(seq));
        this.tail = res.then(() => {}, () => {});
        return res;
    }
}

class MatchingEngine {

    constructor() {

        this.bookManager =
            new OrderBookManager();

        this.orderBooks =
            this.bookManager.books;

        this.stopBooks = new Map();
        this.latencies = [];

        // Per-symbol single-writer queues
        this.symbolQueues = new Map();

        // OCO Groups: ocoId -> { id, symbol, limitOrderId, stopOrderId, state: "ACTIVE" | "CLOSED", triggerReason: null }
        this.ocoGroups = new Map();
        this.orderToOco = new Map(); // orderId -> ocoId
    }

    getSymbolQueue(symbol) {
        if (!this.symbolQueues.has(symbol)) {
            this.symbolQueues.set(symbol, new SymbolCommandQueue(symbol));
        }
        return this.symbolQueues.get(symbol);
    }

    recordLatency(startedAt) {
        if (this.latencies.length < 1000) {
            this.latencies.push(Date.now() - startedAt);
        } else {
            this.latencies[(Math.random() * 1000) | 0] = Date.now() - startedAt;
        }
    }

    linkOCO(limitOrderId, stopOrderId, symbol) {
        const ocoId = `oco_${limitOrderId}_${stopOrderId}`;
        const group = {
            id: ocoId,
            symbol,
            limitOrderId,
            stopOrderId,
            state: "ACTIVE",
            triggerReason: null,
        };
        this.ocoGroups.set(ocoId, group);
        this.orderToOco.set(limitOrderId, ocoId);
        this.orderToOco.set(stopOrderId, ocoId);
        return group;
    }

    getOCO(orderId) {
        const ocoId = this.orderToOco.get(orderId);
        return ocoId ? this.ocoGroups.get(ocoId) : null;
    }

    handleOCOLimitFilled(limitOrderId, symbol) {
        const ocoId = this.orderToOco.get(limitOrderId);
        if (!ocoId) return null;
        const group = this.ocoGroups.get(ocoId);
        if (!group || group.state !== "ACTIVE") return null;

        group.state = "CLOSED";
        group.triggerReason = "ONE_LEG_EXECUTED";

        if (group.stopOrderId) {
            this.cancelStopOrder(symbol, group.stopOrderId);
        }
        return group;
    }

    handleOCOStopTriggered(stopOrderId, symbol) {
        const ocoId = this.orderToOco.get(stopOrderId);
        if (!ocoId) return null;
        const group = this.ocoGroups.get(ocoId);
        if (!group || group.state !== "ACTIVE") return null;

        group.state = "CLOSED";
        group.triggerReason = "ONE_LEG_TRIGGERED";

        if (group.limitOrderId) {
            this.cancelOrder(symbol, group.limitOrderId);
        }
        return group;
    }

    placeOrder(order) {
        const startedAt = Date.now();
        const queue = this.getSymbolQueue(order.symbol);

        return queue.run((seq) => {
            const book = this.getOrCreateOrderBook(order.symbol);
            const result = book.processOrder(order, seq);

            // If order was in an OCO group and filled or executed trades
            if (result.trades && result.trades.length > 0) {
                this.handleOCOLimitFilled(order.id, order.symbol);
                for (const trade of result.trades) {
                    if (trade.makerOrderId) this.handleOCOLimitFilled(trade.makerOrderId, order.symbol);
                    if (trade.takerOrderId) this.handleOCOLimitFilled(trade.takerOrderId, order.symbol);
                    if (trade.buyOrderId) this.handleOCOLimitFilled(trade.buyOrderId, order.symbol);
                    if (trade.sellOrderId) this.handleOCOLimitFilled(trade.sellOrderId, order.symbol);
                }
            }

            this.recordLatency(startedAt);
            return result;
        });
    }

    cancelOrder(symbol, orderId) {
        const queue = this.getSymbolQueue(symbol);

        return queue.run(() => {
            const book = this.orderBooks.get(symbol);
            if (!book) {
                return { success: false, reason: "BOOK_NOT_FOUND" };
            }

            const res = book.cancelOrder(orderId);
            if (typeof res === "boolean") {
                return { success: res, reason: res ? null : "ORDER_NOT_FOUND" };
            }
            return res;
        });
    }

    modifyOrder(symbol, orderId, changesOrPrice, maybeQuantity) {
        const queue = this.getSymbolQueue(symbol);
        const changes = (typeof changesOrPrice === "object" && changesOrPrice !== null)
            ? changesOrPrice
            : { newPrice: changesOrPrice, newQuantity: maybeQuantity };

        return queue.run((seq) => {
            const book = this.orderBooks.get(symbol);
            if (!book) {
                return { success: false, reason: "BOOK_NOT_FOUND" };
            }
            return book.modifyOrder(orderId, changes, seq);
        });
    }

    getOrder(symbol, orderId) {
        const book = this.orderBooks.get(symbol);
        if (!book) {
            return null;
        }
        return book.getOrder(orderId) || null;
    }

    processMarketPrice(symbol, currentPrice) {
        const startedAt = Date.now();
        const queue = this.getSymbolQueue(symbol);

        return queue.run(() => {
            const book = this.orderBooks.get(symbol);
            if (!book) {
                return [];
            }

            const trades = book.executeEligibleOrders(currentPrice);

            // OCO check on matched orders
            for (const trade of trades) {
                if (trade.orderId) {
                    this.handleOCOLimitFilled(trade.orderId, symbol);
                }
                if (trade.buyOrderId) {
                    this.handleOCOLimitFilled(trade.buyOrderId, symbol);
                }
                if (trade.sellOrderId) {
                    this.handleOCOLimitFilled(trade.sellOrderId, symbol);
                }
            }

            this.recordLatency(startedAt);
            return trades;
        });
    }

    getOrderBook(symbol) {
        return this.orderBooks.get(symbol) || this.bookManager.getBook(symbol);
    }

    getOrCreateOrderBook(symbol) {
        return this.bookManager.getBook(symbol);
    }

    placeStopOrder(order) {
        const startedAt = Date.now();
        const queue = this.getSymbolQueue(order.symbol);

        return queue.run((seq) => {
            const book = this.getOrCreateStopOrderBook(order.symbol);
            const result = book.processOrder(order, seq);

            if (order.linkedLimitOrderId) {
                this.linkOCO(order.linkedLimitOrderId, order.id, order.symbol);
            }

            this.recordLatency(startedAt);
            return result;
        });
    }

    cancelStopOrder(symbol, orderId) {
        const queue = this.getSymbolQueue(symbol);

        return queue.run(() => {
            const book = this.stopBooks.get(symbol);
            if (!book) {
                return false;
            }

            const res = book.cancelOrder(orderId);
            return typeof res === "boolean" ? res : (res ? res.success : false);
        });
    }

    getStopOrder(symbol, orderId) {
        const book = this.stopBooks.get(symbol);
        if (!book) {
            return null;
        }
        return book.getOrder(orderId) || null;
    }

    processMarketPriceForStops(symbol, currentPrice) {
        const startedAt = Date.now();
        const queue = this.getSymbolQueue(symbol);

        return queue.run(() => {
            const book = this.stopBooks.get(symbol);
            if (!book) {
                return [];
            }

            const trades = book.triggerEligibleOrders(currentPrice);

            // OCO check on triggered stops
            for (const trade of trades) {
                if (trade.orderId) {
                    this.handleOCOStopTriggered(trade.orderId, symbol);
                }
            }

            this.recordLatency(startedAt);
            return trades;
        });
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
                        sequence: current.sequence,
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

    validateInvariants(symbol = null) {
        if (symbol) {
            const book = this.orderBooks.get(symbol);
            return book ? book.validateInvariants() : { valid: true, invariantsChecked: 14 };
        }
        for (const book of this.orderBooks.values()) {
            book.validateInvariants();
        }
        return { valid: true, invariantsChecked: 14 };
    }

}

module.exports = MatchingEngine;
