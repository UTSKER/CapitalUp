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
        return JSON.stringify(result.data, null, 2);
    }

    buildMarket(result) {
        return JSON.stringify(result.data, null, 2);
    }

    buildTicket(result) {
        return JSON.stringify(result.data, null, 2);
    }
}

module.exports = new ContextBuilder();