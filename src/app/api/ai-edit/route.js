import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, fullCode, selectedCode, language, startLine, endLine } = body;

    if (!prompt || !fullCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Determine language display name
    const langName = language === 'html' ? 'HTML' : language === 'css' ? 'CSS' : 'JavaScript';
    
    // Build system message
    const systemMessage = `You are an AI code editor. The user wants to edit ${langName} code.

FULL CODE:
${fullCode}

SELECTED CODE (lines ${startLine + 1}-${endLine + 1}):
${selectedCode}

USER REQUEST: ${prompt}

IMPORTANT: You must respond ONLY in this exact format:
LINES::${startLine}-${endLine}
[the new code to replace lines ${startLine + 1} to ${endLine + 1}]

Do NOT include any explanations, comments, or text before or after the LINES marker and code.
Do NOT include code block markers like \`\`\`html or \`\`\`css.
Do NOT include the LINES marker in a code block.
Start your response immediately with "LINES::${startLine}-${endLine}" followed by a newline, then the replacement code.

For indentation: Generate code with proper relative indentation (maintain the structure). The indentation will be automatically adjusted to match the original code's position in the file.

For HTML: Always preserve <style do-not-remove>[[_CSS_]]</style> in the head and <script do-not-remove>[[_JS_]]</script> in the body if they exist.`;

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // maybe switch to gpt-5-mini when it gets reliable
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.3,
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
    console.error('Error in AI edit processing:', error);
    return NextResponse.json(
      { error: `Sorry, there was an error: ${error.message}` },
      { status: 500 }
    );
  }
}