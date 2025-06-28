// Tour Manager JavaScript - Fantasy Tour de France 2025
class TourManager {
  constructor() {
    this.currentManager = null;
    this.maxBudget = 4000;
    this.maxRiders = 8;
    this.riders = [];
    this.teams = {};
    
    // Point scoring system from the CSV
    this.pointScheme = {
      stages: {
        1: 80, 2: 50, 3: 35, 4: 25, 5: 15, 6: 10, 7: 5, 8: 3, 9: 2, 10: 1
      },
      gc: {
        1: 600, 2: 450, 3: 380, 4: 320, 5: 290, 6: 260, 7: 230, 8: 200, 9: 180, 10: 160,
        11: 140, 12: 130, 13: 120, 14: 110, 15: 100, 16: 94, 17: 88, 18: 82, 19: 77, 20: 72,
        21: 67, 22: 65, 23: 63, 24: 61, 25: 59, 26: 57, 27: 55, 28: 53, 29: 51, 30: 49,
        31: 47, 32: 45, 33: 43, 34: 41, 35: 39, 36: 37, 37: 35, 38: 33, 39: 32, 40: 31,
        41: 30, 42: 29, 43: 28, 44: 27, 45: 26, 46: 25, 47: 24, 48: 23, 49: 22, 50: 21
      },
      leader: 20
    };
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadRiderDataFromCSV();
    this.loadFromStorage();
    this.loadTeamFromUrl(); // Check for shared teams in URL
    this.updateUI();
  }

  async loadRiderDataFromCSV() {
    try {
      // Load the main rider data from Sheet1
      const response = await fetch('TdF 2025 team selector/Sheet1-Tabell 1.csv');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
      console.log('CSV file loaded, length:', csvText.length);
      
      this.riders = this.parseRiderCSV(csvText);
      
      // Also try to load updated scoring if available
      await this.loadUpdatedScoring();
      
      this.populateTeamFilter();
      
      console.log(`Successfully loaded ${this.riders.length} riders from CSV`);
      this.showMessage(`Loaded ${this.riders.length} riders from Tour de France 2025 data`, 'success');
      
      if (this.riders.length === 0) {
        console.warn('No riders found in CSV, falling back to sample data');
        this.loadSampleData();
      }
    } catch (error) {
      console.error('Error loading rider data:', error);
      console.log('Falling back to sample data');
      this.showMessage('Could not load CSV data, using sample data', 'warning');
      // Fallback to sample data if CSV loading fails
      this.loadSampleData();
    }
  }

  async loadUpdatedScoring() {
    try {
      // Try to load updated scoring from a scoring CSV file
      const response = await fetch('TdF 2025 team selector/scoring-updates.csv');
      if (response.ok) {
        const csvText = await response.text();
        this.parseAndApplyScoring(csvText);
        console.log('Applied updated scoring from scoring-updates.csv');
      }
    } catch (error) {
      // File doesn't exist or can't be loaded - that's fine, use default scores
      console.log('No scoring updates file found, using default scores');
    }
  }

  parseAndApplyScoring(csvText) {
    const lines = csvText.split('\n');
    let updatedCount = 0;
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      const columns = line.split(';');
      if (columns.length >= 3) {
        const riderName = columns[0].trim();
        const stagePoints = parseInt(columns[1]) || 0;
        const gcPoints = parseInt(columns[2]) || 0;
        const leaderBonus = parseInt(columns[3]) || 0;
        
        // Find and update the rider
        const rider = this.riders.find(r => r.name === riderName);
        if (rider) {
          rider.stats.stagePoints = stagePoints;
          rider.stats.gcPoints = gcPoints;
          rider.stats.leaderBonus = leaderBonus;
          rider.score = stagePoints + gcPoints + leaderBonus;
          updatedCount++;
        }
      }
    }
    
