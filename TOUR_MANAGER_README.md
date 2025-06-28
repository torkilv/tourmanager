# Tour Manager - Fantasy Tour de France 2025

A web-based fantasy cycling game for you and your friends to compete during the Tour de France 2025. Build your dream team of 8 riders within a budget and track scores throughout the race.

## Features

- **Team Selection**: Choose 8 riders within a 4000 CQ point budget
- **Real 2025 Data**: Loaded from official Tour de France 2025 CSV files
- **Confirmed/Unconfirmed Status**: Visual indicators for rider confirmation status
- **Easy Score Updates**: Simple CSV-based scoring system for race progress
- **Team Sharing**: Share teams via URL (perfect for GitHub Pages)
- **Multi-player**: Support for multiple managers competing against each other
- **Leaderboard**: Track rankings and team performance
- **Firebase Integration**: Shared database for real-time multiplayer experience
- **Cross-device Sync**: Access your team from any browser/device
- **GitHub Pages Ready**: Designed to work perfectly on GitHub Pages
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Quick Start

### For Local Development (Recommended)

1. Open Terminal/Command Prompt
2. Navigate to the project folder:
   ```bash
   cd /path/to/your/tourmanager
   ```
3. Start a local web server:
   ```bash
   # Python 3
   python3 -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js (if you have it installed)
   npx http-server
   ```
4. Open your browser and go to: `http://localhost:8000`
5. Select your manager name and start building your team!

### GitHub Pages Deployment

1. Fork or clone this repository to your GitHub account
2. Go to your repository settings → Pages
3. Set source to "Deploy from a branch" → main branch
4. Your Tour Manager will be available at: `https://yourusername.github.io/tourmanager`
5. Update CSV files by editing them directly on GitHub or pushing changes

### Alternative (may have limitations)
- Open `index.html` directly in your browser
- Note: CSV loading may not work due to browser security restrictions

## Automatic Multiplayer Database

**Tour Manager automatically connects to a shared Firebase database for real-time multiplayer!**

### ✅ **What You Get:**
- **Real-time sync** - See other players' changes instantly
- **Cross-device access** - Same teams on phone, laptop, tablet
- **Live leaderboard** - Rankings update automatically
- **Never lose data** - Cloud backup included

### 📱 **How It Works:**
1. **Start Tour Manager** - Firebase connects automatically
2. **Check Status** - Settings tab shows "✅ Connected to shared database"
3. **Play Together** - All players see the same data in real-time

### 🔧 **If Database Not Connected:**
- **Fallback**: Local browser storage (teams saved per browser only)
- **Status**: Settings shows "⚠️ Firebase not configured"
- **Fix**: Contact administrator - Firebase credentials need updating

## Game Rules

### Team Building
- Select exactly **8 riders** for your team
- Stay within the **4000 CQ point budget**
- Rider prices are based on CQ scores from official Tour de France 2025 data
- ✓ = Confirmed riders (officially announced by teams)
- ? = Unconfirmed riders (subject to team selection changes)

### Scoring System
Points are awarded based on the official CQ ranking system:

#### Stage Results
- 1st place: 80 points
- 2nd place: 50 points  
- 3rd place: 35 points
- 4th place: 25 points
- 5th place: 15 points
- 6th place: 10 points
- 7th place: 5 points
- 8th place: 3 points
- 9th place: 2 points
- 10th place: 1 point

#### General Classification
- 1st place: 600 points
- 2nd place: 450 points
- 3rd place: 380 points
- 4th place: 320 points
- 5th place: 290 points
- ...continuing down to 50th place: 21 points

#### Race Leadership Bonus
- **Yellow Jersey**: 20 points per day wearing the race leader jersey

### Competition
- Compare your total team score with other managers
- Leaderboard updates as you add/update rider scores
- Winner is determined by highest total points at Tour conclusion

## Data Source & Score Updates

The rider data is automatically loaded from the CSV files in the `TdF 2025 team selector/` directory:
- `Sheet1-Tabell 1.csv` - Main rider data with names, teams, prices, and confirmation status
- `Point scheme-Tabell 1.csv` - Official scoring system
- `scoring-updates.csv` - Live scoring updates during the race (optional)

### Updating Scores During the Race

