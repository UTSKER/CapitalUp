class ContextBuilder {
    build(result) {
        switch (result.type) {
            case "RAG":
                return this.buildRAG(result);

            case "KYC":
                return this.buildKYC(result);

            case "PORTFOLIO":
                return this.buildPortfolio(result);

            case "MARKET":
                return this.buildMarket(result);

            case "TICKET":
                return this.buildTicket(result);

            default:
                return "";
        }
    }

    buildRAG(result) {
        if (!result.data.documents.length) {
            return "No relevant documentation found.";
        }

        return result.data.documents
            .map(
                (doc) => `
Source: ${doc.fileName}

${doc.text}
`
            )
            .join("\n-----------------------------\n");
    }

    buildKYC(result) {
        const kyc = result.data;

        if (!kyc.exists) {
            return `
The user has not started KYC verification yet.
`;
        }

        return `
Live User KYC Information

Status: ${kyc.status}

Remarks: ${kyc.remarks || "No remarks"}

PAN Name: ${kyc.panFullName}

Bank: ${kyc.bankName}

Account Holder: ${kyc.accountHolder}
`;
    }

    buildPortfolio(result) {
        const portfolio = result.data;
        const summary = portfolio.summary;
        const holdings = portfolio.holdings || [];

        let context = `Live User Portfolio Information:\n`;
        context += `- Total Invested: ₹${summary.total_invested.toLocaleString('en-IN')}\n`;
        context += `- Current Value: ₹${summary.current_value.toLocaleString('en-IN')}\n`;
        context += `- Total Profit/Loss: ₹${summary.total_profit_loss.toLocaleString('en-IN')} (${summary.total_profit_loss_percentage}%)\n`;
        context += `- Available Cash Balance: ₹${summary.balance.toLocaleString('en-IN')}\n\n`;

        if (holdings.length === 0) {
            context += `The user currently does not hold any stock positions.`;
        } else {
            context += `Holdings:\n`;
            holdings.forEach(h => {
                context += `- ${h.symbol}: Quantity: ${h.quantity}, Avg Buy Price: ₹${h.average_buy_price}, Current Price: ₹${h.current_price}, Invested: ₹${h.invested_value}, Current Value: ₹${h.current_value}, PnL: ₹${h.profit_loss} (${h.profit_loss_percentage}%)\n`;
            });
        }
        return context;
    }

    buildMarket(result) {
        const data = result.data;
        const statusText = data.isMarketOpen 
            ? "OPEN (Live trading is active; prices are dynamically updating)" 
            : "CLOSED (Currently outside trading hours. Indian stock markets are open Mon-Fri 9:15 AM - 3:30 PM IST. The prices below represent the last trading day's closing prices)";
        
        let context = `Current Indian Stock Market Status: ${statusText}\n\n`;

        if (data.single) {
            const s = data.stock;
            const updatedDate = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString('en-IN', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
            }) : "N/A";
            context += `Live Market Stock Quote for ${s.symbol}:
- Company: ${s.companyName || s.company_name}
- Current Last Price: ₹${s.lastPrice}
- Previous Close: ₹${s.previousClose}
- Daily High: ₹${s.high}
- Daily Low: ₹${s.low}
- Price Last Updated (IST): ${updatedDate}`;
            return context;
        } else {
            context += `Live Market Stock Prices:\n`;
            data.stocks.forEach(s => {
                const updatedDate = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
                }) : "N/A";
                context += `- ${s.symbol} (${s.companyName}): Price: ₹${s.lastPrice}, Prev Close: ₹${s.previousClose}, High: ₹${s.high}, Low: ₹${s.low} (Last Updated IST: ${updatedDate})\n`;
            });
            return context;
        }
    }

    buildTicket(result) {
        return `Support Tickets Status:
- Status: ${result.data.active ? "Active" : "Inactive (Work in Progress)"}
- Note: ${result.data.message}`;
    }
}

module.exports = new ContextBuilder();