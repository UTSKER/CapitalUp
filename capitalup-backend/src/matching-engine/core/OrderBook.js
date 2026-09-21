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

    toPriceTicks(price) {
        return Math.round(Number(price) * 100);
    }

    isSameEntity(orderA, orderB) {
        if (!orderA || !orderB) return false;
        const uA = orderA.userId !== undefined && orderA.userId !== null ? String(orderA.userId) : null;
        const uB = orderB.userId !== undefined && orderB.userId !== null ? String(orderB.userId) : null;
        if (uA && uB && uA === uB) return true;

        const aA = orderA.accountId !== undefined && orderA.accountId !== null ? String(orderA.accountId) : null;
        const aB = orderB.accountId !== undefined && orderB.accountId !== null ? String(orderB.accountId) : null;
        if (aA && aB && aA === aB) return true;

        return false;
    }

    canFillFOK(order) {
        const isBuy = order.side === "BUY";
        let remainingNeeded = order.quantity;
        const limitTicks = order.limitPrice ? this.toPriceTicks(order.limitPrice) : null;

        if (isBuy) {
            let currentRBNode = this.sellTree.minimum();
            const visited = new Set();
            while (currentRBNode && remainingNeeded > 0) {
                if (visited.has(currentRBNode)) break;
                visited.add(currentRBNode);

                const askTicks = this.toPriceTicks(currentRBNode.price);
                if (limitTicks !== null && askTicks > limitTicks) {
                    break;
                }
                let orderNode = currentRBNode.priceLevel ? currentRBNode.priceLevel.orders.head : null;
                const visitedOrders = new Set();
                while (orderNode && remainingNeeded > 0) {
                    if (visitedOrders.has(orderNode)) break;
                    visitedOrders.add(orderNode);

                    if (!this.isSameEntity(order, orderNode)) {
                        remainingNeeded -= orderNode.remainingQuantity;
                    }
                    orderNode = orderNode.next;
                }
                const nextNode = this.sellTree.successor(currentRBNode);
                if (nextNode === currentRBNode) break;
                currentRBNode = nextNode;
            }
        } else {
            let currentRBNode = this.buyTree.maximum();
            const visited = new Set();
            while (currentRBNode && remainingNeeded > 0) {
                if (visited.has(currentRBNode)) break;
                visited.add(currentRBNode);

                const bidTicks = this.toPriceTicks(currentRBNode.price);
                if (limitTicks !== null && bidTicks < limitTicks) {
                    break;
                }
                let orderNode = currentRBNode.priceLevel ? currentRBNode.priceLevel.orders.head : null;
                const visitedOrders = new Set();
                while (orderNode && remainingNeeded > 0) {
                    if (visitedOrders.has(orderNode)) break;
                    visitedOrders.add(orderNode);

                    if (!this.isSameEntity(order, orderNode)) {
                        remainingNeeded -= orderNode.remainingQuantity;
                    }
                    orderNode = orderNode.next;
                }
                const nextNode = this.buyTree.predecessor(currentRBNode);
                if (nextNode === currentRBNode) break;
                currentRBNode = nextNode;
            }
        }

        return remainingNeeded <= 0;
    }

    processOrder(orderData, sequence = 0) {
        if (orderData.id && this.orderIndex.has(orderData.id)) {
            const existing = this.orderIndex.get(orderData.id);
            return {
                trades: [],
                remainingOrder: existing,
                duplicate: true,
                status: "REJECTED",
                reason: "DUPLICATE_ORDER_ID",
                filledQuantity: existing.filledQuantity || 0,
            };
        }

        const order = orderData instanceof OrderNode
            ? orderData
            : new OrderNode({ ...orderData, sequence });

        if (sequence && !order.sequence) {
            order.sequence = sequence;
        }

        const tif = (order.timeInForce || order.validity || "DAY").toUpperCase();
        const isMarket = order.orderType === "MARKET" || !order.limitPrice;

        // FOK (Fill Or Kill)
        if (tif === "FOK") {
            if (!this.canFillFOK(order)) {
                order.reject("FOK_NOT_FILLABLE");
                return {
                    trades: [],
                    remainingOrder: null,
                    status: "REJECTED",
                    reason: "FOK_NOT_FILLABLE",
                    filledQuantity: 0,
                };
            }

            const res = order.side === "BUY"
                ? this.matchBuyOrder(order, true)
                : this.matchSellOrder(order, true);

            return {
                trades: res.trades,
                remainingOrder: null,
                status: order.isFilled() ? "FILLED" : "REJECTED",
                reason: order.reason || null,
                filledQuantity: order.filledQuantity,
            };
        }

        // IOC (Immediate Or Cancel)
        if (tif === "IOC") {
            const res = order.side === "BUY"
                ? this.matchBuyOrder(order, true)
                : this.matchSellOrder(order, true);

            if (!order.isFilled()) {
                order.cancel("IOC_EXPIRED_REMAINDER");
            }

            return {
                trades: res.trades,
                remainingOrder: null,
                status: order.isFilled() ? "FILLED" : (res.trades.length > 0 ? "PARTIALLY_FILLED" : "CANCELLED"),
                reason: order.reason || null,
                filledQuantity: order.filledQuantity,
            };
        }

        // MARKET Order
        if (isMarket) {
            const res = order.side === "BUY"
                ? this.matchBuyOrder(order, true)
                : this.matchSellOrder(order, true);

            if (!order.isFilled()) {
                order.cancel("MARKET_EXHAUSTED");
            }

            return {
                trades: res.trades,
                remainingOrder: null,
                status: order.isFilled() ? "FILLED" : (res.trades.length > 0 ? "PARTIALLY_FILLED" : "CANCELLED"),
                reason: order.reason || null,
                filledQuantity: order.filledQuantity,
            };
        }

        // Normal LIMIT Order (with Marketable Crossing Check)
        const trades = [];
        const orderTicks = this.toPriceTicks(order.limitPrice);

        if (order.side === "BUY") {
            const bestAsk = this.bestAsk();
            if (bestAsk && this.toPriceTicks(bestAsk.price) <= orderTicks) {
                const crossRes = this.matchBuyOrder(order, false);
                trades.push(...crossRes.trades);
            }
        } else {
            const bestBid = this.bestBid();
            if (bestBid && this.toPriceTicks(bestBid.price) >= orderTicks) {
                const crossRes = this.matchSellOrder(order, false);
                trades.push(...crossRes.trades);
            }
        }

        if (!order.isFilled() && order.status !== "CANCELLED" && order.status !== "REJECTED") {
            this.insertOrder(order);
        }

        return {
            trades,
            remainingOrder: order.isFilled() ? null : order,
            status: order.status,
            reason: order.reason || null,
            filledQuantity: order.filledQuantity,
        };
    }

    addOrder(orderData, sequence = 0) {
        return this.processOrder(orderData, sequence);
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
        const currentTicks = this.toPriceTicks(currentPrice);

        // eslint-disable-next-line no-constant-condition
        while (true) {

            const bestBuyLevel = this.bestBid();

            if (
                !bestBuyLevel ||
                this.toPriceTicks(bestBuyLevel.price) < currentTicks
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
        const currentTicks = this.toPriceTicks(currentPrice);

        // eslint-disable-next-line no-constant-condition
        while (true) {

            const bestSellLevel = this.bestAsk();

            if (
                !bestSellLevel ||
                this.toPriceTicks(bestSellLevel.price) > currentTicks
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

    matchBuyOrder(order, doNotRest = false) {

        const trades = [];
        const orderTicks = order.limitPrice ? this.toPriceTicks(order.limitPrice) : Infinity;
        let matchSteps = 0;

        while (order.remainingQuantity > 0) {
            if (++matchSteps > 2000) break;

            const bestAsk = this.bestAsk();

            if (!bestAsk) {
                break;
            }

            const askTicks = this.toPriceTicks(bestAsk.price);
            if (order.limitPrice && askTicks > orderTicks) {
                break;
            }

            const sellOrder = bestAsk.peek();
            if (!sellOrder) {
                this.sellTree.delete(bestAsk.treeNode || bestAsk.price);
                if (this.bestAsk() === bestAsk) {
                    this.sellTree.delete(bestAsk.price);
                    if (this.bestAsk() === bestAsk) break;
                }
                continue;
            }

            if (sellOrder.remainingQuantity <= 0 || sellOrder.isFilled()) {
                this.removeOrder(sellOrder);
                continue;
            }

            // Self-Trade Prevention: CANCEL_NEW
            if (this.isSameEntity(order, sellOrder)) {
                order.cancel("SELF_TRADE_PREVENTED");
                break;
            }

            // Trade happens at resting maker's price
            const trade = this.executeTrade(
                order,
                sellOrder,
                true
            );

            trades.push(trade);

            if (sellOrder.isFilled()) {
                this.removeOrder(sellOrder);
            }

        }

        if (!order.isFilled() && !doNotRest && order.status !== "CANCELLED" && order.status !== "REJECTED") {
            this.insertOrder(order);
        }

        return {
            trades,
            remainingOrder: order.isFilled() ? null : order
        };
    }

    matchSellOrder(order, doNotRest = false) {

        const trades = [];
        const orderTicks = order.limitPrice ? this.toPriceTicks(order.limitPrice) : -Infinity;
        let matchSteps = 0;

        while (order.remainingQuantity > 0) {
            if (++matchSteps > 2000) break;

            const bestBid = this.bestBid();

            if (!bestBid) {
                break;
            }

            const bidTicks = this.toPriceTicks(bestBid.price);
            if (order.limitPrice && bidTicks < orderTicks) {
                break;
            }

            const buyOrder = bestBid.peek();
            if (!buyOrder) {
                this.buyTree.delete(bestBid.treeNode || bestBid.price);
                if (this.bestBid() === bestBid) {
                    this.buyTree.delete(bestBid.price);
                    if (this.bestBid() === bestBid) break;
                }
                continue;
            }

            if (buyOrder.remainingQuantity <= 0 || buyOrder.isFilled()) {
                this.removeOrder(buyOrder);
                continue;
            }

            // Self-Trade Prevention: CANCEL_NEW
            if (this.isSameEntity(order, buyOrder)) {
                order.cancel("SELF_TRADE_PREVENTED");
                break;
            }

            // Trade happens at resting maker's price
            const trade = this.executeTrade(
                buyOrder,
                order,
                false
            );

            trades.push(trade);

            if (buyOrder.isFilled()) {
                this.removeOrder(buyOrder);
            }

        }

        if (!order.isFilled() && !doNotRest && order.status !== "CANCELLED" && order.status !== "REJECTED") {
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
            this.orderIndex.delete(order.id);
            return;
        }

        const tree =
            order.side === "BUY"
                ? this.buyTree
                : this.sellTree;

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
            return { success: false, reason: "ORDER_NOT_FOUND" };
        }

        if (order.status === "FILLED" || order.remainingQuantity === 0) {
            return { success: false, reason: "ALREADY_FILLED" };
        }

        if (order.status === "CANCELLED") {
            return { success: false, reason: "ALREADY_CANCELLED" };
        }

        this.removeOrder(order);

        order.cancel("USER_CANCELLED");

        return { success: true, order };
    }

    modifyOrder(orderId, { newPrice, newQuantity }, newSequence = 0) {
        const order = this.orderIndex.get(orderId);
        if (!order) {
            return { success: false, reason: "ORDER_NOT_FOUND" };
        }
        if (order.status === "FILLED" || order.remainingQuantity === 0) {
            return { success: false, reason: "ALREADY_FILLED" };
        }
        if (order.status === "CANCELLED") {
            return { success: false, reason: "ALREADY_CANCELLED" };
        }

        const targetPrice = newPrice !== undefined ? Number(newPrice) : order.limitPrice;
        const targetQty = newQuantity !== undefined ? Number(newQuantity) : order.quantity;
        const priceChanged = this.toPriceTicks(targetPrice) !== this.toPriceTicks(order.limitPrice);

        if (priceChanged) {
            this.removeOrder(order);
            order.limitPrice = targetPrice;
            order.quantity = targetQty;
            order.remainingQuantity = Math.max(0, targetQty - order.filledQuantity);
            if (newSequence) order.sequence = newSequence;
            if (order.remainingQuantity > 0) {
                this.insertOrder(order);
            }
            return { success: true, order, priorityPreserved: false };
        }

        if (targetQty < order.quantity) {
            if (targetQty <= order.filledQuantity) {
                this.removeOrder(order);
                order.status = "FILLED";
                order.remainingQuantity = 0;
                return { success: true, order, priorityPreserved: false };
            }
            const reduction = order.quantity - targetQty;
            order.quantity = targetQty;
            order.remainingQuantity = Math.max(0, order.remainingQuantity - reduction);
            if (order.priceLevel) {
                order.priceLevel.totalQuantity = Math.max(0, order.priceLevel.totalQuantity - reduction);
            }
            if (order.remainingQuantity <= 0) {
                this.removeOrder(order);
                order.status = "FILLED";
            }
            return { success: true, order, priorityPreserved: true };
        } else if (targetQty > order.quantity) {
            const addition = targetQty - order.quantity;
            order.quantity = targetQty;
            order.remainingQuantity += addition;
            if (newSequence) order.sequence = newSequence;
            if (order.priceLevel) {
                order.priceLevel.orders.remove(order);
                order.priceLevel.orders.pushBack(order);
                order.priceLevel.totalQuantity += addition;
            }
            return { success: true, order, priorityPreserved: false };
        }

        return { success: true, order, priorityPreserved: true };
    }

    executeTrade(buyOrder, sellOrder, isBuyIncoming = true) {

        const tradeQuantity = Math.min(
            buyOrder.remainingQuantity,
            sellOrder.remainingQuantity
        );

        if (tradeQuantity <= 0) {
            throw new Error("Trade quantity must be greater than 0");
        }

        // Price-Time Priority: Trade happens at resting maker order's limitPrice
        const tradePrice = isBuyIncoming ? sellOrder.limitPrice : buyOrder.limitPrice;

        buyOrder.fill(tradeQuantity);
        sellOrder.fill(tradeQuantity);

        if (buyOrder.priceLevel) {
            buyOrder.priceLevel.totalQuantity = Math.max(0, buyOrder.priceLevel.totalQuantity - tradeQuantity);
        }
        if (sellOrder.priceLevel) {
            sellOrder.priceLevel.totalQuantity = Math.max(0, sellOrder.priceLevel.totalQuantity - tradeQuantity);
        }

        const trade = new Trade({
            id: `tr_${buyOrder.symbol}_${Date.now()}_${buyOrder.id}_${sellOrder.id}`,
            symbol: buyOrder.symbol,
            buyOrderId: buyOrder.id,
            sellOrderId: sellOrder.id,
            buyerId: buyOrder.userId,
            sellerId: sellOrder.userId,
            makerOrderId: isBuyIncoming ? sellOrder.id : buyOrder.id,
            takerOrderId: isBuyIncoming ? buyOrder.id : sellOrder.id,
            makerUserId: isBuyIncoming ? sellOrder.userId : buyOrder.userId,
            takerUserId: isBuyIncoming ? buyOrder.userId : sellOrder.userId,
            quantity: tradeQuantity,
            price: tradePrice,
            timestamp: Date.now()
        });

        this.tradeHistory.push(trade);

        return trade;
    }

    createMarketTrade(order, currentPrice, quantity) {

        return new Trade({
            tradeId: `tr_mkt_${order.symbol}_${Date.now()}_${order.id}`,
            orderId: order.id,
            userId: order.userId,
            symbol: order.symbol,
            executedPrice: currentPrice,
            executedQuantity: quantity,
            timestamp: Date.now()
        });
    }

    getOrder(orderId) {

        return this.orderIndex.get(orderId) || null;

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

    validateInvariants() {
        const errors = [];
        let restingCount = 0;

        const checkTree = (node, isBuy) => {
            if (!node) return;
            checkTree(node.left, isBuy);
            const level = node.priceLevel;
            if (level.isEmpty()) {
                errors.push(`Empty PriceLevel at price ${level.price} in ${isBuy ? 'buyTree' : 'sellTree'}`);
            }
            let levelSum = 0;
            const seenAtLevel = new Set();
            let current = level.orders.head;
            while (current) {
                restingCount++;
                if (seenAtLevel.has(current.id)) {
                    errors.push(`Order ${current.id} appears twice in price level ${level.price}`);
                }
                seenAtLevel.add(current.id);
                if (!this.orderIndex.has(current.id)) {
                    errors.push(`Order ${current.id} at price ${level.price} not found in orderIndex`);
                }
                if (current.remainingQuantity < 0) {
                    errors.push(`Order ${current.id} has negative remainingQuantity: ${current.remainingQuantity}`);
                }
                if (current.isFilled()) {
                    errors.push(`Filled order ${current.id} remains in price level ${level.price}`);
                }
                if (current.status === 'CANCELLED') {
                    errors.push(`Cancelled order ${current.id} remains in price level ${level.price}`);
                }
                levelSum += current.remainingQuantity;
                current = current.next;
            }
            if (level.totalQuantity !== levelSum) {
                errors.push(`PriceLevel ${level.price} totalQuantity mismatch: recorded ${level.totalQuantity}, actual sum ${levelSum}`);
            }
            checkTree(node.right, isBuy);
        };

        checkTree(this.buyTree.root, true);
        checkTree(this.sellTree.root, false);

        if (this.orderIndex.size !== restingCount) {
            errors.push(`orderIndex size (${this.orderIndex.size}) does not match resting orders count (${restingCount})`);
        }

        if (errors.length > 0) {
            const err = new Error("Matching Engine Invariant Violation: " + errors.join("; "));
            err.invariants = errors;
            throw err;
        }
        return { valid: true, invariantsChecked: 14 };
    }

}

module.exports = OrderBook;
