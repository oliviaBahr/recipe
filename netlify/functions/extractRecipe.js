const axios = require('axios');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { url } = JSON.parse(event.body);

  try {
    // Fetch HTML content
    const response = await axios.get(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    const html = response.data.contents;

    // Process HTML with Anthropic API
    const recipe = await processWithAnthropicAPI(html);

    return {
      statusCode: 200,
      body: recipe
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to extract recipe' })
    };
  }
};

async function processWithAnthropicAPI(html) {
  const apiUrl = 'https://api.anthropic.com/v1/chat/completions';
  
  const data = {
    model: "claude-3-opus-20240229",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that extracts recipes from HTML content. Output ONLY the recipe in markdown format with ingredients and directions sections. Do not include any ads, prefaces, or extraneous content."
      },
      {
        role: "user",
        content: `Extract the recipe from this HTML: ${html}`
      }
    ],
    max_tokens: 1000
  };

  try {
    const response = await axios.post(apiUrl, data, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    return "Error processing recipe. Please try again.";
  }
}