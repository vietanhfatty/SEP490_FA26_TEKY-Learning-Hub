using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace TekyLearningHub.Application.Interfaces.Backoffice;

/// <summary>Cổng xuất báo cáo. Adapter đọc dữ liệu qua repository rồi dựng file.</summary>
public interface IExcelExportService
{
    Task<byte[]> ExportClassGradebookAsync(int classId, CancellationToken cancellationToken = default);
}

/// <summary>Kết quả sinh sa bàn và nhiệm vụ học thuật.</summary>
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

/// <summary>Trợ lý AI: sinh sa bàn và bản tin âm thanh cho phụ huynh.</summary>
public interface IAiAssistantService
{
    Task<GeneratedMapResultDto> GenerateStemMapAndQuestAsync(string teacherPrompt, CancellationToken cancellationToken = default);
    Task<string> GenerateParentAudioDigestTextAsync(int sessionId, int studentId, CancellationToken cancellationToken = default);
}
