const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

// Load configuration
let config;
try {
    // Try to load local config first (for development)
    config = require('./config.local.js');
} catch (error) {
    // Fall back to default config
    config = require('./config.js');
}

const app = express();
const PORT = config.server.port;

// Enable CORS for all routes
app.use(cors());

// Serve static files
app.use(express.static(__dirname));
app.use(express.json());

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Proxy endpoint for Claude API
app.post('/api/claude', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.claude.apiKey,
                'anthropic-version': config.claude.apiVersion
            },
            body: JSON.stringify({
                model: config.claude.model,
                max_tokens: config.claude.maxTokens,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.error?.message) {
                    errorMessage = errorData.error.message;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // If we can't parse the error response, use the status text
            }
            
            // Handle specific error cases
            if (response.status === 529) {
                errorMessage = "Claude API is currently overloaded. Please try again in a few minutes.";
            } else if (response.status === 429) {
                errorMessage = "Rate limit exceeded. Please wait a moment before trying again.";
            }
            
            return res.status(response.status).json({ error: errorMessage });
        }

        const data = await response.json();
        res.json({ content: data.content[0].text });

    } catch (error) {
        console.error('Claude API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// HTML Report Generation endpoint
app.post('/api/download-html', async (req, res) => {
    try {
        const { analysisContent } = req.body;
        
        if (!analysisContent) {
            return res.status(400).json({ error: 'Analysis content is required' });
        }

        // Create HTML content with styling
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report Analysis</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-blue: #49B9FF;
            --primary-blue-light: #A8DDFF;
            --primary-blue-lighter: #E4F4FF;
            --primary-dark: #1a2332;
            --primary-dark-medium: #364A7A;
            --primary-dark-light: #7889B3;
            --accent-purple: #727EBF;
            --accent-purple-light: #A4AEE7;
            --accent-purple-lighter: #D5DBFF;
            --white: #ffffff;
            --light-gray: #f8f9fa;
            --medium-gray: #e9ecef;
            --dark-gray: #6c757d;
            --text-dark: #212529;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Roboto', sans-serif;
            font-weight: 300;
            line-height: 1.6;
            color: var(--text-dark);
            background: var(--white);
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid var(--primary-blue);
        }
        
        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--primary-dark);
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            font-size: 1.1rem;
            color: var(--dark-gray);
        }
        
        .company-brand {
            font-size: 0.9rem;
            color: var(--accent-purple);
            margin-top: 10px;
        }
        
        .analysis-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        .analysis-section h3 {
            font-size: 1.4rem;
            font-weight: 700;
            color: var(--primary-dark);
            margin-bottom: 15px;
            padding: 10px 0;
            border-bottom: 2px solid var(--primary-blue-light);
        }
        
        .analysis-section p {
            margin-bottom: 15px;
            text-align: justify;
        }
        
        .analysis-section ul {
            margin-left: 20px;
            margin-bottom: 15px;
        }
        
        .analysis-section li {
            margin-bottom: 8px;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid var(--primary-blue-light);
            text-align: center;
            font-size: 0.9rem;
            color: var(--dark-gray);
        }
        
        @media print {
            body {
                padding: 20px;
            }
            
            .analysis-section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Report Analysis</h1>
    </div>
    
    <div class="analysis-content">
        ${analysisContent}
    </div>
    
    <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    </div>
</body>
</html>`;

        // Set response headers for HTML download
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="report-analysis-${Date.now()}.html"`);
        
        res.send(htmlContent);
        
    } catch (error) {
        console.error('HTML Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate HTML report' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Open your browser and go to: http://localhost:${PORT}`);
}); 