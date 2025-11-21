import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const clientMessages = body.messages || [];
    const htmlCode = body.html || '';
    const cssCode = body.css || '';
    const jsCode = body.js || '';

    const systemMessage = `You are an AI helper helping students with very basic web development knowledge.
The user is not familiar with writing websites and is working on a website with the following code (based on a template):

HTML:
\`\`\`html
${htmlCode}
\`\`\`

CSS:
\`\`\`css
${cssCode}
\`\`\`

JavaScript:
\`\`\`javascript
${jsCode}
\`\`\`

Provide helpful, very short and concise responses about web development. Always aim to explain and teach the user.
When writing code for the html, always make sure to include \`<style do-not-remove>[[_CSS_]]</style>\` in the head of the html. and \`<script do-not-remove>[[_JS_]]</script>\` in the body of the html.`;

    const conversation = [{ role: 'system', content: systemMessage }, ...clientMessages];

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: conversation,
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.choices[0]?.delta?.content) {
              const content = chunk.choices[0].delta.content;
              const data = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: '[DONE]' })}\n\n`));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in AI processing:', error);
    return NextResponse.json(
      { response: `Sorry, there was an error: ${error.message}` },
      { status: 500 }
    );
  }
}

