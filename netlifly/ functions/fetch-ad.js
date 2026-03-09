// netlify/functions/fetch-ad.js
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

exports.handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { script } = JSON.parse(event.body);
        
        // Extract ad network and key
        let adContent = script;
        let adUrl = null;
        
        // Check for Adsterra
        if (script.includes('highperformanceformat')) {
            const keyMatch = script.match(/['"]key['"]\s*:\s*['"]([^'"]+)['"]/);
            if (keyMatch) {
                const key = keyMatch[1];
                adUrl = `https://www.highperformanceformat.com/${key}/invoke.js`;
            }
        }
        
        // If we have a direct URL, fetch it
        if (adUrl) {
            const response = await fetch(adUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SKYTUBE/1.0)',
                    'Accept': '*/*'
                }
            });
            
            if (response.ok) {
                const jsContent = await response.text();
                
                // Create a DOM to execute the JS
                const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
                    runScripts: "dangerously",
                    resources: "usable"
                });
                
                // Execute the ad script
                const scriptEl = dom.window.document.createElement('script');
                scriptEl.textContent = jsContent;
                dom.window.document.body.appendChild(scriptEl);
                
                // Get the generated HTML
                adContent = dom.window.document.body.innerHTML;
            }
        }
        
        // Wrap in proper HTML for preview
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f7ff; }
        .ad-wrapper { max-width: 100%; }
    </style>
</head>
<body>
    <div class="ad-wrapper">
        ${adContent}
    </div>
</body>
</html>
        `;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: true, 
                html: html,
                note: 'Preview may be limited. Ad will work when published.'
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                success: false, 
                error: 'Failed to load ad preview. It will work when published.' 
            })
        };
    }
};