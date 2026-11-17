using TekyLearningHub.Application.Interfaces.Auth;

namespace TekyLearningHub.Infrastructure.Security;
public sealed class TransferTicketStore : ITransferTicketStore
{
    private readonly Dictionary<string, TransferTicket> tickets = new(); private readonly object gate = new();
    public bool TryAdd(string code, TransferTicket ticket, DateTime now, int limit)
    {
        lock (gate)
        {
            foreach (var key in tickets.Where(x => x.Value.Expires < now).Select(x => x.Key).ToArray()) tickets.Remove(key);
            if (tickets.Count >= limit) return false; return tickets.TryAdd(code, ticket);
        }
    }
    public bool TryTake(string code, out TransferTicket? ticket) { lock (gate) { return tickets.Remove(code, out ticket); } }
}
