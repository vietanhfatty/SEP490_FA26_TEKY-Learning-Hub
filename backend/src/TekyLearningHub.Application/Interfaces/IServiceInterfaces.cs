using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

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
    decimal CalculateTreeEditDistanceScore(string studentAstJson, string masterAstJson);
    decimal ComputeHybridScore(decimal astAutoScore, decimal rubricScore);
}

public interface IClassroomRealtimeService
{
    Task BroadcastFocusModeLockAsync(int classId, bool isLocked, string? message, CancellationToken cancellationToken = default);
    Task BroadcastSpotlightAsync(int classId, int studentId, string studentName, string screenPayload, CancellationToken cancellationToken = default);
    Task NotifyWorkstationCheckInAsync(int classId, int studentId, string studentName, string workstationIp, CancellationToken cancellationToken = default);
    Task SendCheerConfettiAsync(int classId, int studentId, string stickerCode, string message, CancellationToken cancellationToken = default);
}

public interface IExcelExportService
{
    Task<byte[]> ExportClassGradebookAsync(int classId, CancellationToken cancellationToken = default);
}

public interface IAiAssistantService
{
    Task<GeneratedMapResultDto> GenerateStemMapAndQuestAsync(string teacherPrompt, CancellationToken cancellationToken = default);
    Task<string> GenerateParentAudioDigestTextAsync(int sessionId, int studentId, CancellationToken cancellationToken = default);
}

public class GeneratedMapResultDto
{
    public string Name { get; set; } = string.Empty;
    public string Theme { get; set; } = string.Empty;
    public string LayoutJson { get; set; } = "{}";
    public int StartX { get; set; } = 0;
    public int StartY { get; set; } = 0;
    public List<GeneratedCheckpointDto> Checkpoints { get; set; } = new();
    public string MasterBlocklyXml { get; set; } = string.Empty;
}

public class GeneratedCheckpointDto
{
    public int SeqNo { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public string UnlockMessage { get; set; } = string.Empty;
    public bool IsFinish { get; set; } = false;
}

public interface INotificationService
{
    Task SendNotificationAsync(int recipientUserId, string type, string title, string body, string? refType = null, long? refId = null, CancellationToken cancellationToken = default);
}
