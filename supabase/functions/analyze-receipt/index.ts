
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

interface ReceiptAnalysisRequest {
  image: string; // Base64 encoded image
}

interface ReceiptAnalysisResponse {
  vendor: string;
  date: string;
  total: number;
  items: Array<{
    description: string;
    amount: number;
  }>;
  category: string;
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';

serve(async (req) => {
  try {
    // Parse request body
    const { image } = await req.json() as ReceiptAnalysisRequest;

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Since we don't have actual Gemini API integration in this demo
    // We'll simulate a response with a delay for realism
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate mock receipt data
    const mockResponse: ReceiptAnalysisResponse = {
      vendor: 'Event Supplies Inc.',
      date: new Date().toISOString().split('T')[0],
      total: 156.97,
      items: [
        { description: 'Name Tags (100 pcs)', amount: 29.99 },
        { description: 'Printed Banners', amount: 79.99 },
        { description: 'Event Supplies', amount: 46.99 }
      ],
      category: 'Event Supplies'
    };

    // Return the mock data
    return new Response(
      JSON.stringify(mockResponse),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process image' }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