1. Create a file called `scoring-updates.csv` in the `TdF 2025 team selector/` folder
2. Format each line as: `Rider Name;Stage Points;GC Points;Leader Bonus`
3. Example content:
   ```
   POGACAR Tadej;80;600;20
   VINGEGAARD HANSEN Jonas;50;450;0
   PHILIPSEN Jasper;35;0;0
   ```
4. Users click "Refresh Rider Data" in the Settings tab to load updates
5. All team scores are automatically recalculated

### Team Sharing

- Click "Share Team" to generate a URL that others can use to view your team
- Perfect for comparing teams with friends on GitHub Pages
- Shared teams are automatically imported when someone visits your shared URL

## Data Management

### Automatic Cloud Sync 🌟
**Tour Manager automatically saves all data to a shared Firebase database:**
- **Real-time sync**: Teams saved instantly when you add/remove riders
- **Live updates**: See other players' changes appear automatically
- **Cross-device access**: Same data on phone, laptop, tablet, any browser
- **Automatic backup**: Data safely stored in Google's cloud infrastructure

### Status Check
- **Settings Tab**: Shows current database connection status
- **Connected**: ✅ "Connected to shared database - live multiplayer active"
- **Fallback**: ⚠️ "Firebase not configured - using local storage"

### Export/Import (Backup)
- **Export**: Download all team data as JSON file
- **Import**: Upload previously exported data
- Useful for manual backups or data migration

### Local Storage Fallback
If Firebase connection fails:
- Teams saved to browser's local storage only
- Data persists between browser sessions
- No sync between devices/players - each browser independent

## Troubleshooting

### Rider Loading Issues
- **"No riders loaded"**: Make sure you're running a local web server (see Quick Start)
- **"CSV not found"**: Ensure the `TdF 2025 team selector/` folder is in the same directory as `tourmanager.html`
- **Browser directly opening file**: Use `http://localhost:8000` instead of `file://` URLs

### Team Selection Issues
- **"Too Expensive"**: Rider price would exceed 4000 point budget
- **"Team Full"**: Already have 8 riders selected
- **Button disabled**: Check budget and team size constraints

### Performance Issues
- Large rider lists may load slowly on older devices
- Clear browser cache if experiencing display issues

## Technical Details

### File Structure
```
index.html                          - Main application page (GitHub Pages ready)
tourmanager.css                     - Styling and responsive design
tourmanager.js                      - Core functionality and logic
TdF 2025 team selector/             - CSV data files
  ├── Sheet1-Tabell 1.csv           - Rider data
  ├── Point scheme-Tabell 1.csv     - Scoring system
  ├── scoring-updates.csv           - Live scoring updates (create as needed)
  ├── scoring-updates-example.csv   - Example format for scoring updates
  └── ... (other CSV files)
```

### Browser Compatibility
- Modern browsers with JavaScript enabled
- Local Storage support required
- Must be served via HTTP (not file://) for CSV loading

### Data Format
Teams are stored in this JSON structure:
```json
{
  "teams": {
    "manager1": {
      "riders": [...],
      "totalCost": 3850,
      "score": 125,
      "lastUpdated": "2025-07-01T12:00:00.000Z"
    }
  }
}
```

## Customization

### Modifying Budget/Team Size
Change `maxBudget` and `maxRiders` values in the `TourManager` constructor in `tourmanager.js`.

### Styling
Modify `tourmanager.css` to customize colors, fonts, and layout.

### Adding Scoring Features
The point scheme is defined in the `pointScheme` object in `tourmanager.js` and can be easily modified.

## Version History

- **v2.2** - Automatic Firebase multiplayer with real-time sync
  - **Automatic connection** to shared Firebase database - no setup required
  - Real-time updates when other players modify teams
  - Cross-device sync - access teams from any browser/device
  - Manager names (Lars, Ola, Anders, Torkil) displayed properly throughout
  - Automatic fallback to local storage if Firebase unavailable
  - Simplified user experience - just open and play together!
- **v2.1** - GitHub Pages ready with team sharing and easy score updates
  - Renamed to index.html for GitHub Pages
  - Added URL-based team sharing
  - Simple CSV-based score update system
  - Enhanced persistence for web deployment
- **v2.0** - Tour de France 2025 edition with CSV data loading
- **v1.5** - Removed Google Sheets dependency, improved local data handling
- **v1.0** - Initial release with core functionality

---

**Good luck with your Fantasy Tour de France 2025 team!** 🚴‍♂️🏆 