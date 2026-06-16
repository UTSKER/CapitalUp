const pool = require(
  "../../config/postgre"
);

const stocks = [
  {
    symbol: "TCS.NS",
    company_name:
      "Tata Consultancy Services",
  },
  {
    symbol: "INFY.NS",
    company_name: "Infosys",
  },
  {
    symbol: "RELIANCE.NS",
    company_name:
      "Reliance Industries",
  },
  {
    symbol: "HDFCBANK.NS",
    company_name:
      "HDFC Bank",
  },
  {
    symbol: "ICICIBANK.NS",
    company_name:
      "ICICI Bank",
  },
  {
    symbol: "SBIN.NS",
    company_name:
      "State Bank of India",
  },
  {
    symbol: "ITC.NS",
    company_name: "ITC",
  },
  {
    symbol: "LT.NS",
    company_name:
      "Larsen & Toubro",
  },
  {
    symbol: "AXISBANK.NS",
    company_name:
      "Axis Bank",
  },
  {
    symbol: "WIPRO.NS",
    company_name: "Wipro",
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