💰 FinTrack – Personal Finance Manager

A modern, full-stack personal finance management application designed to help users track income, manage expenses, monitor monthly savings, set budgets, and analyse their financial habits.

FinTrack provides a clean dashboard with financial insights to help users make smarter money-management decisions.

🚀 Features

📊 Dashboard

- Total balance overview
- Income and expense summaries
- Monthly savings overview
- Savings rate calculation
- Financial performance charts
- Recent transactions

💵 Income Management

- Add, edit and delete income records
- Categorise income sources
- Track monthly income
- View income history

💳 Expense Management

- Record daily expenses
- Categorise spending
- Edit and delete transactions
- Filter and search expenses
- Track spending history

🎯 Budget Management

- Set monthly budgets
- Create category-wise budgets
- Monitor budget utilisation
- Receive budget threshold alerts
- Track remaining budget

📈 Financial Analytics

- Income vs expense comparison
- Monthly savings trends
- Category-wise spending analysis
- Monthly financial reports
- Interactive charts and graphs

🔔 Notifications

- Budget threshold alerts
- Overspending notifications
- Savings goal reminders
- Upcoming recurring payment reminders

📁 Reports & Exports

- Export transactions to CSV
- Generate financial reports
- Download reports as PDF using browser print functionality

🔐 Authentication & Security

- User registration and login
- Secure authentication
- Protected dashboard
- Supabase Row Level Security
- Private user-specific financial records

🛠️ Tech Stack

Technology| Purpose
React| Frontend
TypeScript| Programming language
Tailwind CSS| Styling
Supabase| Backend and authentication
PostgreSQL| Database
Recharts| Data visualisation
Lucide Icons| Icons
Vercel| Deployment

📂 Project Structure

fintrack-personal-finance-manager/
│
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   ├── utils/
│   ├── types/
│   └── App.tsx
│
├── supabase/
│   └── schema.sql
│
├── .env.example
├── package.json
├── README.md
└── ...

The structure above is illustrative; adjust it to match the actual project files.

⚙️ Installation & Setup

1. Clone the repository

git clone https://github.com/YOUR-USERNAME/fintrack-personal-finance-manager.git

2. Navigate to the project

cd fintrack-personal-finance-manager

3. Install dependencies

npm install

4. Configure environment variables

Create a ".env" file in the root directory.

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

Use the appropriate publishable key if your Supabase project uses the newer key format.

Never expose your Supabase service-role key in frontend code.

5. Configure Supabase

- Create a Supabase project.
- Open the SQL Editor.
- Execute the SQL schema from "supabase/schema.sql".
- Configure authentication and redirect URLs.
- Verify Row Level Security policies.

6. Run the application

npm run dev

Open the local development URL displayed in your terminal.

🧪 Testing

Run the following commands:

npm test
npm run build

💡 Key Financial Calculations

Monthly Savings

Monthly Savings = Total Income - Total Expenses

Savings Rate

Savings Rate = (Monthly Savings / Total Income) × 100

Remaining Budget

Remaining Budget = Total Budget - Total Expenses

The application uses Indian Rupee (₹) formatting.

🔮 Future Improvements

- AI-powered spending insights
- Bank statement CSV import
- Automatic transaction categorisation
- Advanced financial forecasting
- Recurring expense automation
- Multi-currency support
- Mobile application

🔒 Privacy Notice

FinTrack is designed for personal financial management. Users should only enter financial information they are comfortable storing in the application.

This project does not directly connect to bank accounts or initiate financial transactions.

👨‍💻 Author

Vikas Kanojia

⭐ Support

If you find this project useful, consider giving it a star on GitHub!

---

FinTrack – Track Smarter. Save Better.
