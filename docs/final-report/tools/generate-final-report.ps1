param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
)

$ErrorActionPreference = "Stop"

$finalDir = Join-Path $Root "docs\final-report"
$assetsDir = Join-Path $finalDir "assets"
$screensDir = Join-Path $Root "docs\screenshots"
$docxPath = Join-Path $finalDir "Trade_Abhyas_Mini_Project_Report.docx"
$pdfPath = Join-Path $finalDir "Trade_Abhyas_Mini_Project_Report.pdf"
$sourcePath = Join-Path $finalDir "report-source.md"

New-Item -ItemType Directory -Force -Path $finalDir | Out-Null
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

$selectedScreenshots = @(
  "01-login.png",
  "03-dashboard.png",
  "04-stock-search.png",
  "05-stock-detail.png",
  "07-buy-order-ticket.png",
  "09-portfolio.png",
  "11-orders.png",
  "12-transactions.png",
  "13-watchlist.png",
  "18-admin-dashboard.png",
  "20-admin-orders.png",
  "23-mobile-stock-detail.png"
)

foreach ($shot in $selectedScreenshots) {
  $shotPath = Join-Path $screensDir $shot
  if (-not (Test-Path $shotPath)) {
    throw "Missing screenshot: $shotPath"
  }
}

Add-Type -AssemblyName System.Drawing

function New-DiagramCanvas {
  param([int]$Width = 1600, [int]$Height = 900)
  $bmp = New-Object System.Drawing.Bitmap $Width, $Height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::White)
  return @($bmp, $g)
}

function Draw-Box {
  param($g, [int]$X, [int]$Y, [int]$W, [int]$H, [string]$Text, [string]$Fill = "#EAF2F8", [string]$Stroke = "#1F4E79")
  $rect = New-Object System.Drawing.Rectangle $X, $Y, $W, $H
  $textRect = New-Object System.Drawing.RectangleF ([float]$X), ([float]$Y), ([float]$W), ([float]$H)
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($Fill))
  $pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($Stroke), 3)
  $g.FillRectangle($brush, $rect)
  $g.DrawRectangle($pen, $rect)
  $font = New-Object System.Drawing.Font "Arial", 24, ([System.Drawing.FontStyle]::Bold)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(25, 25, 25))
  $g.DrawString($Text, $font, $textBrush, $textRect, $format)
  $brush.Dispose(); $pen.Dispose(); $font.Dispose(); $format.Dispose(); $textBrush.Dispose()
}

function Draw-Arrow {
  param($g, [int]$X1, [int]$Y1, [int]$X2, [int]$Y2, [string]$Text = "")
  $pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#1F4E79"), 4)
  $cap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap 6, 8
  $pen.CustomEndCap = $cap
  $g.DrawLine($pen, $X1, $Y1, $X2, $Y2)
  if ($Text) {
    $font = New-Object System.Drawing.Font "Arial", 18, ([System.Drawing.FontStyle]::Regular)
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#1F4E79"))
    $g.DrawString($Text, $font, $brush, [Math]::Min($X1, $X2) + [Math]::Abs($X2 - $X1) / 2 - 80, [Math]::Min($Y1, $Y2) + [Math]::Abs($Y2 - $Y1) / 2 - 30)
    $font.Dispose(); $brush.Dispose()
  }
  $pen.Dispose(); $cap.Dispose()
}

