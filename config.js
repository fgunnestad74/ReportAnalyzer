// Configuration file for Report Analyzer
// Copy this file to config.local.js and add your actual API key

module.exports = {
    // Claude AI Configuration
    claude: {
        apiKey: process.env.CLAUDE_API_KEY || 'your-claude-api-key-here',
        model: 'claude-sonnet-4-20250514',
        maxTokens: 4000,
        apiVersion: '2023-06-01'
    },
    
    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        corsEnabled: true
    }
}; 