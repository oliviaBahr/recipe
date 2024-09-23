import axios from "axios";
import { Anthropic } from "@anthropic-ai/sdk";
import { convert } from "html-to-text";
import { Readable } from "stream";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert chef and recipe writer named recipe-ai that extracts recipes from text and formats them in markdown.
  ONLY include the recipe. Do not include ads, prefaces, media, stories, or extraneous content.
  Instruction steps should generally be breif, but do not be afraid to use multiple sentences if needed.
  Output with the following markdown structure:

  # <title>
  ---
  ## Ingredients
  ## Directions
  ## Tips and Notes
  ### Recipe-ai Tips
  ---
  ## Commenter Tips (if applicable)
  

  Break down Directions with ### and #### subheadings sensibly.
  If the recipe has multiple parts (i.e. meat, sauce, salad, etc.), organize Ingredients with ###subheadings.
  If the recipe includes tips or info that doesn't fit into other sections, include them in the Tips section.
  Also in the tips section, include one or two of your own tried and true recipe-ai tips for home cooks.

  If there are useful comments or commenter tips, include them in the Comments section at the bottom.`;

export async function handler(event, context) {
  console.log("Received event:", typeof event); // Log the received event

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { url } = JSON.parse(event.body);
  console.log("Extracting recipe from URL:", url); // Log the URL

  try {
    // Fetch HTML content
    const response = await axios.get(url);
    const html = response.data;

    console.log("Cleaning content");
    const cleanContent = convert(html);

    const recipe = await processWithAnthropicAPI(cleanContent);

    console.log("Sending response");
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain",
      },
      body: recipe,
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to extract recipe: " + error }),
    };
  }
}

async function processWithAnthropicAPI(content) {
  const params: Anthropic.MessageCreateParams = {
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Extract the recipe from this content:\n${content}`,
      },
      {
        role: "assistant",
        content: "Here is the extracted recipe:",
      },
    ],
  };

  try {
    console.log("Calling Anthropic API"); // Log before calling the API

    const response = await anthropic.messages.create(params);
    const recipe = response.content[0]["text"];

    return recipe;
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
    return null;
  }
}
