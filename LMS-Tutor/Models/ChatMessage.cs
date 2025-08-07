namespace LMS_Tutor.Models;

public class ChatMessage
{
    public string role { get; set; } = "user";
    public string content { get; set; } = string.Empty;
}