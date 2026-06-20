const COLD_START_RETRIES = 2; // Render free-tier services sleep when idle and need ~30-50s to wake up
const ATTEMPT_TIMEOUT_MS = 60000;
const RETRY_DELAY_MS = 5000;

export async function callRenderBackend(body) {
  let lastError;

  for (let attempt = 0; attempt <= COLD_START_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

    try {
      const renderResponse = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/submit-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!renderResponse.ok) {
        const errText = await renderResponse.text();
        const isColdStart = errText.includes('unreachable') || errText.includes('timed out');
        if (isColdStart && attempt < COLD_START_RETRIES) {
          lastError = new Error(`Calculation service error: ${errText}`);
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        throw new Error(`Calculation service error: ${errText}`);
      }

      return await renderResponse.json();
    } catch (error) {
      clearTimeout(timeout);
      lastError = error.name === 'AbortError'
        ? new Error('Calculation service timed out')
        : error;
      if (attempt < COLD_START_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
    }
  }

  throw lastError;
}
