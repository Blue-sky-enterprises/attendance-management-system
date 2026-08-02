(() => {
  // Helper to generate unique IDs same as the app
  const generateId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  // Generate 20 Clients
  const clients = Array.from({ length: 20 }).map((_, i) => ({
    id: generateId(),
    name: `Client ${i + 1}`
  }));

  // Generate 50 Employees
  const employees = Array.from({ length: 50 }).map((_, i) => ({
    id: generateId(),
    name: `Employee ${i + 1}`
  }));

  const attendanceRecords = [];
  const year = new Date().getFullYear();
  const month = new Date().getMonth(); // Uses the current month

  // Generate 31 Days of Attendance
  for (let i = 1; i <= 31; i++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    
    const clientsForDay = [];
    const numClientsToday = Math.floor(Math.random() * 5) + 5; // 5 to 9 clients have shifts today
    
    // Shuffle clients and employees to distribute them randomly
    const shuffledClients = [...clients].sort(() => 0.5 - Math.random());
    const shuffledEmployees = [...employees].sort(() => 0.5 - Math.random());
    
    let employeeIndex = 0;
    
    // Assign employees to clients for this day
    for (let j = 0; j < numClientsToday; j++) {
      const numEmployeesForClient = Math.floor(Math.random() * 3) + 2; // 2 to 4 employees per client
      const assignedEmployees = [];
      
      for (let k = 0; k < numEmployeesForClient; k++) {
        if (employeeIndex < shuffledEmployees.length) {
          const shifts = ["day", "night", "half"];
          assignedEmployees.push({
            employeeId: shuffledEmployees[employeeIndex].id,
            shift: shifts[Math.floor(Math.random() * shifts.length)],
            dutyCount: 1
          });
          employeeIndex++;
        }
      }
      
      clientsForDay.push({
        clientId: shuffledClients[j].id,
        employees: assignedEmployees
      });
    }
    
    // Remaining unassigned employees have a chance to be marked as absentees
    const absentees = [];
    while (employeeIndex < shuffledEmployees.length) {
      if (Math.random() > 0.7) { // 30% chance to be an absentee
        absentees.push(shuffledEmployees[employeeIndex].id);
      }
      employeeIndex++;
    }

    attendanceRecords.push({
      date,
      clients: clientsForDay,
      absentees
    });
  }

  // Generate Borrowings and Fines
  const borrowings = Array.from({ length: 30 }).map((_, i) => {
    const isFine = Math.random() > 0.7; // 30% chance for it to be a fine
    const randomDay = Math.floor(Math.random() * 28) + 1;
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(randomDay).padStart(2, "0")}`;
    const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
    
    return {
      id: generateId(),
      employeeId: randomEmployee.id,
      amount: isFine ? Math.floor(Math.random() * 5 + 1) * 100 : Math.floor(Math.random() * 10 + 1) * 500,
      date,
      note: isFine ? "Late arrival fine" : "Advance for expenses",
      type: isFine ? "fine" : "borrowing",
      settled: Math.random() > 0.5
    };
  });

  // Save to Local Storage matching your keys
  localStorage.setItem('att_clients', JSON.stringify(clients));
  localStorage.setItem('att_employees', JSON.stringify(employees));
  localStorage.setItem('att_records', JSON.stringify(attendanceRecords));
  localStorage.setItem('att_borrowings', JSON.stringify(borrowings));

  console.log(`✅ Successfully generated and saved:
- ${clients.length} clients
- ${employees.length} employees
- ${attendanceRecords.length} days of attendance records
- ${borrowings.length} borrowings and fines`);
  console.log("🔄 Please refresh the page to see the changes.");
})();
