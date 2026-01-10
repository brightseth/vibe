/**
 * Gmail OAuth Callback
 *
 * Handles OAuth redirect after user authorizes Gmail access
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // User handle
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json(
      { error: 'Authorization failed', details: error },
      { status: 400 }
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing code or state parameter' },
      { status: 400 }
    );
  }

  try {
    // Dynamically import router to avoid build issues
    const router = require('../../../lib/messaging/router');

    const result = await router.handleOAuthCallback(state, 'gmail', code);

    if (result.success) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Gmail Connected</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #0A0A0A;
              color: #fff;
              padding: 20px;
            }
            .container {
              text-align: center;
              max-width: 500px;
            }
            h1 {
              font-size: 48px;
              margin-bottom: 20px;
              font-weight: 600;
            }
            p {
              font-size: 18px;
              color: #999;
              line-height: 1.6;
              margin-bottom: 15px;
            }
            code {
              background: #1a1a1a;
              padding: 20px;
              border-radius: 8px;
              display: block;
              margin: 30px 0;
              font-size: 14px;
              font-family: 'SF Mono', Monaco, 'Courier New', monospace;
              color: #6B8FFF;
            }
            .footer {
              margin-top: 40px;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Gmail Connected</h1>
            <p>You can now send emails from /vibe.</p>
            <code>vibe dm user@example.com "your message"</code>
            <p class="footer">
              You can close this window and return to Claude Code.
            </p>
          </div>
          <script>
            // Auto-close after 3 seconds
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
        </html>
        `,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
      );
    } else {
      throw new Error(result.error || 'Unknown error during OAuth');
    }
  } catch (error: any) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Failed</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #0A0A0A;
            color: #fff;
            padding: 20px;
          }
          .container {
            text-align: center;
            max-width: 500px;
          }
          h1 {
            font-size: 48px;
            margin-bottom: 20px;
            color: #ff4444;
          }
          p {
            font-size: 18px;
            color: #999;
            line-height: 1.6;
            margin-bottom: 15px;
          }
          .error {
            background: #1a1a1a;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
            font-size: 14px;
            color: #ff4444;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✗ Connection Failed</h1>
          <p>Could not complete Gmail authorization.</p>
          <div class="error">${error.message}</div>
          <p>Try again: <code>vibe connect gmail</code></p>
        </div>
      </body>
      </html>
      `,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }
}

// Export for both App Router and Pages Router compatibility
export const config = {
  runtime: 'nodejs',
};