    if (updatedCount > 0) {
      console.log(`Updated scores for ${updatedCount} riders`);
      this.showMessage(`Updated scores for ${updatedCount} riders`, 'success');
      
      // Update all teams' total scores
      Object.keys(this.teams).forEach(managerId => {
        this.updateTeamScore(managerId);
      });
    }
  }

  updateTeamScore(managerId) {
    const team = this.teams[managerId];
    team.score = team.riders.reduce((total, rider) => {
      const currentRider = this.riders.find(r => r.id === rider.id);
      return total + (currentRider ? currentRider.score : rider.score);
    }, 0);
  }

  parseRiderCSV(csvText) {
    const lines = csvText.split('\n');
    const riders = [];
    let riderId = 1;
    let skippedLines = 0;
    let processedLines = 0;
    
    console.log(`Processing ${lines.length} lines from CSV`);
    
    // Skip header lines and find where rider data starts
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        skippedLines++;
        continue;
      }
      
      // Skip header/instruction lines
      if (line.startsWith('All riders') || line.startsWith('Top part') || 
          line.startsWith('If the team') || line.startsWith('Lower part') ||
          line.startsWith('Make trial') || line.startsWith('IF THIS LINE') ||
          line.startsWith('If you sort') || line.startsWith('These prices') ||
          line.startsWith('Budget') || line.startsWith('Number of riders') ||
          line.startsWith('Remaining budget') || line.startsWith(';;;')) {
        skippedLines++;
        continue;
      }
      
      const columns = line.split(';');
      
      // Need at least name, team, and price
      if (columns.length >= 3) {
        const name = columns[0] ? columns[0].trim() : '';
        const team = columns[1] ? columns[1].trim() : '';
        const priceStr = columns[2] ? columns[2].trim() : '';
        
        // Skip if essential data is missing
        if (!name || !team || !priceStr) {
          skippedLines++;
          continue;
        }
        
        // Handle special cases
        if (name === 'POGACAR Tadej' && priceStr === 'out of budget') {
          skippedLines++;
          continue;
        }
        
        // Parse price - should be a number
        const price = parseInt(priceStr);
        if (isNaN(price) || price <= 0) {
          console.log(`Skipping ${name} - invalid price: ${priceStr}`);
          skippedLines++;
          continue;
        }
        
        const status = columns[3] ? columns[3].trim() : '';
        const confirmed = status === 'q'; // 'q' indicates confirmed rider
        
        riders.push({
          id: riderId++,
          name: name,
          team: team,
          price: price,
          score: 0,
          confirmed: confirmed,
          stats: { 
            wins: 0, 
            podiums: 0,
            stagePoints: 0,
            gcPoints: 0,
            leaderBonus: 0
          }
        });
        
        processedLines++;
      } else {
        skippedLines++;
      }
    }
    
    console.log(`CSV Parsing Results:`);
    console.log(`- Total lines: ${lines.length}`);
    console.log(`- Skipped lines: ${skippedLines}`);
    console.log(`- Processed lines: ${processedLines}`);
    console.log(`- Riders created: ${riders.length}`);
    
    if (riders.length > 0) {
      console.log(`- Price range: ${Math.min(...riders.map(r => r.price))} - ${Math.max(...riders.map(r => r.price))}`);
      console.log(`- Confirmed riders: ${riders.filter(r => r.confirmed).length}`);
      console.log(`- Sample riders:`, riders.slice(0, 3).map(r => `${r.name} (${r.team}) - ${r.price}pts`));
    }
    
    return riders.sort((a, b) => b.price - a.price); // Sort by price descending
  }

  populateTeamFilter() {
    const teamFilter = document.getElementById('teamFilter');
    const teams = [...new Set(this.riders.map(rider => rider.team))].sort();
    
    // Clear existing options except "All Teams"
    teamFilter.innerHTML = '<option value="">All Teams</option>';
    
    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team;
      option.textContent = team;
      teamFilter.appendChild(option);
    });
  }

  setupEventListeners() {
    // Manager selection
    document.querySelectorAll('.manager-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const managerId = e.target.dataset.manager;
        const managerName = e.target.textContent.trim();
        this.selectManager(managerId, managerName);
      });
    });

    document.getElementById('customManagerBtn').addEventListener('click', () => {
      const customName = document.getElementById('customManagerName').value.trim();
      if (customName) {
        const customId = 'custom_' + Date.now(); // Generate unique ID
        this.selectManager(customId, customName);
      }
    });

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Manager actions
    document.getElementById('saveTeamBtn').addEventListener('click', () => {
      this.saveTeam();
    });

    document.getElementById('changeManagerBtn').addEventListener('click', () => {
      this.changeManager();
    });

    document.getElementById('viewLeaderboardBtn').addEventListener('click', () => {
      this.switchTab('leaderboard');
    });



    // Data management
    document.getElementById('exportDataBtn').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('importDataBtn').addEventListener('click', () => {
      this.importData();
    });

    document.getElementById('resetDataBtn').addEventListener('click', () => {
      this.resetData();
    });

    document.getElementById('refreshDataBtn').addEventListener('click', () => {
      this.refreshRiderData();
    });

    document.getElementById('shareTeamBtn').addEventListener('click', () => {
      this.shareTeam();
    });

    // Search and filters
    document.getElementById('riderSearch').addEventListener('input', (e) => {
      this.filterRiders();
    });

    document.getElementById('teamFilter').addEventListener('change', () => {
      this.filterRiders();
    });

    document.getElementById('sortBy').addEventListener('change', () => {
      this.sortRiders();
    });

    // Modal
    document.querySelector('.close').addEventListener('click', () => {
      this.closeModal();
    });

    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal();
      }
    });
  }

  selectManager(managerId, managerName = null) {
    this.currentManager = managerId;
    
    // Initialize team if doesn't exist
    if (!this.teams[managerId]) {
      this.teams[managerId] = {
        name: managerName || managerId, // Store the display name
        riders: [],
        totalCost: 0,
        score: 0,
        lastUpdated: new Date().toISOString()
      };
    } else if (managerName && !this.teams[managerId].name) {
      // Update name if not set (for backward compatibility)
      this.teams[managerId].name = managerName;
    }

    // Show main interface
    document.getElementById('userSetup').style.display = 'none';
    document.getElementById('tourInterface').style.display = 'block';

    this.updateUI();
    this.saveToStorage();
  }

  changeManager() {
    this.currentManager = null;
    document.getElementById('userSetup').style.display = 'block';
    document.getElementById('tourInterface').style.display = 'none';
    document.getElementById('customManagerName').value = '';
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // Update content based on tab
    switch (tabName) {
      case 'team-selection':
        this.renderRiders();
        break;
      case 'my-team':
        this.renderMyTeam();
        break;
      case 'leaderboard':
        this.renderLeaderboard();
        break;
      case 'settings':
        this.renderSettings();
        break;
    }
  }

  updateUI() {
    if (!this.currentManager) return;

    const team = this.teams[this.currentManager];
    
    // Update header - use the stored name or fallback to ID
    const displayName = team.name || this.currentManager.charAt(0).toUpperCase() + this.currentManager.slice(1);
    document.getElementById('currentManager').textContent = displayName;
    document.getElementById('currentBudget').textContent = this.maxBudget - team.totalCost;
    document.getElementById('teamCount').textContent = team.riders.length;

    // Update team stats in My Team tab
    document.getElementById('teamCost').textContent = team.totalCost;
    document.getElementById('remainingBudget').textContent = this.maxBudget - team.totalCost;
    document.getElementById('currentScore').textContent = team.score;
  }

  loadSampleData() {
    // Sample rider data based on 2025 TdF structure - fallback when CSV loading fails
    this.riders = [
      {
        id: 1,
        name: "POGACAR Tadej",
        team: "UAD",
        price: 5030,
        score: 0,
        confirmed: true,
        stats: { wins: 0, podiums: 0, stagePoints: 0, gcPoints: 0, leaderBonus: 0 }
      },
      {
        id: 2,
        name: "EVENEPOEL Remco",
        team: "SOQ",
        price: 2680,
        score: 0,
        confirmed: true,
        stats: { wins: 0, podiums: 0, stagePoints: 0, gcPoints: 0, leaderBonus: 0 }
      },
      {
        id: 3,
        name: "VINGEGAARD HANSEN Jonas",
        team: "TVL",
        price: 1735,
        score: 0,
        confirmed: true,
        stats: { wins: 0, podiums: 0, stagePoints: 0, gcPoints: 0, leaderBonus: 0 }
      },
      {
        id: 4,
        name: "PHILIPSEN Jasper",
        team: "ADC",
        price: 1686,
        score: 0,
        confirmed: true,
        stats: { wins: 0, podiums: 0, stagePoints: 0, gcPoints: 0, leaderBonus: 0 }
      },
      {
        id: 5,
        name: "VAN DER POEL Mathieu",
        team: "ADC",
        price: 1616,
        score: 0,
        confirmed: true,
        stats: { wins: 0, podiums: 0, stagePoints: 0, gcPoints: 0, leaderBonus: 0 }
      },
      {
        id: 6,
        name: "VAN AERT Wout",
        team: "TVL",
        price: 1596,
        score: 0,
        confirmed: true,
        stats: { wins: 0, podiums: 0, stagePoints: 0, gcPoints: 0, leaderBonus: 0 }
      },
      {
        id: 7,
        name: "ROGLIC Primoz",
        team: "RBH",
        price: 1592,
        score: 0,
        confirmed: true,
        stats: { wins: 0, podiums: 0, stagePoints: 0, gcPoints: 0, leaderBonus: 0 }
      },
      {
        id: 8,
        name: "GIRMAY HAILU Biniam",
        team: "IWA",
        price: 1529,
        score: 0,
        confirmed: true,
        stats: { wins: 0, podiums: 0, stagePoints: 0, gcPoints: 0, leaderBonus: 0 }
      },
      {
        id: 9,
        name: "MAS NICOLAU Enric",
        team: "MOV",
        price: 1397,
        score: 0,
        confirmed: true,
        stats: { wins: 0, podiums: 0, stagePoints: 0, gcPoints: 0, leaderBonus: 0 }
      },
      {
        id: 10,
        name: "O'CONNOR Ben",
        team: "JAY",
        price: 1333,
        score: 0,
        confirmed: true,
        stats: { wins: 0, podiums: 0, stagePoints: 0, gcPoints: 0, leaderBonus: 0 }
      },
      {
        id: 11,
        name: "THOMAS Geraint",
        team: "IGD",
        price: 57,
        score: 0,
        confirmed: false,
        stats: { wins: 0, podiums: 0, stagePoints: 0, gcPoints: 0, leaderBonus: 0 }
      },
      {
        id: 12,
        name: "CAVENDISH Mark",
        team: "ADC",
        price: 100,
        score: 0,
        confirmed: false,
        stats: { wins: 0, podiums: 0, stagePoints: 0, gcPoints: 0, leaderBonus: 0 }
      }
    ];

    this.populateTeamFilter();
    console.log('Loaded sample data as fallback');
  }

  renderRiders() {
    const ridersGrid = document.getElementById('ridersGrid');
    ridersGrid.innerHTML = '';

    let filteredRiders = this.getFilteredRiders();

    filteredRiders.forEach(rider => {
      const riderCard = this.createRiderCard(rider);
      ridersGrid.appendChild(riderCard);
    });
  }

  createRiderCard(rider) {
    const team = this.teams[this.currentManager];
    const isSelected = team.riders.some(r => r.id === rider.id);
    const canAfford = (team.totalCost + rider.price) <= this.maxBudget;
    const hasSlots = team.riders.length < this.maxRiders;

    const card = document.createElement('div');
    card.className = `rider-card ${isSelected ? 'selected' : ''} ${rider.confirmed ? 'confirmed' : 'unconfirmed'}`;
    
    card.innerHTML = `
      <div class="rider-name">
        ${rider.name}
        ${rider.confirmed ? '<span class="confirmed-badge" title="Confirmed rider">✓</span>' : '<span class="unconfirmed-badge" title="Unconfirmed rider">?</span>'}
      </div>
      <div class="rider-team">${rider.team}</div>
      <div class="rider-price">${rider.price} points</div>
      <div class="rider-stats">
        <span>Score: ${rider.score}</span>
        <span>Stage Pts: ${rider.stats.stagePoints}</span>
        <span>GC Pts: ${rider.stats.gcPoints}</span>
      </div>
      <div class="rider-actions">
        ${isSelected ? 
          `<button class="remove-btn" onclick="tourManager.removeRider(${rider.id})">Remove</button>` :
          `<button class="select-btn" onclick="tourManager.addRider(${rider.id})" 
           ${!canAfford || !hasSlots ? 'disabled' : ''}>
           ${!canAfford ? 'Too Expensive' : !hasSlots ? 'Team Full' : 'Select'}
           </button>`
        }
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        this.showRiderDetails(rider);
      }
    });

    return card;
  }

  addRider(riderId) {
    const rider = this.riders.find(r => r.id === riderId);
    const team = this.teams[this.currentManager];

    if (!rider || team.riders.length >= this.maxRiders) return;
    if (team.totalCost + rider.price > this.maxBudget) return;
    if (team.riders.some(r => r.id === riderId)) return;

    team.riders.push(rider);
    team.totalCost += rider.price;
    team.lastUpdated = new Date().toISOString();

    this.updateUI();
    this.renderRiders();
    this.saveToStorage();
    this.showMessage('Rider added to your team!', 'success');
  }

  removeRider(riderId) {
    const team = this.teams[this.currentManager];
    const riderIndex = team.riders.findIndex(r => r.id === riderId);
    
    if (riderIndex === -1) return;

    const rider = team.riders[riderIndex];
    team.riders.splice(riderIndex, 1);
    team.totalCost -= rider.price;
    team.lastUpdated = new Date().toISOString();

    this.updateUI();
    this.renderRiders();
    this.renderMyTeam();
    this.saveToStorage();
    this.showMessage('Rider removed from your team!', 'warning');
  }

  renderMyTeam() {
    const selectedRiders = document.getElementById('selectedRiders');
    const team = this.teams[this.currentManager];
    
    selectedRiders.innerHTML = '';

    if (team.riders.length === 0) {
      selectedRiders.innerHTML = '<p>No riders selected yet. Go to Team Selection to build your team!</p>';
      return;
    }

    team.riders.forEach(rider => {
      const riderCard = document.createElement('div');
      riderCard.className = `rider-card selected ${rider.confirmed ? 'confirmed' : 'unconfirmed'}`;
      
      riderCard.innerHTML = `
        <div class="rider-name">
          ${rider.name}
          ${rider.confirmed ? '<span class="confirmed-badge" title="Confirmed rider">✓</span>' : '<span class="unconfirmed-badge" title="Unconfirmed rider">?</span>'}
        </div>
        <div class="rider-team">${rider.team}</div>
        <div class="rider-price">${rider.price} points</div>
        <div class="rider-stats">
          <span>Total Score: ${rider.score}</span>
          <span>Stage Pts: ${rider.stats.stagePoints}</span>
          <span>GC Pts: ${rider.stats.gcPoints}</span>
          <span>Leader Bonus: ${rider.stats.leaderBonus}</span>
        </div>
        <div class="rider-actions">
          <button class="remove-btn" onclick="tourManager.removeRider(${rider.id})">Remove</button>
        </div>
      `;

      selectedRiders.appendChild(riderCard);
    });
  }

  renderLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboardBody');
    leaderboardBody.innerHTML = '';

    // Convert teams object to array and sort by score
    const managerList = Object.keys(this.teams).map(managerId => ({
      managerId,
      ...this.teams[managerId]
    })).sort((a, b) => b.score - a.score);

    managerList.forEach((manager, index) => {
      const row = document.createElement('tr');
      row.className = index < 3 ? `rank-${index + 1}` : '';
      
      const displayName = manager.name || manager.managerId.charAt(0).toUpperCase() + manager.managerId.slice(1);
      
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${displayName}</td>
        <td>${manager.score}</td>
        <td>${manager.totalCost}</td>
        <td>${new Date(manager.lastUpdated).toLocaleDateString()}</td>
      `;

      leaderboardBody.appendChild(row);
    });
  }

  renderSettings() {
    // Settings rendering - currently just displays static content
    // Could be used for game configuration in the future
  }

  getFilteredRiders() {
    let filtered = [...this.riders];

    // Search filter
    const searchTerm = document.getElementById('riderSearch').value.toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(rider => 
        rider.name.toLowerCase().includes(searchTerm) ||
        rider.team.toLowerCase().includes(searchTerm)
      );
    }

    // Team filter
    const teamFilter = document.getElementById('teamFilter').value;
    if (teamFilter) {
      filtered = filtered.filter(rider => rider.team === teamFilter);
    }

    // Sort
    const sortBy = document.getElementById('sortBy').value;
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return filtered;
  }

  filterRiders() {
    this.renderRiders();
  }

  sortRiders() {
    this.renderRiders();
  }

  showRiderDetails(rider) {
    const modal = document.getElementById('riderModal');
    const riderDetails = document.getElementById('riderDetails');
    
    riderDetails.innerHTML = `
      <h3>
        ${rider.name}
        ${rider.confirmed ? '<span class="confirmed-badge" title="Confirmed rider">✓ Confirmed</span>' : '<span class="unconfirmed-badge" title="Unconfirmed rider">? Unconfirmed</span>'}
      </h3>
      <p><strong>Team:</strong> ${rider.team}</p>
      <p><strong>Price:</strong> ${rider.price} points</p>
      <p><strong>Status:</strong> ${rider.confirmed ? 'Confirmed for Tour de France 2025' : 'Not yet confirmed - subject to team selection'}</p>
      <h4>Tour de France 2025 Performance</h4>
      <ul>
        <li>Total Score: ${rider.score} points</li>
        <li>Stage Points: ${rider.stats.stagePoints}</li>
        <li>General Classification Points: ${rider.stats.gcPoints}</li>
        <li>Leader Bonus Points: ${rider.stats.leaderBonus}</li>
      </ul>
      <h4>Point Scoring System</h4>
      <p><strong>Stage Results:</strong> 1st: 80pts, 2nd: 50pts, 3rd: 35pts, 4th: 25pts, 5th: 15pts, 6th: 10pts, 7th: 5pts, 8th: 3pts, 9th: 2pts, 10th: 1pt</p>
      <p><strong>General Classification:</strong> 1st: 600pts, 2nd: 450pts, 3rd: 380pts... (full scale)</p>
      <p><strong>Race Leader:</strong> 20pts per day in Yellow Jersey</p>
    `;
    
    modal.style.display = 'block';
  }

  closeModal() {
    document.getElementById('riderModal').style.display = 'none';
  }



  saveTeam() {
    const team = this.teams[this.currentManager];
    
    if (team.riders.length === 0) {
      this.showMessage('No riders selected to save!', 'warning');
      return;
    }

    team.lastUpdated = new Date().toISOString();
    this.saveToStorage();
    this.showMessage('Team saved successfully!', 'success');
  }

  exportData() {
    const data = {
      teams: this.teams,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tour_manager_data.json';
    a.click();
    URL.revokeObjectURL(url);

    this.showMessage('Data exported successfully!', 'success');
  }

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.teams) {
            this.teams = data.teams;
          }
          
          this.saveToStorage();
          this.updateUI();
          this.renderLeaderboard();
          this.showMessage('Data imported successfully!', 'success');
        } catch (error) {
          this.showMessage('Invalid file format!', 'error');
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }

  resetData() {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      this.teams = {};
      this.currentManager = null;
      localStorage.removeItem('tourManagerData');
      
      this.changeManager();
      this.showMessage('All data has been reset!', 'warning');
    }
  }

  async refreshRiderData() {
    this.showMessage('Refreshing rider data...', 'info');
    try {
      await this.loadRiderDataFromCSV();
      
      // Update any existing teams with new rider data
      Object.keys(this.teams).forEach(managerId => {
        const team = this.teams[managerId];
        team.riders = team.riders.map(teamRider => {
          const updatedRider = this.riders.find(r => r.name === teamRider.name);
          return updatedRider ? { ...updatedRider, id: teamRider.id } : teamRider;
        });
        this.updateTeamScore(managerId);
      });
      
      this.updateUI();
      this.renderRiders();
      this.renderMyTeam();
      this.renderLeaderboard();
      this.saveToStorage();
      
      this.showMessage('Rider data refreshed successfully!', 'success');
    } catch (error) {
      this.showMessage('Failed to refresh rider data', 'error');
    }
  }

  shareTeam() {
    if (!this.currentManager || !this.teams[this.currentManager] || this.teams[this.currentManager].riders.length === 0) {
      this.showMessage('No team to share! Build your team first.', 'warning');
      return;
    }

    const team = this.teams[this.currentManager];
    const shareData = {
      manager: team.name || this.currentManager, // Use display name
      riders: team.riders.map(r => ({ name: r.name, team: r.team, price: r.price })),
      totalCost: team.totalCost,
      score: team.score,
      timestamp: new Date().toISOString()
    };

    const shareUrl = window.location.origin + window.location.pathname + 
                    '?team=' + encodeURIComponent(btoa(JSON.stringify(shareData)));
    
    // Try to copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.showMessage('Share URL copied to clipboard!', 'success');
      }).catch(() => {
        this.showShareUrlDialog(shareUrl);
      });
    } else {
      this.showShareUrlDialog(shareUrl);
    }
  }

  showShareUrlDialog(url) {
    const modal = document.getElementById('riderModal');
    const riderDetails = document.getElementById('riderDetails');
    
    riderDetails.innerHTML = `
      <h3>Share Your Team</h3>
      <p>Copy this URL to share your team with others:</p>
      <textarea readonly style="width: 100%; height: 100px; margin: 10px 0; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">${url}</textarea>
      <button onclick="this.select(); this.setSelectionRange(0, 99999); document.execCommand('copy'); tourManager.showMessage('URL copied!', 'success');" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy URL</button>
    `;
    
    modal.style.display = 'block';
  }

  loadTeamFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const teamData = urlParams.get('team');
    
    if (teamData) {
      try {
        const shareData = JSON.parse(atob(teamData));
        
        // Create a new manager entry for the shared team
        const sharedManagerId = `${shareData.manager}_shared_${Date.now()}`;
        
        this.teams[sharedManagerId] = {
          riders: shareData.riders.map((rider, index) => ({
            ...rider,
            id: index + 1000, // Use high IDs to avoid conflicts
            score: 0,
            confirmed: true,
            stats: { wins: 0, podiums: 0, stagePoints: 0, gcPoints: 0, leaderBonus: 0 }
          })),
          totalCost: shareData.totalCost,
          score: shareData.score,
          lastUpdated: shareData.timestamp
        };

        this.saveToStorage();
        this.showMessage(`Loaded shared team from ${shareData.manager}!`, 'success');
        
        // Clear URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
        
      } catch (error) {
        console.error('Error loading shared team:', error);
        this.showMessage('Invalid share URL', 'error');
      }
    }
  }

  saveToStorage() {
    const data = {
      teams: this.teams,
      currentManager: this.currentManager
    };
    localStorage.setItem('tourManagerData', JSON.stringify(data));
  }

  loadFromStorage() {
    const stored = localStorage.getItem('tourManagerData');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.teams = data.teams || {};
        this.currentManager = data.currentManager;

        if (this.currentManager) {
          // For existing managers, we already have their data including name
          this.selectManager(this.currentManager);
        }
      } catch (error) {
        console.error('Error loading from storage:', error);
      }
    }
  }

  showMessage(text, type = 'info') {
    // Remove any existing messages
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;

    // Insert after manager header
    const managerHeader = document.querySelector('.manager-header');
    if (managerHeader) {
      managerHeader.insertAdjacentElement('afterend', message);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 5000);
  }

  // Debug function - can be called from console: tourManager.debugCSVLoading()
  async debugCSVLoading() {
    console.log('=== Debug CSV Loading ===');
    
    try {
      const response = await fetch('TdF 2025 team selector/Sheet1-Tabell 1.csv');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (response.ok) {
        const text = await response.text();
        console.log('CSV text length:', text.length);
        console.log('First 500 characters:', text.substring(0, 500));
        
        const lines = text.split('\n');
        console.log('Total lines:', lines.length);
        console.log('First 10 lines:', lines.slice(0, 10));
        
        const riders = this.parseRiderCSV(text);
        console.log('Parsed riders:', riders.length);
        
        if (riders.length > 0) {
          console.log('First few riders:', riders.slice(0, 5));
        }
        
        return { success: true, riders: riders.length, text: text.length };
      } else {
        console.error('Failed to load CSV file');
        return { success: false, error: 'HTTP error' };
      }
    } catch (error) {
      console.error('Error loading CSV:', error);
      return { success: false, error: error.message };
    }
  }
}

// Initialize the Tour Manager when the page loads
let tourManager;

document.addEventListener('DOMContentLoaded', () => {
  tourManager = new TourManager();
});

// Make functions available globally for onclick handlers
window.tourManager = tourManager; 