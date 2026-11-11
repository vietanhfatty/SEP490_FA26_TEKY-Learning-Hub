using TekyLearningHub.Application.Services;
using Xunit;

namespace TekyLearningHub.Application.Tests;

public class AstAnalysisServiceTests
{
    private readonly AstAnalysisService _service = new();

    [Fact]
    public void ParseBlocklyXml_ValidXml_ReturnsRootProgramWithChildren()
    {
        // Arrange
        var xml = @"<xml xmlns=""https://developers.google.com/blockly/xml"">
                      <block type=""robot_move"" id=""b1"">
                        <field name=""DIRECTION"">FORWARD</field>
                        <next>
                          <block type=""robot_turn"" id=""b2"">
                            <field name=""ANGLE"">90</field>
                          </block>
                        </next>
                      </block>
                    </xml>";

        // Act
        var ast = _service.ParseBlocklyXmlToAst(xml);

        // Assert
        Assert.NotNull(ast);
        Assert.Equal("Program", ast.Type);
        Assert.Single(ast.Children);
        Assert.Equal("robot_move", ast.Children[0].Type);
        Assert.Equal("FORWARD", ast.Children[0].Attributes["DIRECTION"]);
        Assert.Single(ast.Children[0].Children);
        Assert.Equal("robot_turn", ast.Children[0].Children[0].Type);
    }

    [Fact]
    public void TreeEditDistance_IdenticalAstTrees_ReturnsTenScore()
    {
        // Arrange
        var xml = @"<xml><block type=""robot_move""><field name=""STEPS"">5</field></block></xml>";
        var ast = _service.ParseBlocklyXmlToAst(xml);
        var json = _service.SerializeAstToJson(ast);

        // Act
        var score = _service.CalculateTreeEditDistanceScore(json, json);

        // Assert
        Assert.Equal(10.0, score);
    }

    [Fact]
    public void TreeEditDistance_DifferentTrees_ReturnsProportionalScore()
    {
        // Arrange
        var xmlStudent = @"<xml><block type=""robot_move""><field name=""STEPS"">3</field></block></xml>";
        var xmlMaster = @"<xml><block type=""robot_turn""><field name=""ANGLE"">90</field></block></xml>";

        var astStudent = _service.ParseBlocklyXmlToAst(xmlStudent);
        var astMaster = _service.ParseBlocklyXmlToAst(xmlMaster);

        var jsonStudent = _service.SerializeAstToJson(astStudent);
        var jsonMaster = _service.SerializeAstToJson(astMaster);

        // Act
        var score = _service.CalculateTreeEditDistanceScore(jsonStudent, jsonMaster);

        // Assert
        Assert.True(score >= 0.0 && score <= 10.0);
    }

    [Theory]
    [InlineData(10.0, 10.0, 10.0)]     // 10 * 0.6 + 10 * 0.4 = 10.0
    [InlineData(5.0, 10.0, 7.0)]       // 5 * 0.6 + 10 * 0.4 = 3.0 + 4.0 = 7.0
    [InlineData(8.0, 6.0, 7.2)]        // 8 * 0.6 + 6 * 0.4 = 4.8 + 2.4 = 7.2
    [InlineData(0.0, 0.0, 0.0)]        // 0.0
    public void HybridScore_Calculates60AstAnd40Rubric_Accurately(double astScore, double rubricScore, double expected)
    {
        // Act
        var result = _service.ComputeHybridScore(astScore, rubricScore);

        // Assert
        Assert.Equal(expected, result);
    }
}
