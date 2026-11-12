using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Xml.Linq;
using TekyLearningHub.Application.Interfaces;

namespace TekyLearningHub.Application.Services;

public class AstAnalysisService : IAstAnalysisService
{
    public AstNode ParseBlocklyXmlToAst(string blocklyXml)
    {
        if (string.IsNullOrWhiteSpace(blocklyXml))
        {
            return new AstNode { Type = "Empty" };
        }

        try
        {
            var doc = XDocument.Parse(blocklyXml);
            var root = new AstNode { Type = "Program" };

            var topBlocks = doc.Root?.Elements().Where(e => e.Name.LocalName == "block");
            if (topBlocks != null)
            {
                foreach (var block in topBlocks)
                {
                    root.Children.Add(ParseBlockElement(block));
                }
            }

            return root;
        }
        catch
        {
            return new AstNode { Type = "SyntaxError" };
        }
    }

    private AstNode ParseBlockElement(XElement blockElement)
    {
        var node = new AstNode
        {
            Type = blockElement.Attribute("type")?.Value ?? "unknown_block"
        };

        if (blockElement.Attribute("id") != null)
        {
            node.Attributes["id"] = blockElement.Attribute("id")!.Value;
        }

        // Fields (e.g., number, variable name, direction)
        foreach (var field in blockElement.Elements().Where(e => e.Name.LocalName == "field"))
        {
            var fieldName = field.Attribute("name")?.Value ?? "field";
            node.Attributes[fieldName] = field.Value;
            if (node.Value == null)
            {
                node.Value = field.Value;
            }
        }

        // Values (inputs like math, condition)
        foreach (var val in blockElement.Elements().Where(e => e.Name.LocalName == "value"))
        {
            var valName = val.Attribute("name")?.Value ?? "value";
            var valNode = new AstNode { Type = $"Input:{valName}" };
            var childBlock = val.Elements().FirstOrDefault(e => e.Name.LocalName == "block" || e.Name.LocalName == "shadow");
            if (childBlock != null)
            {
                valNode.Children.Add(ParseBlockElement(childBlock));
            }
            node.Children.Add(valNode);
        }

        // Statements (blocks inside loops or if/else branches)
        foreach (var statement in blockElement.Elements().Where(e => e.Name.LocalName == "statement"))
        {
            var statementName = statement.Attribute("name")?.Value ?? "statement";
            var statementNode = new AstNode { Type = $"Statement:{statementName}" };
            var childBlock = statement.Elements().FirstOrDefault(e => e.Name.LocalName == "block");
            if (childBlock != null)
            {
                statementNode.Children.Add(ParseBlockElement(childBlock));
            }
            node.Children.Add(statementNode);
        }

        // Next chained blocks
        var nextBlock = blockElement.Elements().FirstOrDefault(e => e.Name.LocalName == "next")?
            .Elements().FirstOrDefault(e => e.Name.LocalName == "block");
        if (nextBlock != null)
        {
            node.Children.Add(ParseBlockElement(nextBlock));
        }

        return node;
    }

