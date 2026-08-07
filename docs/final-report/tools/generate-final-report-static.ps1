param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
)

$ErrorActionPreference = "Stop"

$finalDir = Join-Path $Root "docs\final-report"
$assetsDir = Join-Path $finalDir "assets"
$screensDir = Join-Path $Root "docs\screenshots"
$toolsDir = Join-Path $finalDir "tools"
$docxPath = Join-Path $finalDir "Trade_Abhyas_Mini_Project_Report.docx"
$pdfPath = Join-Path $finalDir "Trade_Abhyas_Mini_Project_Report.pdf"
$sourcePath = Join-Path $finalDir "report-source.md"
$htmlPath = Join-Path $finalDir "report-source.html"

New-Item -ItemType Directory -Force -Path $finalDir | Out-Null
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

$screenshots = @(
  @{File="01-login.png"; Caption="Figure 12.1 - Trade Abhyas Login Interface"},
  @{File="03-dashboard.png"; Caption="Figure 12.2 - User Dashboard"},
  @{File="04-stock-search.png"; Caption="Figure 12.3 - NSE Stock Search"},
  @{File="05-stock-detail.png"; Caption="Figure 12.4 - Stock Detail and Market Information"},
  @{File="07-buy-order-ticket.png"; Caption="Figure 12.5 - Virtual Buy Order Interface"},
  @{File="09-portfolio.png"; Caption="Figure 12.6 - User Portfolio"},
  @{File="11-orders.png"; Caption="Figure 12.7 - Order Lifecycle and History"},
  @{File="12-transactions.png"; Caption="Figure 12.8 - Executed Transaction History"},
  @{File="13-watchlist.png"; Caption="Figure 12.9 - Watchlist"},
  @{File="18-admin-dashboard.png"; Caption="Figure 12.10 - Administrative Dashboard"},
  @{File="20-admin-orders.png"; Caption="Figure 12.11 - Administrative Order Monitoring"},
  @{File="23-mobile-stock-detail.png"; Caption="Figure 12.12 - Mobile Responsive Stock Detail"}
)

foreach ($item in $screenshots) {
  if (-not (Test-Path (Join-Path $screensDir $item.File))) { throw "Missing screenshot: $($item.File)" }
}

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression.FileSystem

function XmlEscape([string]$s) {
  if ($null -eq $s) { return "" }
  return [System.Security.SecurityElement]::Escape($s)
}

function HtmlEscape([string]$s) {
  if ($null -eq $s) { return "" }
  return [System.Net.WebUtility]::HtmlEncode($s)
}

function Write-Utf8File([string]$path, [string]$content) {
  [System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
}

function New-DiagramCanvas([int]$w = 1600, [int]$h = 900) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::White)
  return @($bmp, $g)
}

function Draw-Box($g, [int]$x, [int]$y, [int]$w, [int]$h, [string]$text, [string]$fill = "#EAF2F8", [string]$stroke = "#1F4E79") {
  $rect = New-Object System.Drawing.Rectangle $x, $y, $w, $h
  $textRect = New-Object System.Drawing.RectangleF ([float]$x), ([float]$y), ([float]$w), ([float]$h)
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($fill))
  $pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($stroke), 3)
  $g.FillRectangle($brush, $rect); $g.DrawRectangle($pen, $rect)
  $font = New-Object System.Drawing.Font "Arial", 24, ([System.Drawing.FontStyle]::Bold)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(25,25,25))
  $g.DrawString($text, $font, $textBrush, $textRect, $format)
  $brush.Dispose(); $pen.Dispose(); $font.Dispose(); $format.Dispose(); $textBrush.Dispose()
}

function Draw-Arrow($g, [int]$x1, [int]$y1, [int]$x2, [int]$y2, [string]$text = "") {
  $pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#1F4E79"), 4)
  $cap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap 6, 8
  $pen.CustomEndCap = $cap
  $g.DrawLine($pen, $x1, $y1, $x2, $y2)
  if ($text) {
    $font = New-Object System.Drawing.Font "Arial", 17
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#1F4E79"))
    $g.DrawString($text, $font, $brush, [float](($x1 + $x2) / 2 - 70), [float](($y1 + $y2) / 2 - 26))
    $font.Dispose(); $brush.Dispose()
  }
  $pen.Dispose(); $cap.Dispose()
}