function Save-Diagram {
  param($bmp, $g, [string]$Path)
  $g.Dispose()
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function Create-SystemArchitectureDiagram {
  $items = New-DiagramCanvas 1600 900
  $bmp = $items[0]; $g = $items[1]
  Draw-Box $g 80 110 380 150 "User Website`nReact + Vite" "#EAF7FF"
  Draw-Box $g 80 620 380 150 "Admin Application`nReact + Vite" "#EAF7FF"
  Draw-Box $g 610 330 390 190 "Express Backend`nREST APIs + Socket.IO" "#EAF2F8"
  Draw-Box $g 1160 330 340 190 "MongoDB Atlas`nApplication Database" "#ECF8EF" "#2D7D46"
  Draw-Box $g 610 80 390 120 "Market Data Services`nYahoo Finance + NSE Catalogue" "#FFF7E6" "#9A6A00"
  Draw-Box $g 610 650 390 120 "Authentication, Trading,`nPortfolio, Alerts, Admin APIs" "#F3EAFE" "#6B3FA0"
  Draw-Arrow $g 460 185 610 395 "REST"
  Draw-Arrow $g 460 695 610 455 "REST"
  Draw-Arrow $g 1000 425 1160 425 "Mongoose"
  Draw-Arrow $g 805 200 805 330 "quotes"
  Draw-Arrow $g 805 650 805 520 "services"
  Save-Diagram $bmp $g (Join-Path $assetsDir "system-architecture.png")
}

function Create-DatabaseDiagram {
  $items = New-DiagramCanvas 1600 950
  $bmp = $items[0]; $g = $items[1]
  Draw-Box $g 650 60 300 110 "users" "#EAF2F8"
  $entities = @(
    @(140,250,"refreshTokens"),
    @(500,250,"orders"),
    @(860,250,"transactions"),
    @(1220,250,"portfolios"),
    @(140,520,"watchlists"),
    @(500,520,"alerts"),
    @(860,520,"competitions"),
    @(1220,520,"instruments")
  )
  foreach ($e in $entities) { Draw-Box $g $e[0] $e[1] 250 105 $e[2] "#F7F9FC" }
  Draw-Arrow $g 705 170 265 250 "owns"
  Draw-Arrow $g 760 170 625 250 "places"
  Draw-Arrow $g 840 170 985 250 "has"
  Draw-Arrow $g 895 170 1345 250 "owns"
  Draw-Arrow $g 705 170 265 520 "owns"
  Draw-Arrow $g 760 170 625 520 "creates"
  Draw-Arrow $g 840 170 985 520 "joins"
  Draw-Arrow $g 1345 520 1345 355 "referenced"
  Draw-Arrow $g 750 305 860 305 "produces"
  Save-Diagram $bmp $g (Join-Path $assetsDir "database-er.png")
}

function Create-OrderLifecycleDiagram {
  $items = New-DiagramCanvas 1500 820
  $bmp = $items[0]; $g = $items[1]
  Draw-Box $g 110 330 220 100 "Pending" "#FFF7E6" "#9A6A00"
  Draw-Box $g 520 170 220 100 "Triggered" "#EAF7FF"
  Draw-Box $g 930 170 220 100 "Executed" "#ECF8EF" "#2D7D46"
  Draw-Box $g 520 500 220 100 "Cancelled" "#F3F4F6" "#6B7280"
  Draw-Box $g 930 500 220 100 "Rejected" "#FDECEC" "#B42318"
  Draw-Arrow $g 330 380 520 220 "stop reached"
  Draw-Arrow $g 740 220 930 220 "limit ok"
  Draw-Arrow $g 330 380 930 220 "market/limit ok"
  Draw-Arrow $g 330 395 520 545 "cancel"
  Draw-Arrow $g 330 410 930 545 "invalid"
  Save-Diagram $bmp $g (Join-Path $assetsDir "order-lifecycle.png")
}

Create-SystemArchitectureDiagram
Create-DatabaseDiagram
Create-OrderLifecycleDiagram

$source = @"
# Trade Abhyas Mini Project Report

Editable college placeholders:

- <COLLEGE NAME>
- <UNIVERSITY NAME>
- <DEPARTMENT NAME>
- <STUDENT NAME>
- <ROLL NUMBER>
- <REGISTER NUMBER>
- <GUIDE NAME>
- <GUIDE DESIGNATION>
- <HEAD OF DEPARTMENT>
- <ACADEMIC YEAR>
- <PLACE>
- <DATE>

This report was generated from the verified Trade Abhyas documentation in docs/ and screenshot evidence in docs/screenshots/.

The report covers:

1. Introduction
2. Problem Statement and Objectives
3. Existing and Proposed System
4. Requirements and Technology Stack
5. System Architecture
6. Module Description
7. Database Design
8. Trading Engine Design
9. Portfolio and Financial Accounting
10. Concurrency and Financial Integrity
11. Security Design
12. Implementation Screenshots
13. Testing and Results
14. Limitations and Future Scope
15. Conclusion
16. References

No real-money brokerage capability, real stock-exchange order execution, derivatives, margin trading, production deployment, or production transactional email delivery is claimed.
"@
Set-Content -Path $sourcePath -Value $source -Encoding UTF8

$word = $null
$doc = $null

function Add-Paragraph {
  param(
    [string]$Text,
    [string]$Style = "Normal",
    [int]$Align = 3,
    [bool]$Bold = $false,
    [bool]$Italic = $false
  )
  $script:selection.Style = $Style
  $script:selection.ParagraphFormat.Alignment = $Align
  $script:selection.Font.Bold = $(if ($Bold) { 1 } else { 0 })
  $script:selection.Font.Italic = $(if ($Italic) { 1 } else { 0 })
  $script:selection.TypeText($Text)
  $script:selection.TypeParagraph()
  $script:selection.Font.Bold = 0
  $script:selection.Font.Italic = 0
}

function Add-BlankLine { $script:selection.TypeParagraph() }

function Add-PageBreak { $script:selection.InsertBreak(7) }

function Add-Bullets {
  param([string[]]$Items)
  foreach ($item in $Items) {
    $script:selection.Style = "Normal"
    $script:selection.ParagraphFormat.Alignment = 3
    $script:selection.TypeText("- $item")
    $script:selection.TypeParagraph()
  }
}

function Add-Numbered {
  param([string[]]$Items)
  $i = 1
  foreach ($item in $Items) {
    $script:selection.Style = "Normal"
    $script:selection.ParagraphFormat.Alignment = 3
    $script:selection.TypeText("$i. $item")
    $script:selection.TypeParagraph()
    $i++
  }
}

function Add-Table {
  param([string]$Title, [string[]]$Headers, [object[]]$Rows)
  Add-Paragraph $Title "Caption" 0 $true
  $range = $script:selection.Range
  $table = $script:doc.Tables.Add($range, $Rows.Count + 1, $Headers.Count)
  $table.Borders.Enable = 1
  $table.Range.Font.Name = "Times New Roman"
  $table.Range.Font.Size = 10
  $table.Rows.Item(1).Range.Bold = 1
  $table.Rows.Item(1).Shading.BackgroundPatternColor = 15132390
  for ($c = 1; $c -le $Headers.Count; $c++) {
    $table.Cell(1, $c).Range.Text = $Headers[$c - 1]
  }
  for ($r = 0; $r -lt $Rows.Count; $r++) {
    $row = $Rows[$r]
    for ($c = 0; $c -lt $Headers.Count; $c++) {
      $table.Cell($r + 2, $c + 1).Range.Text = [string]$row[$c]
    }
  }
  $table.AutoFitBehavior(2)
  $script:selection.SetRange($table.Range.End, $table.Range.End)
  $script:selection.TypeParagraph()
}

function Add-ImageFigure {
  param([string]$ImagePath, [string]$Caption, [double]$WidthPoints = 450)
  if (-not (Test-Path $ImagePath)) { throw "Missing image: $ImagePath" }
  $script:selection.ParagraphFormat.Alignment = 1
  $shape = $script:selection.InlineShapes.AddPicture($ImagePath, $false, $true)
  $shape.LockAspectRatio = -1
  if ($shape.Width -gt $WidthPoints) { $shape.Width = $WidthPoints }
  Add-Paragraph $Caption "Caption" 1 $false $true
}

try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Add()
  $script:doc = $doc
  $script:selection = $word.Selection

  $section = $doc.Sections.Item(1)
  $section.PageSetup.PaperSize = 7
  $section.PageSetup.TopMargin = $word.CentimetersToPoints(2.5)
  $section.PageSetup.BottomMargin = $word.CentimetersToPoints(2.5)
  $section.PageSetup.LeftMargin = $word.CentimetersToPoints(3.0)
  $section.PageSetup.RightMargin = $word.CentimetersToPoints(2.5)
  $section.PageSetup.DifferentFirstPageHeaderFooter = $true

  $normal = $doc.Styles.Item("Normal")
  $normal.Font.Name = "Times New Roman"
  $normal.Font.Size = 12
  $normal.ParagraphFormat.LineSpacingRule = 1
  $normal.ParagraphFormat.LineSpacing = 18
  $normal.ParagraphFormat.SpaceAfter = 6
  $normal.ParagraphFormat.Alignment = 3

  $doc.Styles.Item("Heading 1").Font.Name = "Times New Roman"
  $doc.Styles.Item("Heading 1").Font.Size = 16
  $doc.Styles.Item("Heading 1").Font.Bold = 1
  $doc.Styles.Item("Heading 1").Font.Color = 0
  $doc.Styles.Item("Heading 2").Font.Name = "Times New Roman"
  $doc.Styles.Item("Heading 2").Font.Size = 14
  $doc.Styles.Item("Heading 2").Font.Bold = 1
  $doc.Styles.Item("Heading 2").Font.Color = 0
  $doc.Styles.Item("Heading 3").Font.Name = "Times New Roman"
  $doc.Styles.Item("Heading 3").Font.Size = 12
  $doc.Styles.Item("Heading 3").Font.Bold = 1
  $doc.Styles.Item("Heading 3").Font.Color = 0
  $doc.Styles.Item("Caption").Font.Name = "Times New Roman"
  $doc.Styles.Item("Caption").Font.Size = 10
  $doc.Styles.Item("Caption").Font.Italic = 1

  $header = $section.Headers.Item(1).Range
  $header.Text = "Trade Abhyas - Virtual Stock Trading Platform"
  $header.Font.Name = "Times New Roman"
  $header.Font.Size = 10
  $header.ParagraphFormat.Alignment = 1

  $footerRange = $section.Footers.Item(1).Range
  $footerRange.ParagraphFormat.Alignment = 1
  $footerRange.Text = "Page "
  $footerRange.Collapse(0)
  $footerRange.Fields.Add($footerRange, 33) | Out-Null

  Add-BlankLine; Add-BlankLine; Add-BlankLine
  Add-Paragraph "TRADE ABHYAS" "Title" 1 $true
  Add-Paragraph "Virtual Stock Trading Platform" "Subtitle" 1
  Add-BlankLine
  Add-Paragraph "A Mini Project Report" "Normal" 1 $true
  Add-Paragraph "Submitted in partial fulfillment of the requirements for the award of the degree of" "Normal" 1
  Add-Paragraph "Bachelor of Technology" "Normal" 1 $true
  Add-Paragraph "in" "Normal" 1
  Add-Paragraph "<DEPARTMENT NAME>" "Normal" 1 $true
  Add-BlankLine; Add-BlankLine
  Add-Paragraph "Submitted by" "Normal" 1
  Add-Paragraph "<STUDENT NAME>" "Normal" 1 $true
  Add-Paragraph "Roll Number: <ROLL NUMBER>" "Normal" 1
  Add-Paragraph "Register Number: <REGISTER NUMBER>" "Normal" 1
  Add-BlankLine
  Add-Paragraph "Under the guidance of" "Normal" 1
  Add-Paragraph "<GUIDE NAME>" "Normal" 1 $true
  Add-Paragraph "<GUIDE DESIGNATION>" "Normal" 1
  Add-BlankLine; Add-BlankLine
  Add-Paragraph "<COLLEGE NAME>" "Normal" 1 $true
  Add-Paragraph "<UNIVERSITY NAME>" "Normal" 1
  Add-Paragraph "<ACADEMIC YEAR>" "Normal" 1
  Add-PageBreak

  Add-Paragraph "CERTIFICATE" "Heading 1" 1
  Add-Paragraph "This is to certify that the Mini Project report entitled `"Trade Abhyas - Virtual Stock Trading Platform`" is a bonafide work carried out by <STUDENT NAME>, Roll Number <ROLL NUMBER>, Register Number <REGISTER NUMBER>, in partial fulfillment of the requirements for the award of the degree of Bachelor of Technology in <DEPARTMENT NAME> during the academic year <ACADEMIC YEAR>."
  Add-Paragraph "The project work has been carried out under the guidance and supervision of <GUIDE NAME>, <GUIDE DESIGNATION>, and is submitted to <COLLEGE NAME>, affiliated to <UNIVERSITY NAME>."
  Add-BlankLine; Add-BlankLine; Add-BlankLine
  Add-Table "Certificate Signature Fields" @("Role", "Name and Signature") @(
    @("Guide", "<GUIDE NAME>"),
    @("Head of Department", "<HEAD OF DEPARTMENT>"),
    @("External Examiner", "<EXAMINER NAME>"),
    @("Place and Date", "<PLACE>, <DATE>")
  )
  Add-PageBreak

  Add-Paragraph "DECLARATION" "Heading 1" 1
  Add-Paragraph "I hereby declare that the Mini Project report entitled `"Trade Abhyas - Virtual Stock Trading Platform`" submitted to <COLLEGE NAME> is a record of original work carried out by me under the guidance of <GUIDE NAME>. This work is submitted in partial fulfillment of the requirements for the award of the Bachelor of Technology degree."
  Add-Paragraph "I further declare that this report has not been submitted previously for the award of any degree or diploma. All information, technologies, and references used in the project have been acknowledged appropriately."
  Add-BlankLine; Add-BlankLine; Add-BlankLine
  Add-Paragraph "Signature of Student: __________________________" "Normal" 0
  Add-Paragraph "Name: <STUDENT NAME>" "Normal" 0
  Add-Paragraph "Date: <DATE>" "Normal" 0
  Add-PageBreak

  Add-Paragraph "ACKNOWLEDGEMENT" "Heading 1" 1
  Add-Paragraph "I express my sincere gratitude to <COLLEGE NAME> and <DEPARTMENT NAME> for providing the opportunity to complete this Mini Project. I am thankful to <GUIDE NAME>, <GUIDE DESIGNATION>, for valuable guidance, encouragement, and support throughout the project."
  Add-Paragraph "I also thank <HEAD OF DEPARTMENT>, faculty members, classmates, friends, and family for their cooperation and motivation. This project helped me understand full-stack development, virtual trading workflows, secure authentication, financial accounting, and testing practices in a practical software system."
  Add-PageBreak

  Add-Paragraph "ABSTRACT" "Heading 1" 1
  Add-Paragraph "Trade Abhyas is a virtual stock trading platform developed as a B.Tech Mini Project to help students and beginner investors understand stock-market workflows without risking real money. The project addresses the need for a safe paper-trading environment where users can search NSE equity instruments, view market information, place simulated orders, and track portfolio performance using virtual funds."
  Add-Paragraph "The system uses a MERN-style architecture with a React user website, a separate React admin application, a Node.js and Express backend, MongoDB Atlas persistence, JWT authentication, refresh-token sessions, and Socket.IO real-time updates. The trading engine supports Market, Limit, Stop-Loss, and Stop-Limit virtual orders. It includes NSE market-session handling, stale quote protection, order cancellation, virtual balance mutation, weighted average price calculation, realized and unrealized P&L, and portfolio synchronization."
  Add-Paragraph "The platform also provides watchlists, alerts, positions, transactions, competitions, profile settings, password recovery, and admin monitoring for users, orders, transactions, and competitions. Security features include bcrypt password hashing, HTTP-only cookies, role-based admin authorization, CORS allowlists, and hashed password-reset tokens. The order service test suite completed with 10 passed tests and 0 failures, and the financial integrity audit reported zero issues across executed orders, transactions, balances, holdings, and ownership checks. Trade Abhyas therefore demonstrates a complete, educational, and technically consistent virtual trading platform suitable for academic evaluation."
  Add-PageBreak

  Add-Paragraph "TABLE OF CONTENTS" "Heading 1" 1
  Add-Table "Table of Contents" @("Section", "Title") @(
    @("Preliminary", "Title Page, Certificate, Declaration, Acknowledgement, Abstract, Lists"),
    @("Chapter 1", "Introduction"),
    @("Chapter 2", "Problem Statement and Objectives"),
    @("Chapter 3", "Existing and Proposed System"),
    @("Chapter 4", "Requirements and Technology Stack"),
    @("Chapter 5", "System Architecture"),
    @("Chapter 6", "Module Description"),
    @("Chapter 7", "Database Design"),
    @("Chapter 8", "Trading Engine Design"),
    @("Chapter 9", "Portfolio and Financial Accounting"),
    @("Chapter 10", "Concurrency and Financial Integrity"),
    @("Chapter 11", "Security Design"),
    @("Chapter 12", "Implementation Screenshots"),
    @("Chapter 13", "Testing and Results"),
    @("Chapter 14", "Limitations and Future Scope"),
    @("Chapter 15", "Conclusion"),
    @("References", "Technology and platform references")
  )
  Add-PageBreak

  Add-Paragraph "LIST OF FIGURES" "Heading 1" 1
  Add-Numbered @(
    "Figure 5.1 - System Architecture",
    "Figure 7.1 - Database ER Diagram",
    "Figure 8.1 - Order Lifecycle",
    "Figure 12.1 - Trade Abhyas Login Interface",
    "Figure 12.2 - User Dashboard",
    "Figure 12.3 - NSE Stock Search",
    "Figure 12.4 - Stock Detail and Market Information",
    "Figure 12.5 - Virtual Buy Order Interface",
    "Figure 12.6 - User Portfolio",
    "Figure 12.7 - Order Lifecycle and History",
    "Figure 12.8 - Executed Transaction History",
    "Figure 12.9 - Watchlist",
    "Figure 12.10 - Administrative Dashboard",
    "Figure 12.11 - Administrative Order Monitoring",
    "Figure 12.12 - Mobile Responsive Stock Detail"
  )
  Add-PageBreak

  Add-Paragraph "LIST OF TABLES" "Heading 1" 1
  Add-Numbered @(
    "Table 3.1 - Existing and Proposed System Comparison",
    "Table 4.1 - Functional Requirements",
    "Table 4.2 - Software Requirements",
    "Table 6.1 - Module Summary",
    "Table 7.1 - Database Collections",
    "Table 10.1 - Order Service Test Result",
    "Table 13.1 - Testing Summary"
  )
  Add-PageBreak

  Add-Paragraph "ABBREVIATIONS" "Heading 1" 1
  Add-Table "Abbreviations Used in the Report" @("Abbreviation", "Meaning") @(
    @("API", "Application Programming Interface"),
    @("CORS", "Cross-Origin Resource Sharing"),
    @("ER", "Entity Relationship"),
    @("JWT", "JSON Web Token"),
    @("MERN", "MongoDB, Express.js, React, Node.js"),
    @("NSE", "National Stock Exchange"),
    @("P&L", "Profit and Loss"),
    @("UI", "User Interface")
  )
  Add-PageBreak

  Add-Paragraph "CHAPTER 1 - INTRODUCTION" "Heading 1" 1
  Add-Paragraph "1.1 Background" "Heading 2" 0
  Add-Paragraph "Stock-market education requires both conceptual learning and practical exposure. Many beginners understand definitions such as buy, sell, portfolio, and profit/loss, but they do not get a safe place to observe order behavior and account changes. Trade Abhyas solves this by offering a virtual trading environment in which all financial values are simulated."
  Add-Paragraph "1.2 Need for Virtual Stock Trading" "Heading 2" 0
  Add-Paragraph "Students and beginner investors need a platform where they can practice trading without real-money risk. A virtual trading platform allows them to learn market terminology, order types, portfolio accounting, and risk discipline using paper trades."
  Add-Paragraph "1.3 Paper Trading Concept" "Heading 2" 0
  Add-Paragraph "Paper trading means placing simulated trades using virtual funds. It helps users understand the flow of a trading platform without connecting to a real broker or exchange execution system."
  Add-Paragraph "1.4 Project Overview" "Heading 2" 0
  Add-Paragraph "Trade Abhyas provides user registration, login, stock search, market information, order placement, portfolio tracking, positions, transactions, watchlist, alerts, competitions, settings, and an admin monitoring system."
  Add-Paragraph "1.5 Scope" "Heading 2" 0
  Add-Paragraph "The project scope is limited to educational paper trading. It does not perform real stock-exchange execution, bank settlement, demat account integration, PAN verification, margin trading, or derivatives trading."
  Add-Paragraph "1.6 Target Users" "Heading 2" 0
  Add-Bullets @("Students learning stock-market basics.", "Beginner investors practicing without real funds.", "Administrators monitoring platform activity.")
  Add-PageBreak

  Add-Paragraph "CHAPTER 2 - PROBLEM STATEMENT AND OBJECTIVES" "Heading 1" 1
  Add-Paragraph "2.1 Problem Statement" "Heading 2" 0
  Add-Paragraph "Students and beginners often lack a practical platform to learn stock-market mechanics safely. Static study material and simple price-monitoring applications do not show realistic order lifecycle, portfolio changes, and financial integrity rules."
  Add-Paragraph "2.2 Motivation" "Heading 2" 0
  Add-Paragraph "The motivation behind Trade Abhyas is to build a practical and secure learning platform that provides realistic trading workflows using virtual money."
  Add-Paragraph "2.3 Primary Objectives" "Heading 2" 0
  Add-Bullets @("Simulate equity trading using virtual capital.", "Support Market, Limit, Stop-Loss, and Stop-Limit orders.", "Maintain accurate portfolio, balance, position, and transaction records.", "Provide NSE instrument search and market-data-based stock information.", "Protect trading integrity under concurrent order processing.")
  Add-Paragraph "2.4 Secondary Objectives" "Heading 2" 0
  Add-Bullets @("Provide watchlist and price alert features.", "Provide competitions and leaderboard-style learning features.", "Provide a separate role-protected admin panel.", "Support password recovery and secure user sessions.", "Prepare the project for local validation and future production deployment.")
  Add-Paragraph "2.5 Project Scope" "Heading 2" 0
  Add-Paragraph "The scope is to build a full-stack virtual stock trading application. The project intentionally excludes real-money trading, production deployment, real bank/payment details, and broker-grade compliance workflows."
  Add-PageBreak

  Add-Paragraph "CHAPTER 3 - EXISTING AND PROPOSED SYSTEM" "Heading 1" 1
  Add-Paragraph "3.1 Existing/Common Approaches" "Heading 2" 0
  Add-Paragraph "Common approaches include static learning websites, basic market-price trackers, and simplified paper-trading demos. These approaches often lack a realistic order lifecycle, transaction-safe accounting, concurrency protection, and administrator monitoring."
  Add-Paragraph "3.2 Proposed Trade Abhyas System" "Heading 2" 0
  Add-Paragraph "Trade Abhyas proposes a full-stack virtual trading platform with market-linked NSE instruments, virtual capital, realistic order types, persistent holdings, P&L calculation, real-time updates, admin monitoring, and audit-based financial integrity checks."
  Add-Table "Table 3.1 - Existing and Proposed System Comparison" @("Aspect", "Existing/Common Systems", "Trade Abhyas") @(
    @("Learning mode", "Mostly static or simplified", "Interactive paper trading"),
    @("Order lifecycle", "Limited or absent", "Market, Limit, Stop-Loss, Stop-Limit"),
    @("Portfolio accounting", "Basic or unavailable", "Balance, holdings, weighted average, P&L"),
    @("Administration", "Often not included", "Separate admin dashboard"),
    @("Integrity controls", "Usually limited", "Transactions, locks, retries, audit checks"),
    @("Real-money execution", "Not applicable", "Not included; virtual only")
  )
  Add-Paragraph "3.3 Advantages" "Heading 2" 0
  Add-Bullets @("Risk-free trading practice.", "More realistic virtual order lifecycle.", "Persistent portfolio and transaction history.", "Secure authentication and role-based admin separation.", "Useful for academic demonstration and viva explanation.")
  Add-PageBreak

  Add-Paragraph "CHAPTER 4 - REQUIREMENTS AND TECHNOLOGY STACK" "Heading 1" 1
  Add-Table "Table 4.1 - Functional Requirements" @("Requirement", "Description") @(
    @("Authentication", "Users and admins can register/login/logout and maintain sessions."),
    @("Stock search", "Users can search supported NSE equity instruments."),
    @("Trading", "Users can place Market, Limit, Stop-Loss, and Stop-Limit virtual orders."),
    @("Portfolio", "The system tracks holdings, average price, current value, and P&L."),
    @("Orders/Transactions", "Users can view order history and executed transactions."),
    @("Watchlist/Alerts", "Users can track selected stocks and create price alerts."),
    @("Admin panel", "Admins can monitor users, orders, transactions, and competitions.")
  )
  Add-Paragraph "4.2 Non-Functional Requirements" "Heading 2" 0
  Add-Bullets @("Security through hashed passwords, HTTP-only cookies, and role checks.", "Reliability through transaction-safe execution and audit checks.", "Consistency across balance, portfolio, order, and transaction data.", "Maintainability through separated frontend, backend, service, and model layers.", "Responsiveness across desktop, tablet, and mobile layouts.")
  Add-Paragraph "4.3 Hardware Requirements" "Heading 2" 0
  Add-Bullets @("Development laptop or desktop with a modern browser.", "Stable internet connection for market data and database access.", "Sufficient memory to run backend, website, admin app, and database client connections.")
  Add-Table "Table 4.2 - Software Requirements" @("Layer", "Technology") @(
    @("Frontend", "React, Vite, Tailwind CSS"),
    @("Backend", "Node.js, Express.js"),
    @("Database", "MongoDB Atlas, Mongoose"),
    @("Authentication", "JWT, refresh-token sessions, bcrypt"),
    @("Real time", "Socket.IO"),
    @("Market data", "Yahoo Finance based market utility and NSE instrument catalogue"),
    @("Email", "Resend-compatible password reset email integration, production credentials deferred")
  )
  Add-PageBreak

  Add-Paragraph "CHAPTER 5 - SYSTEM ARCHITECTURE" "Heading 1" 1
  Add-Paragraph "Trade Abhyas uses a MERN-style architecture with two React applications and one Express backend. The user website communicates with the backend through REST APIs and Socket.IO. The admin application communicates with the same backend through REST APIs and is protected by admin authorization. MongoDB Atlas stores persistent application data."
  Add-ImageFigure (Join-Path $assetsDir "system-architecture.png") "Figure 5.1 - System Architecture" 430
  Add-Paragraph "The backend contains authentication, trading, market data, portfolio, alerts, admin APIs, and real-time services. External market information is used only for simulation and display; virtual orders are stored and processed inside the application database."
  Add-PageBreak

  Add-Paragraph "CHAPTER 6 - MODULE DESCRIPTION" "Heading 1" 1
  Add-Table "Table 6.1 - Module Summary" @("Module", "Purpose", "Input", "Output") @(
    @("Authentication", "Secure access", "Credentials", "Authenticated session"),
    @("User Account", "Profile maintenance", "Name, email, mobile, preferences", "Updated profile"),
    @("NSE Instrument Search", "Stock discovery", "Search query", "Matching symbols"),
    @("Market Data", "Quote/history display", "Symbol/timeframe", "Market information"),
    @("Stock Detail and Charts", "Stock analysis screen", "Selected symbol", "Quote, chart, order panel"),
    @("Trading/Orders", "Virtual order placement", "Symbol, side, quantity, type", "Order status"),
    @("Portfolio", "Holding management", "Executed orders", "Holdings and value"),
    @("Positions", "Current exposure", "Holdings and prices", "P&L view"),
    @("Transactions", "Executed trade ledger", "Executed order", "Transaction record"),
    @("Watchlist", "Track selected stocks", "Symbols/lists", "Personal watchlist"),
    @("Alerts", "Price-level tracking", "Symbol, target, condition", "Alert status"),
    @("Socket.IO", "Real-time updates", "Authenticated subscription", "Live events"),
    @("Competitions", "Virtual contests", "Competition and participant data", "Standings"),
    @("Administration", "Monitoring", "Admin API requests", "Admin dashboards"),
    @("Password Recovery", "Account recovery", "Email/reset token", "Reset password")
  )
  Add-Paragraph "Each module is implemented around clear data ownership boundaries. User-facing screens do not mutate financial records directly. Trading changes are routed through backend services to maintain consistency."
  Add-PageBreak

  Add-Paragraph "CHAPTER 7 - DATABASE DESIGN" "Heading 1" 1
  Add-Paragraph "MongoDB stores application data through Mongoose models. The database stores only virtual trading and account data needed by the platform. It does not store bank account details, PAN card details, demat credentials, or real-money payment data."
  Add-ImageFigure (Join-Path $assetsDir "database-er.png") "Figure 7.1 - Database ER Diagram" 430
  Add-Table "Table 7.1 - Database Collections" @("Collection", "Purpose", "Important Constraints") @(
    @("users", "Account, role, balance, profile, reset fields", "Unique email"),
    @("refreshTokens", "Hashed persistent sessions", "Unique token hash"),
    @("instruments", "NSE equity metadata", "Exchange plus trading symbol uniqueness"),
    @("orders", "Virtual order lifecycle", "Status and processing-token indexes"),
    @("transactions", "Executed trade ledger", "Unique transaction per order"),
    @("portfolios", "Active holdings", "Unique user plus symbol"),
    @("watchlists", "Saved symbols/lists", "One watchlist document per user"),
    @("alerts", "Price alerts", "User plus symbol and condition records"),
    @("competitions", "Simulated contests", "Participant records and status")
  )
  Add-PageBreak

  Add-Paragraph "CHAPTER 8 - TRADING ENGINE DESIGN" "Heading 1" 1
  Add-Paragraph "The trading engine simulates stock order execution using virtual funds and holdings. It supports Market, Limit, Stop-Loss, and Stop-Limit orders. The engine checks market session, quote validity, user funds, user holdings, and order lifecycle conditions before changing financial records."
  Add-ImageFigure (Join-Path $assetsDir "order-lifecycle.png") "Figure 8.1 - Order Lifecycle" 430
  Add-Paragraph "8.1 Market Order" "Heading 2" 0
  Add-Paragraph "A valid Market order executes during active market hours when an executable quote is available. If the market is closed, eligible orders remain pending."
  Add-Paragraph "8.2 Limit Order" "Heading 2" 0
  Add-Paragraph "A Limit order executes only when the market price satisfies the configured limit condition. Otherwise, it remains pending."
  Add-Paragraph "8.3 Stop-Loss" "Heading 2" 0
  Add-Paragraph "A Stop-Loss order remains pending until the trigger price is reached. After triggering, it behaves as a market-style virtual order."
  Add-Paragraph "8.4 Stop-Limit" "Heading 2" 0
  Add-Paragraph "A Stop-Limit order moves from Pending to Triggered when the trigger condition is met. It executes only when the limit price condition is also satisfied."
  Add-Paragraph "8.5 Market Session and Quote Protection" "Heading 2" 0
  Add-Bullets @("Timezone: Asia/Kolkata.", "Session: 09:15 to 15:30 on weekdays.", "Weekends and configured NSE holidays are treated as closed.", "Stale, missing, invalid, unavailable, or mismatched quotes are rejected or skipped.", "Users can cancel pending or triggered orders.")
  Add-PageBreak

  Add-Paragraph "CHAPTER 9 - PORTFOLIO AND FINANCIAL ACCOUNTING" "Heading 1" 1
  Add-Paragraph "Portfolio accounting is updated only after an order executes. A BUY order debits virtual cash and increases holdings. A SELL order credits virtual cash and reduces or closes holdings."
  Add-Paragraph "9.1 Weighted Average Price" "Heading 2" 0
  Add-Paragraph "New Average Price = ((Old Quantity x Old Average Price) + (New Quantity x Buy Price)) / (Old Quantity + New Quantity)"
  Add-Paragraph "9.2 Unrealized P&L" "Heading 2" 0
  Add-Paragraph "Unrealized P&L = (Current Market Price - Average Price) x Quantity"
  Add-Paragraph "9.3 Realized P&L" "Heading 2" 0
  Add-Paragraph "Realized P&L is calculated when a SELL order executes. The implemented formula is: Realized P&L = (Sell Price - Average Buy Price) x Sold Quantity."
  Add-Paragraph "9.4 Partial and Full Selling" "Heading 2" 0
  Add-Paragraph "Partial selling reduces the holding quantity while retaining the existing average buy price for the remaining holding. Full selling removes the holding row and records the transaction history."
  Add-Paragraph "9.5 Synchronization" "Heading 2" 0
  Add-Paragraph "Balance, portfolio, order, and transaction changes are handled together by backend services so the visible account state remains consistent."
  Add-PageBreak

  Add-Paragraph "CHAPTER 10 - CONCURRENCY AND FINANCIAL INTEGRITY" "Heading 1" 1
  Add-Paragraph "Trading systems must protect users from duplicate execution, negative balances, and negative holdings. Trade Abhyas includes concurrency controls in the virtual order engine."
  Add-Bullets @("MongoDB transactions group order, transaction, balance, and portfolio changes.", "Atomic balance mutation prevents overspending during concurrent BUY orders.", "Latest holding revalidation prevents overselling during concurrent SELL orders.", "Processing tokens prevent duplicate order claims.", "Stale processing recovery allows stuck claims to be retried safely.", "Bounded retry logic handles transient transaction errors.", "A unique transaction-per-order rule prevents duplicate transaction records.")
  Add-Table "Table 10.1 - Order Service Test Result" @("Metric", "Result") @(
    @("Total tests", "10"),
    @("Passed", "10"),
    @("Failed", "0"),
    @("Coverage", "Market, Limit, Stop-Loss, Stop-Limit, cancellation, rejected orders, concurrent BUY/SELL, duplicate processing, stale recovery")
  )
  Add-PageBreak

  Add-Paragraph "CHAPTER 11 - SECURITY DESIGN" "Heading 1" 1
  Add-Paragraph "Security is implemented across authentication, authorization, session handling, input validation, and deployment configuration."
  Add-Bullets @("Passwords are hashed using bcrypt before storage.", "JWT access tokens and refresh sessions are stored through HTTP-only cookies.", "Refresh tokens are stored as hashes in the database.", "Admin APIs require authenticated users with the admin role.", "Password reset uses hashed reset tokens, expiry, and session revocation after reset.", "CORS is configured through allowed frontend origins.", "Production cookie configuration supports secure and SameSite settings.", "Secrets such as database strings, JWT secrets, and email provider keys are supplied through environment variables.")
  Add-Paragraph "Because Trade Abhyas is a virtual trading platform, it does not ask for bank credentials, PAN card details, demat account details, brokerage credentials, UPI information, or real-money settlement data."
  Add-PageBreak

  Add-Paragraph "CHAPTER 12 - IMPLEMENTATION SCREENSHOTS" "Heading 1" 1
  $figs = @(
    @("01-login.png", "Figure 12.1 - Trade Abhyas Login Interface"),
    @("03-dashboard.png", "Figure 12.2 - User Dashboard"),
    @("04-stock-search.png", "Figure 12.3 - NSE Stock Search"),
    @("05-stock-detail.png", "Figure 12.4 - Stock Detail and Market Information"),
    @("07-buy-order-ticket.png", "Figure 12.5 - Virtual Buy Order Interface"),
    @("09-portfolio.png", "Figure 12.6 - User Portfolio"),
    @("11-orders.png", "Figure 12.7 - Order Lifecycle and History"),
    @("12-transactions.png", "Figure 12.8 - Executed Transaction History"),
    @("13-watchlist.png", "Figure 12.9 - Watchlist"),
    @("18-admin-dashboard.png", "Figure 12.10 - Administrative Dashboard"),
    @("20-admin-orders.png", "Figure 12.11 - Administrative Order Monitoring"),
    @("23-mobile-stock-detail.png", "Figure 12.12 - Mobile Responsive Stock Detail")
  )
  foreach ($fig in $figs) {
    $width = 450
    if ($fig[0] -eq "23-mobile-stock-detail.png") { $width = 230 }
    Add-ImageFigure (Join-Path $screensDir $fig[0]) $fig[1] $width
    Add-PageBreak
  }

  Add-Paragraph "CHAPTER 13 - TESTING AND RESULTS" "Heading 1" 1
  Add-Paragraph "Testing covered authentication, admin authorization, trading behavior, concurrency, audit checks, local API flows, Socket.IO behavior, watchlist, alerts, password reset, and frontend builds."
  Add-Table "Table 13.1 - Testing Summary" @("Area", "Verified Result") @(
    @("Authentication", "Registration, login, invalid login, session persistence, refresh, logout"),
    @("Admin authorization", "Admin authenticated -> 200; normal user -> 403; logged out -> 401"),
    @("Trading", "BUY, SELL, Limit, Stop-Loss, Stop-Limit, oversell, insufficient balance, market closed, cancellation"),
    @("Concurrency", "10/10 order-service tests passed"),
    @("Financial audit", "Zero issues across executed orders, transactions, balances, holdings, duplicates, ownership, and status checks"),
    @("Local E2E", "Auth, search, quote/chart, BUY/SELL, portfolio, orders, transactions, Socket.IO, watchlist, alerts, password reset, admin authorization")
  )
  Add-Paragraph "13.1 Financial Integrity Audit Result" "Heading 2" 0
  Add-Bullets @("Executed orders without transactions: 0", "Transactions without valid executed orders: 0", "Duplicate transactions: 0", "Negative balances: 0", "Negative holdings: 0", "Duplicate holdings: 0", "Portfolio/position mismatches: 0", "Invalid financial mutations: 0", "Invalid symbols: 0", "Ownership mismatches: 0", "Status issues: 0")
  Add-PageBreak

  Add-Paragraph "CHAPTER 14 - LIMITATIONS AND FUTURE SCOPE" "Heading 1" 1
  Add-Paragraph "14.1 Current Limitations" "Heading 2" 0
  Add-Bullets @("Paper trading only.", "No real stock exchange execution.", "NSE equity-focused scope.", "No derivatives, margin, or leverage.", "Dependence on third-party market data.", "Quote timing may differ from exchange-grade feeds.", "NSE holiday environment configuration is required.", "Production deployment is deferred.", "Production transactional-email credentials are deferred.")
  Add-Paragraph "14.2 Future Scope" "Heading 2" 0
  Add-Bullets @("Production deployment.", "Transactional email configuration.", "Mobile application.", "Advanced analytics and portfolio insights.", "Expanded competition features.", "Educational lessons and guided learning modules.", "Additional market segments.", "Improved market-data infrastructure.")
  Add-PageBreak

  Add-Paragraph "CHAPTER 15 - CONCLUSION" "Heading 1" 1
  Add-Paragraph "Trade Abhyas successfully demonstrates a complete virtual stock trading platform suitable for a B.Tech Mini Project. It combines realistic paper trading workflows, NSE market information, secure authentication, realistic order lifecycles, accurate portfolio accounting, real-time updates, financial integrity checks, concurrency-safe execution, and administrative monitoring."
  Add-Paragraph "The project avoids real-money brokerage claims and remains focused on educational paper trading. Testing and audit results confirm that the core trading flow is technically consistent and ready for academic demonstration. With final college-specific placeholders replaced and formatting adjusted as required by the institution, the report can be submitted for evaluation."
  Add-PageBreak

  Add-Paragraph "REFERENCES" "Heading 1" 1
  Add-Numbered @(
    "React Documentation - https://react.dev/",
    "Vite Documentation - https://vitejs.dev/",
    "Node.js Documentation - https://nodejs.org/",
    "Express.js Documentation - https://expressjs.com/",
    "MongoDB Documentation - https://www.mongodb.com/docs/",
    "Mongoose Documentation - https://mongoosejs.com/docs/",
    "Socket.IO Documentation - https://socket.io/docs/",
    "JSON Web Token Introduction - https://jwt.io/introduction",
    "bcrypt package documentation - https://www.npmjs.com/package/bcryptjs",
    "National Stock Exchange of India - https://www.nseindia.com/",
    "Yahoo Finance market data source used through the project market utility"
  )

  $doc.Fields.Update() | Out-Null
  $doc.SaveAs2($docxPath, 16)
  $doc.ExportAsFixedFormat($pdfPath, 17)
}
finally {
  if ($doc -ne $null) { $doc.Close($false) | Out-Null }
  if ($word -ne $null) { $word.Quit() | Out-Null }
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}

$result = [ordered]@{
  docx = $docxPath
  pdf = $pdfPath
  source = $sourcePath
  assets = @(
    (Join-Path $assetsDir "system-architecture.png"),
    (Join-Path $assetsDir "database-er.png"),
    (Join-Path $assetsDir "order-lifecycle.png")
  )
}

$result | ConvertTo-Json -Depth 3