    public string SerializeAstToJson(AstNode rootNode)
    {
        return JsonSerializer.Serialize(rootNode, new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
    }

    public decimal CalculateTreeEditDistanceScore(string studentAstJson, string masterAstJson)
    {
        if (string.IsNullOrWhiteSpace(studentAstJson) || string.IsNullOrWhiteSpace(masterAstJson))
        {
            return 0.0m;
        }

        try
        {
            var studentAst = JsonSerializer.Deserialize<AstNode>(studentAstJson, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            var masterAst = JsonSerializer.Deserialize<AstNode>(masterAstJson, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

            if (studentAst == null || masterAst == null)
            {
                return 0.0m;
            }

            // Zhang-Shasha Algorithm
            var zss = new ZhangShashaMatcher();
            int distance = zss.ComputeDistance(studentAst, masterAst);

            int studentSize = CountNodes(studentAst);
            int masterSize = CountNodes(masterAst);
            int maxSize = Math.Max(studentSize, masterSize);

            if (maxSize == 0) return 10.0m;

            double ratio = 1.0 - (double)distance / maxSize;
            if (ratio < 0) ratio = 0;

            return Math.Round((decimal)ratio * 10.0m, 2);
        }
        catch
        {
            return 5.0m;
        }
    }

    public decimal ComputeHybridScore(decimal astAutoScore, decimal rubricScore)
    {
        // 60% AST Auto Score + 40% Qualitative Rubric
        var total = (astAutoScore * 0.6m) + (rubricScore * 0.4m);
        return Math.Round(Math.Clamp(total, 0.0m, 10.0m), 2);
    }

    private int CountNodes(AstNode node)
    {
        int count = 1;
        foreach (var child in node.Children)
        {
            count += CountNodes(child);
        }
        return count;
    }

    private class ZhangShashaMatcher
    {
        private class FlattenedNode
        {
            public int Index { get; set; }
            public string Label { get; set; } = string.Empty;
            public int LeftmostLeaf { get; set; }
        }

        public int ComputeDistance(AstNode t1, AstNode t2)
        {
            var list1 = new List<FlattenedNode>();
            var list2 = new List<FlattenedNode>();

            PostOrderFlatten(t1, list1);
            PostOrderFlatten(t2, list2);

            int n = list1.Count;
            int m = list2.Count;

            var keyRoots1 = FindKeyRoots(list1);
            var keyRoots2 = FindKeyRoots(list2);

            var td = new int[n + 1, m + 1];

            foreach (var i in keyRoots1)
            {
                foreach (var j in keyRoots2)
                {
                    ComputeTreeDistance(i, j, list1, list2, td);
                }
            }

            return td[n, m];
        }

        private void PostOrderFlatten(AstNode node, List<FlattenedNode> list)
        {
            int startLeaf = list.Count + 1;
            foreach (var child in node.Children)
            {
                PostOrderFlatten(child, list);
            }

            int currentIndex = list.Count + 1;
            int leftmostLeaf = node.Children.Count > 0 ? list[startLeaf - 1].LeftmostLeaf : currentIndex;

            list.Add(new FlattenedNode
            {
                Index = currentIndex,
                Label = $"{node.Type}:{node.Value}",
                LeftmostLeaf = leftmostLeaf
            });
        }

        private List<int> FindKeyRoots(List<FlattenedNode> list)
        {
            var keyRoots = new HashSet<int>();
            for (int i = 0; i < list.Count; i++)
            {
                keyRoots.Add(i + 1);
            }
            return keyRoots.OrderBy(x => x).ToList();
        }

        private void ComputeTreeDistance(int i, int j, List<FlattenedNode> t1, List<FlattenedNode> t2, int[,] td)
        {
            int l1 = t1[i - 1].LeftmostLeaf;
            int l2 = t2[j - 1].LeftmostLeaf;

            var fd = new int[i - l1 + 2, j - l2 + 2];

            for (int x = 1; x <= i - l1 + 1; x++)
            {
                fd[x, 0] = fd[x - 1, 0] + 1;
            }

            for (int y = 1; y <= j - l2 + 1; y++)
            {
                fd[0, y] = fd[0, y - 1] + 1;
            }

            for (int x = 1; x <= i - l1 + 1; x++)
            {
                for (int y = 1; y <= j - l2 + 1; y++)
                {
                    int nodeIdx1 = l1 + x - 1;
                    int nodeIdx2 = l2 + y - 1;

                    int cost = t1[nodeIdx1 - 1].Label == t2[nodeIdx2 - 1].Label ? 0 : 1;

                    if (t1[nodeIdx1 - 1].LeftmostLeaf == l1 && t2[nodeIdx2 - 1].LeftmostLeaf == l2)
                    {
                        fd[x, y] = Math.Min(
                            Math.Min(fd[x - 1, y] + 1, fd[x, y - 1] + 1),
                            fd[x - 1, y - 1] + cost
                        );
                        td[nodeIdx1, nodeIdx2] = fd[x, y];
                    }
                    else
                    {
                        fd[x, y] = Math.Min(
                            Math.Min(fd[x - 1, y] + 1, fd[x, y - 1] + 1),
                            fd[x - 1, y - 1] + td[nodeIdx1, nodeIdx2]
                        );
                    }
                }
            }
        }
    }
}
