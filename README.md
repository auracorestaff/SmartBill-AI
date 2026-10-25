# SmartBill AI - GST Billing, Inventory & Purchase Scanner

SmartBill AI is a modern, responsive web application for Indian small and medium businesses (SMBs) to manage GST billing, inventory, customer/supplier ledgers, and automated bill extraction via Google Gemini AI.

## Features
- **GST Invoicing**: Professional GST invoices with CGST/SGST/IGST, QR codes, PDF export, and thermal print support.
- **Smart Bill Scanner**: AI-powered invoice extraction using Google Gemini API to scan physical receipts/bills into purchase records.
- **Inventory & Stock Management**: Real-time stock tracking, low stock alerts, batch numbers, and barcode scanner support.
- **Customer & Supplier Ledgers (Khata)**: Track receivables, payables, payment terms, and party transactions.
- **Reports & Analytics**: Sales reports, GST filing summaries (GSTR-1 / GSTR-3B friendly), and profit/margin insights.
- **Cloud Sync**: Persistent storage with Google Cloud Firestore and secure Firebase Authentication.

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, jsPDF
- **Backend / API**: Node.js, Express, Vite
- **Database & Auth**: Google Cloud Firestore & Firebase Auth
- **AI**: Google Gemini API (@google/genai)