function Save-Diagram($bmp, $g, [string]$path) {
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function Create-Diagrams {
  $c = New-DiagramCanvas 1600 900; $bmp=$c[0]; $g=$c[1]
  Draw-Box $g 80 110 380 150 "User Website`nReact + Vite" "#EAF7FF"
  Draw-Box $g 80 620 380 150 "Admin Application`nReact + Vite" "#EAF7FF"
  Draw-Box $g 610 330 390 190 "Express Backend`nREST APIs + Socket.IO"
  Draw-Box $g 1160 330 340 190 "MongoDB Atlas`nApplication Database" "#ECF8EF" "#2D7D46"
  Draw-Box $g 610 80 390 120 "Market Data Services`nYahoo Finance + NSE Catalogue" "#FFF7E6" "#9A6A00"
  Draw-Box $g 610 650 390 120 "Authentication, Trading,`nPortfolio, Alerts, Admin APIs" "#F3EAFE" "#6B3FA0"
  Draw-Arrow $g 460 185 610 395 "REST"; Draw-Arrow $g 460 695 610 455 "REST"; Draw-Arrow $g 1000 425 1160 425 "Mongoose"; Draw-Arrow $g 805 200 805 330 "quotes"; Draw-Arrow $g 805 650 805 520 "services"
  Save-Diagram $bmp $g (Join-Path $assetsDir "system-architecture.png")

  $c = New-DiagramCanvas 1600 950; $bmp=$c[0]; $g=$c[1]
  Draw-Box $g 650 60 300 110 "users"
  foreach ($e in @(@(140,250,"refreshTokens"),@(500,250,"orders"),@(860,250,"transactions"),@(1220,250,"portfolios"),@(140,520,"watchlists"),@(500,520,"alerts"),@(860,520,"competitions"),@(1220,520,"instruments"))) { Draw-Box $g $e[0] $e[1] 250 105 $e[2] "#F7F9FC" }
  Draw-Arrow $g 705 170 265 250 "owns"; Draw-Arrow $g 760 170 625 250 "places"; Draw-Arrow $g 840 170 985 250 "has"; Draw-Arrow $g 895 170 1345 250 "owns"; Draw-Arrow $g 705 170 265 520 "owns"; Draw-Arrow $g 760 170 625 520 "creates"; Draw-Arrow $g 840 170 985 520 "joins"; Draw-Arrow $g 1345 520 1345 355 "referenced"; Draw-Arrow $g 750 305 860 305 "produces"
  Save-Diagram $bmp $g (Join-Path $assetsDir "database-er.png")

  $c = New-DiagramCanvas 1500 820; $bmp=$c[0]; $g=$c[1]
  Draw-Box $g 110 330 220 100 "Pending" "#FFF7E6" "#9A6A00"
  Draw-Box $g 520 170 220 100 "Triggered" "#EAF7FF"
  Draw-Box $g 930 170 220 100 "Executed" "#ECF8EF" "#2D7D46"
  Draw-Box $g 520 500 220 100 "Cancelled" "#F3F4F6" "#6B7280"
  Draw-Box $g 930 500 220 100 "Rejected" "#FDECEC" "#B42318"
  Draw-Arrow $g 330 380 520 220 "stop reached"; Draw-Arrow $g 740 220 930 220 "limit ok"; Draw-Arrow $g 330 380 930 220 "market/limit ok"; Draw-Arrow $g 330 395 520 545 "cancel"; Draw-Arrow $g 330 410 930 545 "invalid"
  Save-Diagram $bmp $g (Join-Path $assetsDir "order-lifecycle.png")
}

Create-Diagrams

$chapters = @(
  @{Level=1; Title="CHAPTER 1 - INTRODUCTION"; Paras=@(
    "Stock-market education requires both conceptual learning and practical exposure. Many beginners understand definitions such as buy, sell, portfolio, and profit/loss, but they do not get a safe place to observe order behavior and account changes. Trade Abhyas solves this by offering a virtual trading environment in which all financial values are simulated.",
    "Trade Abhyas is a virtual stock trading platform developed as a B.Tech Mini Project. The system provides registration, login, stock search, market information, order placement, portfolio tracking, positions, transactions, watchlist, alerts, competitions, settings, and an admin monitoring system.",
    "The project scope is limited to educational paper trading. It does not perform real stock-exchange execution, bank settlement, demat account integration, PAN verification, margin trading, or derivatives trading."
  )},
  @{Level=1; Title="CHAPTER 2 - PROBLEM STATEMENT AND OBJECTIVES"; Paras=@(
    "Students and beginners often lack a practical platform to learn stock-market mechanics safely. Static study material and simple price-monitoring applications do not show realistic order lifecycle, portfolio changes, and financial integrity rules.",
    "Primary objectives include simulating equity trading using virtual capital, supporting realistic order types, maintaining accurate portfolio/accounting records, providing market-data-based stock information, and protecting trading integrity under concurrent order processing.",
    "Secondary objectives include watchlists, price alerts, competitions, role-protected administration, password recovery, secure sessions, local validation, and future production readiness."
  )},
  @{Level=1; Title="CHAPTER 3 - EXISTING AND PROPOSED SYSTEM"; Paras=@(
    "Common approaches include static learning websites, basic market-price trackers, and simplified paper-trading demos. These approaches often lack a realistic order lifecycle, transaction-safe accounting, concurrency protection, and administrator monitoring.",
    "Trade Abhyas proposes a full-stack virtual trading platform with market-linked NSE instruments, virtual capital, realistic order types, persistent holdings, P&L calculation, real-time updates, admin monitoring, and audit-based financial integrity checks."
  ); Table=@{Title="Table 3.1 - Existing and Proposed System Comparison"; Headers=@("Aspect","Existing/Common Systems","Trade Abhyas"); Rows=@(@("Learning mode","Mostly static or simplified","Interactive paper trading"),@("Order lifecycle","Limited or absent","Market, Limit, Stop-Loss, Stop-Limit"),@("Portfolio accounting","Basic or unavailable","Balance, holdings, weighted average, P&L"),@("Administration","Often not included","Separate admin dashboard"),@("Integrity controls","Usually limited","Transactions, locks, retries, audit checks"),@("Real-money execution","Not applicable","Not included; virtual only"))}},
  @{Level=1; Title="CHAPTER 4 - REQUIREMENTS AND TECHNOLOGY STACK"; Paras=@(
    "Functional requirements include authentication, stock search, stock detail, charting, order placement, portfolio, positions, transactions, watchlist, alerts, competitions, settings, password recovery, and admin monitoring.",
    "Non-functional requirements include security, reliability, consistency, performance, responsiveness, maintainability, scalability, data integrity, and availability.",
    "The verified stack includes React, Vite, Tailwind CSS, Node.js, Express.js, MongoDB Atlas, Mongoose, JWT, bcrypt, Socket.IO, Yahoo Finance based market utilities, an NSE instrument catalogue, and Resend-compatible email integration for password reset delivery configuration."
  ); Table=@{Title="Table 4.1 - Software Requirements"; Headers=@("Layer","Technology"); Rows=@(@("Frontend","React, Vite, Tailwind CSS"),@("Backend","Node.js, Express.js"),@("Database","MongoDB Atlas, Mongoose"),@("Authentication","JWT, refresh-token sessions, bcrypt"),@("Real time","Socket.IO"),@("Market data","Yahoo Finance based market utility and NSE instrument catalogue"),@("Email","Resend-compatible password reset email integration; production credentials deferred"))}},
  @{Level=1; Title="CHAPTER 5 - SYSTEM ARCHITECTURE"; Paras=@(
    "Trade Abhyas uses a MERN-style architecture with two React applications and one Express backend. The user website communicates with the backend through REST APIs and Socket.IO. The admin application communicates with the same backend through REST APIs and is protected by admin authorization.",
    "The backend contains authentication, trading, market data, portfolio, alerts, admin APIs, and real-time services. External market information is used only for simulation and display; virtual orders are stored and processed inside the application database."
  ); Figure=@{Path=(Join-Path $assetsDir "system-architecture.png"); Caption="Figure 5.1 - System Architecture"}},
  @{Level=1; Title="CHAPTER 6 - MODULE DESCRIPTION"; Paras=@(
    "The major modules are Authentication, User Account, NSE Instrument Search, Market Data, Stock Detail and Historical Charts, Trading/Order Management, Portfolio, Positions, Transactions, Watchlist, Alerts, Real-Time Socket.IO Updates, Competitions, Administration, and Password Recovery.",
    "Each module is implemented around clear data ownership boundaries. User-facing screens do not mutate financial records directly. Trading changes are routed through backend services to maintain consistency."
  ); Table=@{Title="Table 6.1 - Module Summary"; Headers=@("Module","Purpose","Input","Output"); Rows=@(@("Authentication","Secure access","Credentials","Authenticated session"),@("User Account","Profile maintenance","Name, email, mobile, preferences","Updated profile"),@("NSE Instrument Search","Stock discovery","Search query","Matching symbols"),@("Market Data","Quote/history display","Symbol/timeframe","Market information"),@("Trading/Orders","Virtual order placement","Symbol, side, quantity, type","Order status"),@("Portfolio","Holding management","Executed orders","Holdings and value"),@("Transactions","Executed trade ledger","Executed order","Transaction record"),@("Watchlist","Track selected stocks","Symbols/lists","Personal watchlist"),@("Alerts","Price-level tracking","Symbol, target, condition","Alert status"),@("Administration","Monitoring","Admin API requests","Admin dashboards"))}},
  @{Level=1; Title="CHAPTER 7 - DATABASE DESIGN"; Paras=@(
    "MongoDB stores application data through Mongoose models. The database stores only virtual trading and account data needed by the platform. It does not store bank account details, PAN card details, demat credentials, or real-money payment data.",
    "Important collections include users, refreshTokens, instruments, orders, transactions, portfolios, watchlists, alerts, and competitions. Key constraints include unique email, unique transaction per order, and unique portfolio row per user and symbol."
  ); Figure=@{Path=(Join-Path $assetsDir "database-er.png"); Caption="Figure 7.1 - Database ER Diagram"}},
  @{Level=1; Title="CHAPTER 8 - TRADING ENGINE DESIGN"; Paras=@(
    "The trading engine simulates stock order execution using virtual funds and holdings. It supports Market, Limit, Stop-Loss, and Stop-Limit orders. The engine checks market session, quote validity, user funds, user holdings, and order lifecycle conditions before changing financial records.",
    "A Market order executes during active market hours when an executable quote is available. A Limit order executes only when the market price satisfies the configured limit condition. A Stop-Loss order remains pending until its trigger price is reached. A Stop-Limit order moves from Pending to Triggered and then Executes only when both trigger and limit conditions are satisfied.",
    "The market-session service uses Asia/Kolkata and the configured session of 09:15 to 15:30 on weekdays, excluding configured NSE holidays. Stale, missing, invalid, unavailable, or mismatched quotes are rejected or skipped."
  ); Figure=@{Path=(Join-Path $assetsDir "order-lifecycle.png"); Caption="Figure 8.1 - Order Lifecycle"}},
  @{Level=1; Title="CHAPTER 9 - PORTFOLIO AND FINANCIAL ACCOUNTING"; Paras=@(
    "Portfolio accounting is updated only after an order executes. A BUY order debits virtual cash and increases holdings. A SELL order credits virtual cash and reduces or closes holdings.",
    "Weighted Average Price = ((Old Quantity x Old Average Price) + (New Quantity x Buy Price)) / (Old Quantity + New Quantity). Unrealized P&L = (Current Market Price - Average Price) x Quantity. Realized P&L = (Sell Price - Average Buy Price) x Sold Quantity.",
    "Partial selling reduces the holding quantity while retaining the existing average buy price for the remaining holding. Full selling removes the holding row and records the transaction history."
  )},
  @{Level=1; Title="CHAPTER 10 - CONCURRENCY AND FINANCIAL INTEGRITY"; Paras=@(
    "Trading systems must protect users from duplicate execution, negative balances, and negative holdings. Trade Abhyas includes concurrency controls in the virtual order engine.",
    "MongoDB transactions group order, transaction, balance, and portfolio changes. Atomic balance mutation prevents overspending during concurrent BUY orders. Latest holding revalidation prevents overselling during concurrent SELL orders. Processing tokens prevent duplicate order claims.",
    "The order service automated test suite completed with Total: 10, Passed: 10, Failed: 0. Coverage includes Market, Limit, Stop-Loss, Stop-Limit, cancellation, rejected orders, concurrent BUY/SELL, duplicate processing, and stale recovery."
  ); Table=@{Title="Table 10.1 - Order Service Test Result"; Headers=@("Metric","Result"); Rows=@(@("Total tests","10"),@("Passed","10"),@("Failed","0"),@("Coverage","Market, Limit, Stop-Loss, Stop-Limit, cancellation, rejected orders, concurrent BUY/SELL, duplicate processing, stale recovery"))}},
  @{Level=1; Title="CHAPTER 11 - SECURITY DESIGN"; Paras=@(
    "Passwords are hashed using bcrypt before storage. JWT access tokens and refresh sessions are stored through HTTP-only cookies. Refresh tokens are stored as hashes in the database. Admin APIs require authenticated users with the admin role.",
    "Password reset uses hashed reset tokens, expiry, and session revocation after reset. CORS is configured through allowed frontend origins. Production cookie configuration supports secure and SameSite settings. Secrets such as database strings, JWT secrets, and email provider keys are supplied through environment variables.",
    "Because Trade Abhyas is a virtual trading platform, it does not ask for bank credentials, PAN card details, demat account details, brokerage credentials, UPI information, or real-money settlement data."
  )},
  @{Level=1; Title="CHAPTER 13 - TESTING AND RESULTS"; Paras=@(
    "Testing covered authentication, admin authorization, trading behavior, concurrency, audit checks, local API flows, Socket.IO behavior, watchlist, alerts, password reset, and frontend builds.",
    "Authentication verification included registration, login, invalid login, session persistence, refresh, and logout. Admin authorization verification included admin authenticated -> 200, normal user authenticated -> 403, and logged out -> 401.",
    "Financial integrity audit result: executed orders without transactions 0; transactions without valid executed orders 0; duplicate transactions 0; negative balances 0; negative holdings 0; duplicate holdings 0; portfolio/position mismatches 0; invalid financial mutations 0; invalid symbols 0; ownership mismatches 0; status issues 0."
  ); Table=@{Title="Table 13.1 - Testing Summary"; Headers=@("Area","Verified Result"); Rows=@(@("Authentication","Registration, login, invalid login, session persistence, refresh, logout"),@("Admin authorization","Admin authenticated -> 200; normal user -> 403; logged out -> 401"),@("Trading","BUY, SELL, Limit, Stop-Loss, Stop-Limit, oversell, insufficient balance, market closed, cancellation"),@("Concurrency","10/10 order-service tests passed"),@("Financial audit","Zero issues across executed orders, transactions, balances, holdings, duplicates, ownership, and status checks"),@("Local E2E","Auth, search, quote/chart, BUY/SELL, portfolio, orders, transactions, Socket.IO, watchlist, alerts, password reset, admin authorization"))}},
  @{Level=1; Title="CHAPTER 14 - LIMITATIONS AND FUTURE SCOPE"; Paras=@(
    "Current limitations include paper trading only, no real stock exchange execution, NSE equity-focused scope, no derivatives, no margin/leverage, dependence on third-party market data, quote timing differences from exchange-grade feeds, required NSE holiday configuration, deferred production deployment, and deferred production transactional-email credentials.",
    "Future scope includes production deployment, transactional email configuration, mobile application, advanced analytics, expanded competition features, educational lessons, additional market segments, improved market-data infrastructure, and advanced portfolio insights."
  )},
  @{Level=1; Title="CHAPTER 15 - CONCLUSION"; Paras=@(
    "Trade Abhyas successfully demonstrates a complete virtual stock trading platform suitable for a B.Tech Mini Project. It combines realistic paper trading workflows, NSE market information, secure authentication, realistic order lifecycles, accurate portfolio accounting, real-time updates, financial integrity checks, concurrency-safe execution, and administrative monitoring.",
    "The project avoids real-money brokerage claims and remains focused on educational paper trading. Testing and audit results confirm that the core trading flow is technically consistent and ready for academic demonstration."
  )}
)

$sourceLines = New-Object System.Collections.Generic.List[string]
$sourceLines.Add("# Trade Abhyas Mini Project Report")
$sourceLines.Add("")
$sourceLines.Add("College placeholders: <COLLEGE NAME>, <UNIVERSITY NAME>, <DEPARTMENT NAME>, <STUDENT NAME>, <ROLL NUMBER>, <REGISTER NUMBER>, <GUIDE NAME>, <GUIDE DESIGNATION>, <HEAD OF DEPARTMENT>, <ACADEMIC YEAR>, <PLACE>, <DATE>.")
$sourceLines.Add("")
foreach ($c in $chapters) {
  $sourceLines.Add("## $($c.Title)")
  foreach ($p in $c.Paras) { $sourceLines.Add(""); $sourceLines.Add($p) }
}
Write-Utf8File $sourcePath ($sourceLines -join [Environment]::NewLine)

$html = New-Object System.Text.StringBuilder
[void]$html.AppendLine("<!doctype html><html><head><meta charset='utf-8'><title>Trade Abhyas Mini Project Report</title><style>@page{size:A4;margin:2.5cm 2.3cm 2.5cm 3cm}body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;color:#111}h1{font-size:16pt;text-align:center;page-break-before:always}h2{font-size:14pt;margin-top:18pt}.title h1{page-break-before:auto;font-size:24pt}.title{text-align:center;margin-top:90pt}.page{page-break-after:always}table{width:100%;border-collapse:collapse;margin:10pt 0 16pt}th,td{border:1px solid #777;padding:6pt;vertical-align:top}th{background:#f0f2f5}figure{page-break-inside:avoid;text-align:center;margin:12pt 0 18pt}figcaption{font-style:italic;font-size:10pt;margin-top:6pt}img{max-width:100%;height:auto}.screenshot{max-width:16cm}.mobile{max-width:7cm}.header{position:running(header)}</style></head><body>")
[void]$html.AppendLine("<section class='title page'><h1>TRADE ABHYAS</h1><h2>Virtual Stock Trading Platform</h2><p>A Mini Project Report</p><p>Submitted in partial fulfillment of the requirements for the award of the degree of Bachelor of Technology in <b>&lt;DEPARTMENT NAME&gt;</b></p><p><b>Submitted by</b><br>&lt;STUDENT NAME&gt;<br>Roll Number: &lt;ROLL NUMBER&gt;<br>Register Number: &lt;REGISTER NUMBER&gt;</p><p><b>Under the guidance of</b><br>&lt;GUIDE NAME&gt;<br>&lt;GUIDE DESIGNATION&gt;</p><p>&lt;COLLEGE NAME&gt;<br>&lt;UNIVERSITY NAME&gt;<br>&lt;ACADEMIC YEAR&gt;</p></section>")
[void]$html.AppendLine("<h1>CERTIFICATE</h1><p>This is to certify that the Mini Project report entitled <b>Trade Abhyas - Virtual Stock Trading Platform</b> is a bonafide work carried out by &lt;STUDENT NAME&gt;, Roll Number &lt;ROLL NUMBER&gt;, Register Number &lt;REGISTER NUMBER&gt;, in partial fulfillment of the requirements for the award of the degree of Bachelor of Technology in &lt;DEPARTMENT NAME&gt; during the academic year &lt;ACADEMIC YEAR&gt;.</p><table><tr><th>Role</th><th>Name and Signature</th></tr><tr><td>Guide</td><td>&lt;GUIDE NAME&gt;</td></tr><tr><td>Head of Department</td><td>&lt;HEAD OF DEPARTMENT&gt;</td></tr><tr><td>Place and Date</td><td>&lt;PLACE&gt;, &lt;DATE&gt;</td></tr></table>")
[void]$html.AppendLine("<h1>DECLARATION</h1><p>I hereby declare that the Mini Project report entitled <b>Trade Abhyas - Virtual Stock Trading Platform</b> submitted to &lt;COLLEGE NAME&gt; is a record of original work carried out by me under the guidance of &lt;GUIDE NAME&gt;. This work is submitted in partial fulfillment of the requirements for the award of the Bachelor of Technology degree.</p><p>Signature of Student: __________________________<br>Name: &lt;STUDENT NAME&gt;<br>Date: &lt;DATE&gt;</p>")
[void]$html.AppendLine("<h1>ACKNOWLEDGEMENT</h1><p>I express my sincere gratitude to &lt;COLLEGE NAME&gt; and &lt;DEPARTMENT NAME&gt; for providing the opportunity to complete this Mini Project. I am thankful to &lt;GUIDE NAME&gt;, &lt;GUIDE DESIGNATION&gt;, for valuable guidance, encouragement, and support throughout the project.</p>")
[void]$html.AppendLine("<h1>ABSTRACT</h1><p>Trade Abhyas is a virtual stock trading platform developed as a B.Tech Mini Project to help students and beginner investors understand stock-market workflows without risking real money. The project addresses the need for a safe paper-trading environment where users can search NSE equity instruments, view market information, place simulated orders, and track portfolio performance using virtual funds.</p><p>The system uses a MERN-style architecture with a React user website, a separate React admin application, a Node.js and Express backend, MongoDB Atlas persistence, JWT authentication, refresh-token sessions, and Socket.IO real-time updates. The trading engine supports Market, Limit, Stop-Loss, and Stop-Limit virtual orders. Automated testing completed with 10 passed order-service tests and a clean financial integrity audit.</p>")
[void]$html.AppendLine("<h1>TABLE OF CONTENTS</h1><ol><li>Introduction</li><li>Problem Statement and Objectives</li><li>Existing and Proposed System</li><li>Requirements and Technology Stack</li><li>System Architecture</li><li>Module Description</li><li>Database Design</li><li>Trading Engine Design</li><li>Portfolio and Financial Accounting</li><li>Concurrency and Financial Integrity</li><li>Security Design</li><li>Implementation Screenshots</li><li>Testing and Results</li><li>Limitations and Future Scope</li><li>Conclusion</li><li>References</li></ol>")
[void]$html.AppendLine("<h1>LIST OF FIGURES</h1><ol><li>Figure 5.1 - System Architecture</li><li>Figure 7.1 - Database ER Diagram</li><li>Figure 8.1 - Order Lifecycle</li><li>Figures 12.1 to 12.12 - Implementation Screenshots</li></ol><h1>LIST OF TABLES</h1><ol><li>Table 3.1 - Existing and Proposed System Comparison</li><li>Table 4.1 - Software Requirements</li><li>Table 6.1 - Module Summary</li><li>Table 10.1 - Order Service Test Result</li><li>Table 13.1 - Testing Summary</li></ol>")

foreach ($c in $chapters) {
  [void]$html.AppendLine("<h1>$(HtmlEscape $c.Title)</h1>")
  foreach ($p in $c.Paras) { [void]$html.AppendLine("<p>$(HtmlEscape $p)</p>") }
  if ($c.Table) {
    [void]$html.AppendLine("<p><b>$(HtmlEscape $c.Table.Title)</b></p><table><tr>")
    foreach ($h in $c.Table.Headers) { [void]$html.AppendLine("<th>$(HtmlEscape $h)</th>") }
    [void]$html.AppendLine("</tr>")
    foreach ($r in $c.Table.Rows) { [void]$html.AppendLine("<tr>"); foreach ($cell in $r) { [void]$html.AppendLine("<td>$(HtmlEscape $cell)</td>") }; [void]$html.AppendLine("</tr>") }
    [void]$html.AppendLine("</table>")
  }
  if ($c.Figure) {
    $rel = [Uri]::new($htmlPath).MakeRelativeUri([Uri]::new($c.Figure.Path)).ToString()
    [void]$html.AppendLine("<figure><img src='$(HtmlEscape $rel)'><figcaption>$(HtmlEscape $c.Figure.Caption)</figcaption></figure>")
  }
}

[void]$html.AppendLine("<h1>CHAPTER 12 - IMPLEMENTATION SCREENSHOTS</h1>")
foreach ($s in $screenshots) {
  $shotPath = Join-Path $screensDir $s.File
  $rel = [Uri]::new($htmlPath).MakeRelativeUri([Uri]::new($shotPath)).ToString()
  $cls = if ($s.File -eq "23-mobile-stock-detail.png") { "mobile" } else { "screenshot" }
  [void]$html.AppendLine("<figure><img class='$cls' src='$(HtmlEscape $rel)'><figcaption>$(HtmlEscape $s.Caption)</figcaption></figure>")
}
[void]$html.AppendLine("<h1>REFERENCES</h1><ol><li>React Documentation - https://react.dev/</li><li>Vite Documentation - https://vitejs.dev/</li><li>Node.js Documentation - https://nodejs.org/</li><li>Express.js Documentation - https://expressjs.com/</li><li>MongoDB Documentation - https://www.mongodb.com/docs/</li><li>Mongoose Documentation - https://mongoosejs.com/docs/</li><li>Socket.IO Documentation - https://socket.io/docs/</li><li>JSON Web Token Introduction - https://jwt.io/introduction</li><li>National Stock Exchange of India - https://www.nseindia.com/</li></ol></body></html>")
Write-Utf8File $htmlPath $html.ToString()

$tmp = Join-Path $env:TEMP ("tradeabhyas-docx-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $tmp "_rels") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $tmp "docProps") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $tmp "word\_rels") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $tmp "word\media") | Out-Null

$rels = New-Object System.Collections.Generic.List[string]
$mediaIndex = 1
function Add-DocxImage([string]$path) {
  $script:mediaIndex++
  $name = "image$($script:mediaIndex).png"
  Copy-Item $path (Join-Path $tmp "word\media\$name") -Force
  $rid = "rId$($script:mediaIndex + 10)"
  $script:rels.Add("<Relationship Id=`"$rid`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image`" Target=`"media/$name`"/>") | Out-Null
  return $rid
}

function W-P([string]$text, [string]$style = "Normal", [string]$align = "both") {
  $pPr = ""
  if ($style -ne "Normal") { $pPr += "<w:pStyle w:val=`"$style`"/>" }
  if ($align) { $pPr += "<w:jc w:val=`"$align`"/>" }
  return "<w:p><w:pPr>$pPr</w:pPr><w:r><w:t xml:space=`"preserve`">$(XmlEscape $text)</w:t></w:r></w:p>"
}

function W-PageBreak { return "<w:p><w:r><w:br w:type=`"page`"/></w:r></w:p>" }

function W-Table($headers, $rows) {
  $xml = "<w:tbl><w:tblPr><w:tblW w:w=`"9000`" w:type=`"dxa`"/><w:tblBorders><w:top w:val=`"single`" w:sz=`"4`" w:color=`"777777`"/><w:left w:val=`"single`" w:sz=`"4`" w:color=`"777777`"/><w:bottom w:val=`"single`" w:sz=`"4`" w:color=`"777777`"/><w:right w:val=`"single`" w:sz=`"4`" w:color=`"777777`"/><w:insideH w:val=`"single`" w:sz=`"4`" w:color=`"777777`"/><w:insideV w:val=`"single`" w:sz=`"4`" w:color=`"777777`"/></w:tblBorders></w:tblPr>"
  $xml += "<w:tr>"
  foreach ($h in $headers) { $xml += "<w:tc><w:tcPr><w:shd w:fill=`"F0F2F5`"/></w:tcPr>$(W-P $h "Normal" "center")</w:tc>" }
  $xml += "</w:tr>"
  foreach ($r in $rows) {
    $xml += "<w:tr>"
    foreach ($cell in $r) { $xml += "<w:tc>$(W-P ([string]$cell) "Normal" "left")</w:tc>" }
    $xml += "</w:tr>"
  }
  $xml += "</w:tbl>"
  return $xml
}

function W-Image([string]$path, [string]$caption, [double]$maxInches = 6.0) {
  $rid = Add-DocxImage $path
  $img = [System.Drawing.Image]::FromFile($path)
  $wIn = [Math]::Min($maxInches, $img.Width / 160.0)
  $hIn = $wIn * $img.Height / $img.Width
  $img.Dispose()
  $cx = [int]($wIn * 914400); $cy = [int]($hIn * 914400)
  $xml = "<w:p><w:pPr><w:jc w:val=`"center`"/></w:pPr><w:r><w:drawing><wp:inline xmlns:wp=`"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing`" distT=`"0`" distB=`"0`" distL=`"0`" distR=`"0`"><wp:extent cx=`"$cx`" cy=`"$cy`"/><wp:docPr id=`"$script:mediaIndex`" name=`"Picture$script:mediaIndex`"/><a:graphic xmlns:a=`"http://schemas.openxmlformats.org/drawingml/2006/main`"><a:graphicData uri=`"http://schemas.openxmlformats.org/drawingml/2006/picture`"><pic:pic xmlns:pic=`"http://schemas.openxmlformats.org/drawingml/2006/picture`"><pic:nvPicPr><pic:cNvPr id=`"$script:mediaIndex`" name=`"image.png`"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed=`"$rid`"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x=`"0`" y=`"0`"/><a:ext cx=`"$cx`" cy=`"$cy`"/></a:xfrm><a:prstGeom prst=`"rect`"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>"
  $xml += W-P $caption "Caption" "center"
  return $xml
}

$body = New-Object System.Text.StringBuilder
function Append-Body([string]$xml) { [void]$script:body.Append($xml) }
Append-Body (W-P "TRADE ABHYAS" "Title" "center")
Append-Body (W-P "Virtual Stock Trading Platform" "Subtitle" "center")
Append-Body (W-P "A Mini Project Report" "Normal" "center")
Append-Body (W-P "Submitted by <STUDENT NAME> | Roll Number: <ROLL NUMBER> | Register Number: <REGISTER NUMBER>" "Normal" "center")
Append-Body (W-P "Under the guidance of <GUIDE NAME>, <GUIDE DESIGNATION>" "Normal" "center")
Append-Body (W-P "<COLLEGE NAME> | <UNIVERSITY NAME> | <ACADEMIC YEAR>" "Normal" "center")
Append-Body (W-PageBreak)
Append-Body (W-P "CERTIFICATE" "Heading1" "center")
Append-Body (W-P "This is to certify that the Mini Project report entitled Trade Abhyas - Virtual Stock Trading Platform is a bonafide work carried out by <STUDENT NAME>, Roll Number <ROLL NUMBER>, Register Number <REGISTER NUMBER>, in partial fulfillment of the requirements for the award of the degree of Bachelor of Technology in <DEPARTMENT NAME> during the academic year <ACADEMIC YEAR>.")
Append-Body (W-Table @("Role","Name and Signature") @(@("Guide","<GUIDE NAME>"),@("Head of Department","<HEAD OF DEPARTMENT>"),@("Place and Date","<PLACE>, <DATE>")))
Append-Body (W-PageBreak)
Append-Body (W-P "DECLARATION" "Heading1" "center")
Append-Body (W-P "I hereby declare that the Mini Project report entitled Trade Abhyas - Virtual Stock Trading Platform submitted to <COLLEGE NAME> is a record of original work carried out by me under the guidance of <GUIDE NAME>. This work is submitted in partial fulfillment of the requirements for the award of the Bachelor of Technology degree.")
Append-Body (W-P "Signature of Student: __________________________")
Append-Body (W-PageBreak)
Append-Body (W-P "ACKNOWLEDGEMENT" "Heading1" "center")
Append-Body (W-P "I express my sincere gratitude to <COLLEGE NAME> and <DEPARTMENT NAME> for providing the opportunity to complete this Mini Project. I am thankful to <GUIDE NAME>, <GUIDE DESIGNATION>, for valuable guidance, encouragement, and support throughout the project.")
Append-Body (W-PageBreak)
Append-Body (W-P "ABSTRACT" "Heading1" "center")
Append-Body (W-P "Trade Abhyas is a virtual stock trading platform developed as a B.Tech Mini Project to help students and beginner investors understand stock-market workflows without risking real money. The project addresses the need for a safe paper-trading environment where users can search NSE equity instruments, view market information, place simulated orders, and track portfolio performance using virtual funds.")
Append-Body (W-P "The system uses a MERN-style architecture with a React user website, a separate React admin application, a Node.js and Express backend, MongoDB Atlas persistence, JWT authentication, refresh-token sessions, and Socket.IO real-time updates. The trading engine supports Market, Limit, Stop-Loss, and Stop-Limit virtual orders. Automated testing completed with 10 passed order-service tests and a clean financial integrity audit.")
Append-Body (W-PageBreak)
Append-Body (W-P "TABLE OF CONTENTS" "Heading1" "center")
Append-Body (W-Table @("Section","Title") @(@("Chapter 1","Introduction"),@("Chapter 2","Problem Statement and Objectives"),@("Chapter 3","Existing and Proposed System"),@("Chapter 4","Requirements and Technology Stack"),@("Chapter 5","System Architecture"),@("Chapter 6","Module Description"),@("Chapter 7","Database Design"),@("Chapter 8","Trading Engine Design"),@("Chapter 9","Portfolio and Financial Accounting"),@("Chapter 10","Concurrency and Financial Integrity"),@("Chapter 11","Security Design"),@("Chapter 12","Implementation Screenshots"),@("Chapter 13","Testing and Results"),@("Chapter 14","Limitations and Future Scope"),@("Chapter 15","Conclusion"),@("References","Technology References")))
Append-Body (W-PageBreak)
Append-Body (W-P "LIST OF FIGURES" "Heading1" "center")
Append-Body (W-P "Figure 5.1 - System Architecture; Figure 7.1 - Database ER Diagram; Figure 8.1 - Order Lifecycle; Figures 12.1 to 12.12 - Implementation Screenshots.")
Append-Body (W-P "LIST OF TABLES" "Heading1" "center")
Append-Body (W-P "Tables include existing/proposed comparison, software requirements, module summary, order test result, and testing summary.")
Append-Body (W-PageBreak)

foreach ($c in $chapters) {
  Append-Body (W-P $c.Title "Heading1" "center")
  foreach ($p in $c.Paras) { Append-Body (W-P $p) }
  if ($c.Table) {
    Append-Body (W-P $c.Table.Title "Caption" "left")
    Append-Body (W-Table $c.Table.Headers $c.Table.Rows)
  }
  if ($c.Figure) { Append-Body (W-Image $c.Figure.Path $c.Figure.Caption 6.0) }
  Append-Body (W-PageBreak)
}

Append-Body (W-P "CHAPTER 12 - IMPLEMENTATION SCREENSHOTS" "Heading1" "center")
foreach ($s in $screenshots) {
  $max = if ($s.File -eq "23-mobile-stock-detail.png") { 2.8 } else { 6.0 }
  Append-Body (W-Image (Join-Path $screensDir $s.File) $s.Caption $max)
  Append-Body (W-PageBreak)
}
Append-Body (W-P "REFERENCES" "Heading1" "center")
foreach ($r in @("React Documentation - https://react.dev/","Vite Documentation - https://vitejs.dev/","Node.js Documentation - https://nodejs.org/","Express.js Documentation - https://expressjs.com/","MongoDB Documentation - https://www.mongodb.com/docs/","Mongoose Documentation - https://mongoosejs.com/docs/","Socket.IO Documentation - https://socket.io/docs/","JSON Web Token Introduction - https://jwt.io/introduction","National Stock Exchange of India - https://www.nseindia.com/")) { Append-Body (W-P $r) }

$documentXml = "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><w:document xmlns:wpc=`"http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas`" xmlns:mc=`"http://schemas.openxmlformats.org/markup-compatibility/2006`" xmlns:o=`"urn:schemas-microsoft-com:office:office`" xmlns:r=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships`" xmlns:m=`"http://schemas.openxmlformats.org/officeDocument/2006/math`" xmlns:v=`"urn:schemas-microsoft-com:vml`" xmlns:wp14=`"http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing`" xmlns:wp=`"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing`" xmlns:w10=`"urn:schemas-microsoft-com:office:word`" xmlns:w=`"http://schemas.openxmlformats.org/wordprocessingml/2006/main`" xmlns:w14=`"http://schemas.microsoft.com/office/word/2010/wordml`" xmlns:wpg=`"http://schemas.microsoft.com/office/word/2010/wordprocessingGroup`" xmlns:wpi=`"http://schemas.microsoft.com/office/word/2010/wordprocessingInk`" xmlns:wne=`"http://schemas.microsoft.com/office/word/2006/wordml`" xmlns:wps=`"http://schemas.microsoft.com/office/word/2010/wordprocessingShape`" mc:Ignorable=`"w14 wp14`"><w:body>$($body.ToString())<w:sectPr><w:pgSz w:w=`"11906`" w:h=`"16838`"/><w:pgMar w:top=`"1417`" w:right=`"1417`" w:bottom=`"1417`" w:left=`"1701`" w:header=`"708`" w:footer=`"708`" w:gutter=`"0`"/></w:sectPr></w:body></w:document>"

$stylesXml = "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><w:styles xmlns:w=`"http://schemas.openxmlformats.org/wordprocessingml/2006/main`"><w:style w:type=`"paragraph`" w:default=`"1`" w:styleId=`"Normal`"><w:name w:val=`"Normal`"/><w:qFormat/><w:pPr><w:spacing w:after=`"120`" w:line=`"360`" w:lineRule=`"auto`"/><w:jc w:val=`"both`"/></w:pPr><w:rPr><w:rFonts w:ascii=`"Times New Roman`" w:hAnsi=`"Times New Roman`"/><w:sz w:val=`"24`"/></w:rPr></w:style><w:style w:type=`"paragraph`" w:styleId=`"Title`"><w:name w:val=`"Title`"/><w:pPr><w:jc w:val=`"center`"/><w:spacing w:after=`"240`"/></w:pPr><w:rPr><w:b/><w:rFonts w:ascii=`"Times New Roman`" w:hAnsi=`"Times New Roman`"/><w:sz w:val=`"48`"/></w:rPr></w:style><w:style w:type=`"paragraph`" w:styleId=`"Subtitle`"><w:name w:val=`"Subtitle`"/><w:pPr><w:jc w:val=`"center`"/><w:spacing w:after=`"180`"/></w:pPr><w:rPr><w:rFonts w:ascii=`"Times New Roman`" w:hAnsi=`"Times New Roman`"/><w:sz w:val=`"28`"/></w:rPr></w:style><w:style w:type=`"paragraph`" w:styleId=`"Heading1`"><w:name w:val=`"heading 1`"/><w:basedOn w:val=`"Normal`"/><w:next w:val=`"Normal`"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before=`"240`" w:after=`"160`"/><w:outlineLvl w:val=`"0`"/></w:pPr><w:rPr><w:b/><w:rFonts w:ascii=`"Times New Roman`" w:hAnsi=`"Times New Roman`"/><w:sz w:val=`"32`"/></w:rPr></w:style><w:style w:type=`"paragraph`" w:styleId=`"Heading2`"><w:name w:val=`"heading 2`"/><w:basedOn w:val=`"Normal`"/><w:qFormat/><w:pPr><w:spacing w:before=`"200`" w:after=`"120`"/><w:outlineLvl w:val=`"1`"/></w:pPr><w:rPr><w:b/><w:rFonts w:ascii=`"Times New Roman`" w:hAnsi=`"Times New Roman`"/><w:sz w:val=`"28`"/></w:rPr></w:style><w:style w:type=`"paragraph`" w:styleId=`"Caption`"><w:name w:val=`"Caption`"/><w:basedOn w:val=`"Normal`"/><w:pPr><w:spacing w:after=`"160`"/></w:pPr><w:rPr><w:i/><w:rFonts w:ascii=`"Times New Roman`" w:hAnsi=`"Times New Roman`"/><w:sz w:val=`"20`"/></w:rPr></w:style></w:styles>"

$contentTypes = "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><Types xmlns=`"http://schemas.openxmlformats.org/package/2006/content-types`"><Default Extension=`"rels`" ContentType=`"application/vnd.openxmlformats-package.relationships+xml`"/><Default Extension=`"xml`" ContentType=`"application/xml`"/><Default Extension=`"png`" ContentType=`"image/png`"/><Override PartName=`"/word/document.xml`" ContentType=`"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml`"/><Override PartName=`"/word/styles.xml`" ContentType=`"application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml`"/><Override PartName=`"/docProps/core.xml`" ContentType=`"application/vnd.openxmlformats-package.core-properties+xml`"/><Override PartName=`"/docProps/app.xml`" ContentType=`"application/vnd.openxmlformats-officedocument.extended-properties+xml`"/></Types>"
$rootRels = "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><Relationships xmlns=`"http://schemas.openxmlformats.org/package/2006/relationships`"><Relationship Id=`"rId1`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument`" Target=`"word/document.xml`"/></Relationships>"
$docRels = "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><Relationships xmlns=`"http://schemas.openxmlformats.org/package/2006/relationships`"><Relationship Id=`"rIdStyles`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles`" Target=`"styles.xml`"/>$($rels -join '')</Relationships>"
$core = "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><cp:coreProperties xmlns:cp=`"http://schemas.openxmlformats.org/package/2006/metadata/core-properties`" xmlns:dc=`"http://purl.org/dc/elements/1.1/`" xmlns:dcterms=`"http://purl.org/dc/terms/`" xmlns:dcmitype=`"http://purl.org/dc/dcmitype/`" xmlns:xsi=`"http://www.w3.org/2001/XMLSchema-instance`"><dc:title>Trade Abhyas Mini Project Report</dc:title><dc:creator>Trade Abhyas Project Team</dc:creator><cp:lastModifiedBy>Trade Abhyas Project Team</cp:lastModifiedBy></cp:coreProperties>"
$app = "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><Properties xmlns=`"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties`"><Application>Trade Abhyas Report Generator</Application></Properties>"

Write-Utf8File (Join-Path $tmp "[Content_Types].xml") $contentTypes
Write-Utf8File (Join-Path $tmp "_rels\.rels") $rootRels
Write-Utf8File (Join-Path $tmp "word\document.xml") $documentXml
Write-Utf8File (Join-Path $tmp "word\styles.xml") $stylesXml
Write-Utf8File (Join-Path $tmp "word\_rels\document.xml.rels") $docRels
Write-Utf8File (Join-Path $tmp "docProps\core.xml") $core
Write-Utf8File (Join-Path $tmp "docProps\app.xml") $app
if (Test-Path $docxPath) { Remove-Item $docxPath -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($tmp, $docxPath)
Remove-Item $tmp -Recurse -Force

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (Test-Path $chrome) {
  if (Test-Path $pdfPath) { Remove-Item $pdfPath -Force }
  $htmlUri = ([Uri]$htmlPath).AbsoluteUri
  Start-Process -FilePath $chrome -ArgumentList @("--headless=new","--disable-gpu","--no-sandbox","--print-to-pdf=`"$pdfPath`"",$htmlUri) -Wait -WindowStyle Hidden
} else {
  throw "Chrome not found for PDF export"
}

[ordered]@{
  docx = $docxPath
  pdf = $pdfPath
  source = $sourcePath
  html = $htmlPath
  assets = @("system-architecture.png","database-er.png","order-lifecycle.png")
} | ConvertTo-Json -Depth 3
