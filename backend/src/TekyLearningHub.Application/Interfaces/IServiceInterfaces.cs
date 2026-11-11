using TekyLearningHub.Domain.Enums;

namespace TekyLearningHub.Application.Interfaces;

public class AstNode
{
    public string Type { get; set; } = string.Empty;
    public string? Value { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = new();
    public List<AstNode> Children { get; set; } = new();
}

public interface IAstAnalysisService
{
    AstNode ParseBlocklyXmlToAst(string blocklyXml);
    string SerializeAstToJson(AstNode rootNode);
    double CalculateTreeEditDistanceScore(string studentAstJson, string masterAstJson);
    double ComputeHybridScore(double astAutoScore, double rubricScore);
}

public interface IClassroomRealtimeService
{
    Task BroadcastFocusModeLockAsync(Guid classId, bool isLocked, string? message, CancellationToken cancellationToken = default);
    Task BroadcastSpotlightAsync(Guid classId, Guid studentId, string studentName, string screenPayload, CancellationToken cancellationToken = default);
    Task NotifyWorkstationCheckInAsync(Guid classId, Guid studentId, string studentName, string workstationIp, CancellationToken cancellationToken = default);
    Task SendCheerConfettiAsync(Guid classId, Guid studentId, CheerStickerType stickerType, string message, CancellationToken cancellationToken = default);
}

public interface IExcelExportService
{
    Task<byte[]> ExportClassGradebookAsync(Guid classId, CancellationToken cancellationToken = default);
}

public interface IAiAssistantService
{
    Task<GeneratedMapResultDto> GenerateStemMapAndQuestAsync(string teacherPrompt, CancellationToken cancellationToken = default);
    Task<string> GenerateParentAudioDigestTextAsync(Guid classSessionId, Guid studentId, CancellationToken cancellationToken = default);
}

public class GeneratedMapResultDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int GridWidth { get; set; } = 10;
    public int GridHeight { get; set; } = 10;
    public int ParTimeSeconds { get; set; } = 60;
    public List<GeneratedCheckpointDto> Checkpoints { get; set; } = new();
    public string MasterBlocklyXml { get; set; } = string.Empty;
}

public class GeneratedCheckpointDto
{
    public int OrderIndex { get; set; }
    public double X { get; set; }
    public double Y { get; set; }
    public string Name { get; set; } = string.Empty;
    public string QuestionPrompt { get; set; } = string.Empty;
}

public interface INotificationService
{
    Task SendMultiChannelNotificationAsync(string recipientUserId, NotificationType type, string title, string body, string? payloadJson = null, CancellationToken cancellationToken = default);
}
