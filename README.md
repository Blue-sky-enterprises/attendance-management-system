# Blue Sky Enterprises - Attendance Monitor

A modern attendance management dashboard built with React, TypeScript, ShadCN UI, and Tailwind CSS for managing client-wise employee assignments, attendance records, absentees, shift tracking, analytics, and monthly reports.

---

## Overview

Attendance Monitor is an internal workforce management application designed to simplify daily attendance operations across multiple clients and employees.

The application enables administrators to:

* Manage clients and employees
* Assign employees to clients on a daily basis
* Track Day and Night shifts
* Record absentees
* Monitor employee duty counts
* View analytics and leaderboards
* Export attendance reports in TXT and Excel formats
* Persist data locally without requiring a backend

---

## Features

### Client Management

* Create clients
* Edit client details
* Delete clients
* View all registered clients

### Employee Management

* Create employees
* Edit employee details
* Delete employees
* View all employees

### Daily Attendance Tracking

* Month-based attendance records
* Automatic generation of days based on selected month
* Support for 28, 29, 30, and 31-day months
* Client-wise employee assignment

### Shift Management

* Day Shift
* Night Shift
* Visual distinction between shifts

### Absentee Management

* Mark employees as absent
* Remove absentee records
* Daily absentee tracking

### Duty Analytics

* Total duties assigned
* Total absentees
* Top-performing employee
* Employee leaderboard
* Client-wise duty distribution

### Report Export

* Download TXT reports
* Download Excel reports
* Monthly attendance summaries
* Detailed attendance logs

### Data Persistence

* Local Storage based persistence
* Automatic save and restore
* No backend required

### Responsive Design

* Desktop support
* Tablet support
* Mobile support

---

## Technology Stack

### Frontend

* React
* TypeScript
* Vite

### UI

* ShadCN UI
* Tailwind CSS
* Lucide React Icons

### Data Handling

* Local Storage
* React Hooks

### Reporting

* SheetJS (xlsx)

---

## Analytics Included

The dashboard provides:

* Total Clients
* Total Employees
* Total Duties
* Total Absentees
* Employee Leaderboard
* Top Duty Performer
* Client-wise Assignment Summary

---

## Report Formats

### TXT Export

Contains:

* Executive Summary
* Employee Leaderboard
* Client-wise Duty Distribution
* Daily Attendance Logs
* Absentee Records

### Excel Export

Contains multiple sheets:

* Summary
* Leaderboard
* Client Summary
* Attendance Logs

---

## Data Storage

All data is stored locally inside the browser using Local Storage.

Stored Entities:

* Clients
* Employees
* Attendance Records
* Absentee Records

No external database is required.

---

## Intended Usage

This project is designed as an internal attendance tracking system for workforce and client assignment management.

---

## License

Copyright © Blue Sky Enterprises.

All rights reserved.

This project is proprietary and confidential.

Unauthorized copying, modification, distribution, publication, sublicensing, sale, or use of any portion of this software is strictly prohibited without prior written permission from the owner.

This repository is provided for reference and internal use only.

---

## Author

Blue Sky Enterprises
