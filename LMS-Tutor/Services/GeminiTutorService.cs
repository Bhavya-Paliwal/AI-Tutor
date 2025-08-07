using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace LMS.Tutor.Services;

public class GeminiTutorService
{
    private readonly IConfiguration _config;

    public GeminiTutorService(IConfiguration config)
    {
        _config = config;
    }

    public async Task<string> AskAsync(string question)
    {
        using var client = new HttpClient();

        var apiKey = _config["Gemini:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
            return "❌ Gemini API key is missing. Please check configuration.";

        // Prepare request body
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[]
                    {
                        new { text = $"You are a highly skilled AI tutor built for a Learning Management System (LMS). Your job is to explain technical topics to learners in a way that is both clear and deep.For every question, follow this 3-step explanation flow: Real-world Analogy: Start with a simple real-world analogy that simplifies the core idea. Technical Explanation: Translate that analogy into correct technical terms and theory.Code/Architecture Examples: Conclude with practical examples — include code snippets, database schemas, diagrams, or API samples — depending on the topic.Tone should be friendly, patient, and educational — like a senior engineer mentoring a junior developer.\n{question}" }
                    }
                }
            }
        };

        var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={apiKey}")
        {
            Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
        };

        var response = await client.SendAsync(request);
        var responseString = await response.Content.ReadAsStringAsync();

        // Try to extract the plain text from Gemini if available, else return raw
        try
        {
            var json = JsonDocument.Parse(responseString).RootElement;

            if (json.TryGetProperty("candidates", out var candidates) &&
                candidates.GetArrayLength() > 0 &&
                candidates[0].TryGetProperty("content", out var content) &&
                content.TryGetProperty("parts", out var parts) &&
                parts.GetArrayLength() > 0 &&
                parts[0].TryGetProperty("text", out var textElement))
            {
                return textElement.GetString() ?? "⚠️ No answer text found.";
            }

            // If expected structure is not there, just return full response
            return "⚠️ Unexpected Gemini response:\n" + responseString;
        }
        catch
        {
            // If parsing fails, just return raw response (fallback)
            return "⚠️ Raw Gemini API response:\n" + responseString;
        }
    }
}
