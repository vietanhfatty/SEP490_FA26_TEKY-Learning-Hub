using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace TekyLearningHub.Infrastructure.Data.Migrations;

internal sealed record SqlMigration(string Name, string Script)
{
    // Git may check SQL out with CRLF. The same script must have the same checksum on every OS.
    public string Checksum => Convert.ToHexString(SHA256.HashData(
        Encoding.UTF8.GetBytes(Script.TrimStart('\uFEFF').Replace("\r\n", "\n"))));
}

internal static class SqlMigrationCatalog
{
    public const string BaselineName = "00000000_baseline.sql";
    private const string Prefix = "Teky.Database.Migrations.";

    public static IReadOnlyList<SqlMigration> Load()
    {
        var assembly = typeof(SqlMigrationCatalog).Assembly;
        return assembly.GetManifestResourceNames()
            .Where(name => name.StartsWith(Prefix, StringComparison.Ordinal) && name.EndsWith(".sql", StringComparison.Ordinal))
            .OrderBy(name => name, StringComparer.Ordinal)
            .Select(name => {
                using var reader = new StreamReader(assembly.GetManifestResourceStream(name)
                    ?? throw new InvalidOperationException($"Missing migration resource: {name}"));
                return new SqlMigration(name[Prefix.Length..], reader.ReadToEnd());
            }).ToList();
    }

    // These versioned scripts use SQLCMD-style GO only on a line of its own, never inside literals.
    public static IEnumerable<string> Batches(string script) =>
        Regex.Split(script, @"^\s*GO\s*(?:--[^\r\n]*)?\r?$", RegexOptions.Multiline | RegexOptions.IgnoreCase)
            .Where(batch => !string.IsNullOrWhiteSpace(batch));

    public static IReadOnlyList<string> BaselineTables(string script) =>
        Regex.Matches(script, @"\bCREATE\s+TABLE\s+(?:dbo\.)?(\w+)", RegexOptions.IgnoreCase)
            .Select(match => match.Groups[1].Value).ToList();
}
