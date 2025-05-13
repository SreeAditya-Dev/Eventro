
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

interface FinancialData {
  totalExpenses: number;
  numberOfBills: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
  }>;
  eventTitle: string;
  monthlySummary?: Array<{
    month: string;
    total: number;
  }>;
}

interface InsightsResponse {
  insights: string; // HTML formatted insights
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';

serve(async (req) => {
  try {
    // Parse request body
    const financialData = await req.json() as FinancialData;

    if (!financialData) {
      return new Response(
        JSON.stringify({ error: 'Financial data is required' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate insights based on the data
    let insights = `
      <h3>Financial Insights for ${financialData.eventTitle}</h3>
      <p class="mb-4">Based on the financial data, here are some insights and recommendations:</p>
      
      <h4 class="mb-2 font-bold">Overview</h4>
      <p class="mb-4">Total spending: $${financialData.totalExpenses.toFixed(2)} across ${financialData.numberOfBills} bills.</p>
    `;

    // Add category breakdown insights
    if (financialData.categoryBreakdown && financialData.categoryBreakdown.length > 0) {
      const sortedCategories = [...financialData.categoryBreakdown].sort((a, b) => b.amount - a.amount);
      const topCategory = sortedCategories[0];
      const bottomCategory = sortedCategories[sortedCategories.length - 1];
      
      insights += `
        <h4 class="mb-2 font-bold">Spending Patterns</h4>
        <p class="mb-2">Your highest expense category is <strong>${topCategory.category}</strong> at $${topCategory.amount.toFixed(2)}.</p>
        <p class="mb-4">Your lowest expense category is <strong>${bottomCategory.category}</strong> at $${bottomCategory.amount.toFixed(2)}.</p>
      `;
      
      // Add recommendations
      insights += `
        <h4 class="mb-2 font-bold">Recommendations</h4>
        <ul class="list-disc pl-5 mb-4">
          <li>Consider exploring alternatives for ${topCategory.category} to potentially reduce costs.</li>
          <li>Compare prices with other vendors for future events.</li>
          <li>Look for early booking discounts to save on venue and equipment.</li>
        </ul>
      `;
    }

    // Add monthly trends if available
    if (financialData.monthlySummary && financialData.monthlySummary.length > 0) {
      const trend = financialData.monthlySummary.length > 1 && 
        financialData.monthlySummary[financialData.monthlySummary.length - 1].total > 
        financialData.monthlySummary[financialData.monthlySummary.length - 2].total
          ? 'increasing' : 'decreasing';
      
      insights += `
        <h4 class="mb-2 font-bold">Monthly Trends</h4>
        <p>Your expenses are ${trend} compared to previous months. ${
          trend === 'increasing' 
            ? 'You may want to review recent expenses for potential cost-saving opportunities.' 
            : 'Good job on managing expenses!'
        }</p>
      `;
    }

    const response: InsightsResponse = {
      insights
    };

    return new Response(
      JSON.stringify(response),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate insights' }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
