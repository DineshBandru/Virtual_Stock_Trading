# Trade Abhyas - Project Overview

## Project Title

**Trade Abhyas**

## Project Type

Virtual Stock Trading / Paper Trading Platform

## Academic Context

Trade Abhyas is prepared as a B.Tech Mini Project. The system demonstrates a full-stack software solution for learning stock-market trading concepts without using real money or connecting to a live brokerage execution system.

## Purpose

The purpose of Trade Abhyas is to provide students and beginner investors with a safe environment to practice equity trading. Users receive virtual capital, search NSE-listed equity instruments, view market information, place simulated orders, and track portfolio performance.

The platform is not a real brokerage system. All trades are virtual and are recorded only inside the application database.

## Target Users

| User Type | Description |
| --- | --- |
| Students | Users learning capital-market basics and order lifecycle concepts. |
| Beginner investors | Users who want to practice without risking real funds. |
| Administrators | Platform operators who monitor users, orders, transactions, and competitions. |

## Core Concept

Trade Abhyas gives every user virtual money. Users can place paper trades on supported NSE equity instruments. The system records orders, transactions, holdings, positions, realized P&L, unrealized P&L, and account balances.

## Educational Value

The platform helps users understand:

- Market, Limit, Stop-Loss, and Stop-Limit orders.
- Portfolio holdings and weighted average price.
- Realized and unrealized profit/loss.
- Market-session restrictions.
- Risk-free order placement and cancellation.
- Real-time quote updates and alerts.

## High-Level Technology Stack

| Layer | Technology |
| --- | --- |
| User Website | React, Vite, Tailwind CSS, Socket.IO client |
| Admin Application | React, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas with Mongoose |
| Authentication | JWT access tokens, refresh-token sessions, HTTP-only cookies |
| Real-Time Updates | Socket.IO |
| Market Data | Yahoo Finance based market utility, NSE instrument catalogue |
| Security | bcrypt, helmet, CORS allowlist, cookie security configuration |

## Screenshot Evidence

Recommended overview images:

- `docs/screenshots/01-login.png` - Trade Abhyas login screen.
- `docs/screenshots/03-dashboard.png` - User dashboard and virtual account summary.
- `docs/screenshots/23-mobile-stock-detail.png` - Mobile responsive stock detail screen.
