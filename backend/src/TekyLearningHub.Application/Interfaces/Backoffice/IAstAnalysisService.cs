using System.Collections.Generic;

namespace TekyLearningHub.Application.Interfaces.Backoffice;

/// <summary>Cây AST rút gọn từ Blockly XML, dùng để so khớp bài làm học sinh.</summary>
public class AstNode
{
    public string Type { get; set; } = string.Empty;
    public string? Value { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = new();
    public List<AstNode> Children { get; set; } = new();
}

/// <summary>Phân tích và chấm điểm AST. Thuần khiết, không phụ thuộc hạ tầng.</summary>
public interface IAstAnalysisService
{
    AstNode ParseBlocklyXmlToAst(string blocklyXml);
    string SerializeAstToJson(AstNode rootNode);
    decimal CalculateTreeEditDistanceScore(string studentAstJson, string masterAstJson);
    decimal ComputeHybridScore(decimal astAutoScore, decimal rubricScore);
}
