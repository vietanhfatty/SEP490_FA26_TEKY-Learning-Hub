using TekyLearningHub.Application.Interfaces.Auth;

namespace TekyLearningHub.Infrastructure.Storage;
public sealed class AvatarStorage : IAvatarStorage
{
    private readonly string directory = Path.Combine(AppContext.BaseDirectory, "AccountAvatars");
    private string? Resolve(string? reference)
    {
        const string prefix = "/api/users/me/avatar?version=";
        if (reference is null || !reference.StartsWith(prefix, StringComparison.Ordinal)) return null;
        var name = reference[prefix.Length..];
        return name.Length > 0 && Path.GetFileName(name) == name ? Path.Combine(directory, name) : null;
    }
    public async Task<string> Save(int userId, byte[] content)
    {
        Directory.CreateDirectory(directory); var name = $"{userId}-{Guid.NewGuid():N}.png";
        var path = Path.Combine(directory, name);
        try { await File.WriteAllBytesAsync(path, content); } catch { if (File.Exists(path)) File.Delete(path); throw; }
        return "/api/users/me/avatar?version=" + name;
    }
    public void Delete(string? reference) { var path = Resolve(reference); if (path != null) File.Delete(path); }
    public async Task<byte[]?> Read(string reference) { var path = Resolve(reference); return path != null && File.Exists(path) ? await File.ReadAllBytesAsync(path) : null; }
}
