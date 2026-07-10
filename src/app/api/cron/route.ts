import { NextResponse } from 'next/server';

export async function GET() {
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
  
  const results = [];

  try {
    const targetUrl = backendUrl.endsWith('/api') ? `${backendUrl}/health` : `${backendUrl}/api/health`;
    const backendRes = await fetch(targetUrl);
    results.push({ service: 'backend', url: targetUrl, status: backendRes.status });
  } catch (error: any) {
    results.push({ service: 'backend', error: error.message || String(error) });
  }

  try {
    const aiRes = await fetch(`${aiServiceUrl}/health`);
    results.push({ service: 'ai', status: aiRes.status });
  } catch (error: any) {
    results.push({ service: 'ai', error: error.message || String(error) });
  }

  return NextResponse.json({ success: true, results });
}
