const pool = require(
  "../../config/postgre"
);

const stocks = [
  {
    symbol: "^NSEI",
    company_name: "NIFTY 50",
  },
  {
    symbol: "^BSESN",
    company_name: "SENSEX",
  },
  {
    symbol: "TCS.NS",
    company_name: "Tata Consultancy Services",
  },
  {
    symbol: "INFY.NS",
    company_name: "Infosys",
  },
  {
    symbol: "RELIANCE.NS",
    company_name: "Reliance Industries",
  },
  {
    symbol: "HDFCBANK.NS",
    company_name: "HDFC Bank",
  },
  {
    symbol: "ICICIBANK.NS",
    company_name: "ICICI Bank",
  },
  {
    symbol: "SBIN.NS",
    company_name: "State Bank of India",
  },
  {
    symbol: "ITC.NS",
    company_name: "ITC",
  },
  {
    symbol: "LT.NS",
    company_name: "Larsen & Toubro",
  },
  {
    symbol: "AXISBANK.NS",
    company_name: "Axis Bank",
  },
  {
    symbol: "WIPRO.NS",
    company_name: "Wipro",
  },
  {
    symbol: "TATAMOTORS.NS",
    company_name: "Tata Motors",
  },
  {
    symbol: "BHARTIARTL.NS",
    company_name: "Bharti Airtel",
  },
  {
    symbol: "KOTAKBANK.NS",
    company_name: "Kotak Mahindra Bank",
  },
  {
    symbol: "HINDUNILVR.NS",
    company_name: "Hindustan Unilever",
  },
  {
    symbol: "BAJFINANCE.NS",
    company_name: "Bajaj Finance",
  },
  {
    symbol: "ADANIENT.NS",
    company_name: "Adani Enterprises",
  },
  {
    symbol: "MARUTI.NS",
    company_name: "Maruti Suzuki",
  },
  {
    symbol: "SUNPHARMA.NS",
    company_name: "Sun Pharmaceutical",
  },
  {
    symbol: "ONGC.NS",
    company_name: "Oil & Natural Gas Corp",
  },
  {
    symbol: "TITAN.NS",
    company_name: "Titan Company",
  },
  {
    symbol: "ZOMATO.NS",
    company_name: "Zomato Limited",
  },
  {
    symbol: "PAYTM.NS",
    company_name: "Paytm (One97 Communications)",
  },
  {
    symbol: "JIOFIN.NS",
    company_name: "Jio Financial Services",
  },
];

async function seedStocks() {
  try {
    for (const stock of stocks) {
      await pool.query(
        `
        INSERT INTO stocks (
          symbol,
          company_name
        )
        VALUES (
          $1,
          $2
        )
        ON CONFLICT (symbol)
        DO NOTHING
        `,
        [
          stock.symbol,
          stock.company_name,
        ]
      );
    }

    console.log(
      "Stocks seeded successfully"
    );

    process.exit(0);
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
}

seedStocks();