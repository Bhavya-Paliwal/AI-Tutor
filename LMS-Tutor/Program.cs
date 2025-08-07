using LMS.Tutor.Services;

var builder = WebApplication.CreateBuilder(args);

// Register controller services
builder.Services.AddControllers();

// Register Gemini AI Tutor service
builder.Services.AddSingleton<GeminiTutorService>();

// Swagger for API testing
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:3000", "http://localhost:3001")
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
});


var app = builder.Build();

// Enable Swagger UI
app.UseSwagger();
app.UseSwaggerUI();
// In the app configuration:
app.UseCors("AllowReactApp");

app.MapControllers();

app.Run();