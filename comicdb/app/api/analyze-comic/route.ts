import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const resolvedMimeType = validMimeTypes.includes(mimeType) ? mimeType : 'image/jpeg';

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: resolvedMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Analyze this comic book cover image and extract the following details. Return ONLY a valid JSON object with these exact fields, no markdown or extra text:
{
  "name": "The comic book series title without issue number (e.g., Amazing Fantasy)",
  "company": "The publisher name (e.g., Marvel, DC Comics, Image Comics)",
  "issue_number": <integer issue number, use 1 if unclear>,
  "year_published": <4-digit year, estimate from art style or logos if not printed>,
  "condition": "<one of exactly: Poor, Fair, Good, Very Good, Fine, Very Fine, Near Mint, Mint>",
  "description": "A 2-3 sentence description of the comic's story and plot — summarize what happens in this issue, who the main characters are, and any notable story events or significance (e.g. first appearances, key story arcs). Use your knowledge of the comic, not just the cover image."
}

For condition: assess the physical condition visible in the image. If the comic looks pristine, use Near Mint. If you cannot tell, use Good. Return ONLY the JSON object.`,
            },
          ],
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected API response type' }, { status: 500 });
    }

    let extracted;
    try {
      const text = content.text.replace(/```json\n?|\n?```/g, '').trim();
      extracted = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse Claude response', raw: content.text },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: extracted });
  } catch (error) {
    console.error('Comic analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
